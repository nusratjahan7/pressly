"use client";

import { useEffect, useState } from "react";
import type { Page, PageSize } from "@/types";
import { useEditorStore } from "@/store";
import { getCacheKey } from "@/lib/thumbnailCache";

const SNAPSHOT_WIDTH = 132;
const MAX_CACHE = 240;

interface CacheEntry {
  url: string;
  key: string;
}

/**
 * Thumbnail snapshots are expensive (they rasterise a page), so results are
 * memoised by a content key and rendered only once the page settles. The store
 * of URLs lives at module scope so switching spreads or reopening the strip
 * never re-renders unchanged pages.
 */
const urlCache = new Map<string, string>();

function storeUrl(pageId: string, entry: CacheEntry) {
  if (urlCache.size >= MAX_CACHE) {
    const oldest = urlCache.keys().next().value;
    if (oldest !== undefined) urlCache.delete(oldest);
  }
  urlCache.set(pageId, entry.url);
}

/**
 * Renders a page to a data URL offscreen.
 *
 * Konva is imported lazily so the strip never pulls the renderer into the
 * initial bundle, and so this module stays safe to import on the server.
 */
async function renderPageSnapshot(
  page: Page,
  pageSize: PageSize,
  width: number,
): Promise<string | null> {
  const Konva = (await import("konva")).default;
  const { getBackground } = await import("@/lib/backgrounds");

  const scale = width / pageSize.w;
  const height = Math.round(pageSize.h * scale);
  if (height <= 0) return null;

  const container = document.createElement("div");
  const stage = new Konva.Stage({
    container,
    width,
    height,
  });
  const layer = new Konva.Layer({ listening: false });
  stage.add(layer);

  try {
    if (page.isEndPaper) {
      layer.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width,
          height,
          fill: "#262A3C",
          listening: false,
        }),
      );
      layer.add(
        new Konva.Text({
          x: width * 0.08,
          y: height / 2 - Math.max(4, width * 0.045),
          width: width * 0.84,
          text: "This page can not be edited",
          fontSize: Math.max(5, Math.round(width * 0.055)),
          fontFamily: "Inter, sans-serif",
          fill: "rgba(238, 240, 254, 0.62)",
          align: "center",
          wrap: "word",
          listening: false,
        }),
      );
      layer.draw();
      return stage.toDataURL({ pixelRatio: 2 });
    }

    const background = getBackground(page.backgroundId);
    layer.add(
      new Konva.Rect({
        x: 0,
        y: 0,
        width,
        height,
        fill: background.baseColor,
        listening: false,
      }),
    );

    if (background.pdfPattern) {
      const { getPatternTile, getPatternTileScale } = await import(
        "@/lib/konva/patternTiles"
      );
      const tile = getPatternTile(background.pdfPattern, scale, 1);
      if (tile) {
        layer.add(
          new Konva.Rect({
            x: 0,
            y: 0,
            width,
            height,
            fillPatternImage: tile as unknown as HTMLImageElement,
            fillPatternRepeat: "repeat",
            fillPatternScaleX: getPatternTileScale(background.pdfPattern, tile),
            fillPatternScaleY: getPatternTileScale(background.pdfPattern, tile),
            listening: false,
          }),
        );
      }
    }

    const ordered = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
    for (const element of ordered) {
      if (element.opacity <= 0) continue;
      const px = element.x * scale;
      const py = element.y * scale;
      const pw = Math.max(0.5, element.width * scale);
      const ph = Math.max(0.5, element.height * scale);

      if (element.type === "text") {
        const { ptToMm } = await import("@/lib/units");
        layer.add(
          new Konva.Text({
            x: px,
            y: py,
            width: pw,
            height: ph,
            text: element.text,
            fontFamily: element.fontFamily,
            fontSize: Math.max(1, ptToMm(element.fontSize) * scale),
            fontStyle: element.fontWeight >= 600 ? "bold" : "normal",
            lineHeight: Math.max(0.8, element.lineHeight),
            letterSpacing: ptToMm(element.letterSpacing) * scale,
            fill: element.color,
            align: element.align,
            wrap: "word",
            opacity: element.opacity,
            listening: false,
            perfectDrawEnabled: false,
          }),
        );
        continue;
      }

      if (element.type === "shape") {
        const common = {
          x: px,
          y: py,
          opacity: element.opacity,
          listening: false,
          perfectDrawEnabled: false,
        };
        if (element.shape === "ellipse") {
          layer.add(
            new Konva.Ellipse({
              ...common,
              x: px + pw / 2,
              y: py + ph / 2,
              radiusX: pw / 2,
              radiusY: ph / 2,
              fill: element.fill === "transparent" ? undefined : element.fill,
              stroke:
                element.stroke === "transparent" ? undefined : element.stroke,
              strokeWidth: element.strokeWidth * scale,
            }),
          );
        } else if (element.shape === "line") {
          const color =
            element.stroke !== "transparent" ? element.stroke : element.fill;
          layer.add(
            new Konva.Line({
              ...common,
              points: [px, py + ph / 2, px + pw, py + ph / 2],
              stroke: color === "transparent" ? "#122056" : color,
              strokeWidth: Math.max(0.5, element.strokeWidth * scale),
            }),
          );
        } else {
          layer.add(
            new Konva.Rect({
              ...common,
              width: pw,
              height: ph,
              fill: element.fill === "transparent" ? undefined : element.fill,
              stroke:
                element.stroke === "transparent" ? undefined : element.stroke,
              strokeWidth: element.strokeWidth * scale,
              cornerRadius: element.radius * scale,
            }),
          );
        }
        continue;
      }

      if (element.type === "image" && element.src) {
        const image = await loadImage(element.src).catch(() => null);
        if (image) {
          // Approximation of object-fit for the miniature: fill the frame.
          layer.add(
            new Konva.Image({
              image,
              x: px,
              y: py,
              width: pw,
              height: ph,
              opacity: element.opacity,
              listening: false,
              perfectDrawEnabled: false,
            }),
          );
        }
        continue;
      }

      if (element.type === "sticker") {
        const { getSticker } = await import("@/lib/stickers");
        const sticker = getSticker(element.stickerId);
        const s = Math.min(pw, ph) / 24;
        const group = new Konva.Group({
          x: px,
          y: py,
          scaleX: s,
          scaleY: s,
          opacity: element.opacity,
          listening: false,
        });
        for (const path of sticker.paths) {
          group.add(
            new Konva.Path({
              data: path.d,
              fill: path.fill === "currentColor" ? element.color : undefined,
              stroke:
                path.stroke === "currentColor" ? element.color : undefined,
              strokeWidth: path.strokeWidth ?? 0,
              listening: false,
            }),
          );
        }
        layer.add(group);
        continue;
      }

      if (element.type === "qr") {
        layer.add(
          new Konva.Rect({
            x: px,
            y: py,
            width: pw,
            height: ph,
            fill: element.background,
            listening: false,
          }),
        );
        layer.add(
          new Konva.Rect({
            x: px + pw * 0.18,
            y: py + ph * 0.18,
            width: pw * 0.64,
            height: ph * 0.64,
            fill: element.foreground,
            opacity: 0.75,
            listening: false,
          }),
        );
      }
    }

    if (page.locked) {
      layer.add(
        new Konva.Rect({
          x: 0,
          y: 0,
          width,
          height,
          fill: "rgba(18,32,86,0.08)",
          listening: false,
        }),
      );
    }

    layer.draw();
    const url = stage.toDataURL({ pixelRatio: 2 });
    return url;
  } finally {
    stage.destroy();
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

/**
 * Returns a cached snapshot URL for a page, regenerating it on a debounce when
 * the page content changes.
 */
export function usePageSnapshot(
  page: Page,
  pageSize: PageSize,
  width = SNAPSHOT_WIDTH,
): string | null {
  const key = getCacheKey(page, pageSize, width);
  const existing = urlCache.get(page.id);
  const [url, setUrl] = useState<string | null>(
    existing && existing === key ? existing : null,
  );

  useEffect(() => {
    const cached = urlCache.get(page.id);
    if (cached === key) {
      setUrl(cached);
      return;
    }

    // Debounce so dragging an element does not rasterise on every frame.
    const timer = setTimeout(() => {
      void renderPageSnapshot(page, pageSize, width)
        .then((next) => {
          if (!next) return;
          storeUrl(page.id, { url: next, key });
          setUrl(next);
        })
        .catch(() => {
          /* a failed thumbnail is not worth interrupting the editor */
        });
    }, 220);

    return () => clearTimeout(timer);
    // The key already encodes every input that affects the raster.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, page.id]);

  // Invalidate eagerly when content changes so stale pixels never linger.
  useEffect(() => {
    const cached = urlCache.get(page.id);
    if (cached && cached !== key) setUrl(null);
  }, [key, page.id]);

  return url;
}

export function clearSnapshotCache() {
  urlCache.clear();
}

export { SNAPSHOT_WIDTH };
