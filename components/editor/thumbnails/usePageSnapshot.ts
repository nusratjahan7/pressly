"use client";

import { useEffect, useState } from "react";
import type { Page, PageSize } from "@/types";
import { getCacheKey } from "@/lib/thumbnailCache";
import { resolveMediaUrl } from "@/lib/mediaStorage";

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
          fontFamily: "Montserrat, sans-serif",
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
            text:
              element.textTransform === "uppercase"
                ? element.text.toUpperCase()
                : element.text,
            fontFamily: `"${element.fontFamily}", "Montserrat", sans-serif`,
            fontSize: Math.max(1, ptToMm(element.fontSize) * scale),
            fontStyle: `${element.fontStyle === "italic" ? "italic " : ""}${element.fontWeight}`,
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
        const { getGradientPoints, getPolygonPoints, getStarPoints } = await import(
          "@/lib/shapes"
        );
        const hasGradient = Boolean(element.fillGradient?.enabled);
        const hasSolid = element.fill !== "transparent";
        const common = {
          x: px,
          y: py,
          opacity: element.opacity,
          listening: false,
          perfectDrawEnabled: false,
        };
        const gradientProps = (centered = false) => {
          if (!hasGradient || !element.fillGradient) return {};
          const { start, end } = getGradientPoints(
            pw,
            ph,
            element.fillGradient.angle,
            centered,
          );
          return {
            fillPriority: "linear-gradient" as const,
            fillLinearGradientStartPoint: start,
            fillLinearGradientEndPoint: end,
            fillLinearGradientColorStops: [
              0,
              element.fillGradient.from,
              1,
              element.fillGradient.to,
            ],
          };
        };

        if (element.shape === "ellipse") {
          layer.add(
            new Konva.Ellipse({
              ...common,
              x: px + pw / 2,
              y: py + ph / 2,
              radiusX: pw / 2,
              radiusY: ph / 2,
              fill: !hasGradient && hasSolid ? element.fill : undefined,
              ...gradientProps(true),
              stroke:
                element.stroke === "transparent" ? undefined : element.stroke,
              strokeWidth: element.strokeWidth * scale,
            }),
          );
        } else if (element.shape === "line" || element.shape === "arrow") {
          const color =
            element.stroke !== "transparent" ? element.stroke : element.fill;
          const resolved = color === "transparent" ? "#122056" : color;
          if (element.shape === "arrow") {
            const sw = Math.max(0.5, element.strokeWidth * scale);
            const ptr = Math.max(3, Math.min(pw * 0.35, sw * 3.5 + 2));
            layer.add(
              new Konva.Arrow({
                ...common,
                points: [0, ph / 2, Math.max(2, pw - sw * 0.5), ph / 2],
                pointerLength: ptr,
                pointerWidth: ptr * 0.85,
                fill: resolved,
                stroke: resolved,
                strokeWidth: sw,
              }),
            );
          } else {
            layer.add(
              new Konva.Line({
                ...common,
                points: [0, ph / 2, pw, ph / 2],
                stroke: resolved,
                strokeWidth: Math.max(0.5, element.strokeWidth * scale),
              }),
            );
          }
        } else if (element.shape === "polygon" || element.shape === "star") {
          const pts =
            element.shape === "polygon"
              ? getPolygonPoints(pw, ph, element.sides ?? 6)
              : getStarPoints(
                  pw,
                  ph,
                  element.sides ?? 5,
                  element.innerRadiusRatio ?? 0.45,
                );
          layer.add(
            new Konva.Line({
              ...common,
              points: pts,
              closed: true,
              fill: !hasGradient && hasSolid ? element.fill : undefined,
              ...gradientProps(false),
              stroke:
                element.stroke === "transparent" ? undefined : element.stroke,
              strokeWidth: element.strokeWidth * scale,
            }),
          );
        } else {
          layer.add(
            new Konva.Rect({
              ...common,
              width: pw,
              height: ph,
              fill: !hasGradient && hasSolid ? element.fill : undefined,
              ...gradientProps(false),
              stroke:
                element.stroke === "transparent" ? undefined : element.stroke,
              strokeWidth: element.strokeWidth * scale,
              cornerRadius: element.radius * scale,
            }),
          );
        }
        continue;
      }

      if (element.type === "image") {
        if (!element.src) {
          layer.add(
            new Konva.Rect({
              x: px,
              y: py,
              width: pw,
              height: ph,
              fill: "#B5B7BF",
              cornerRadius: element.radius * scale,
              listening: false,
              perfectDrawEnabled: false,
            }),
          );
          continue;
        }
        const image = await loadImage(element.src).catch(() => null);
        if (image) {
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
        const imageSrc =
          element.src ?? (sticker.format === "png" ? sticker.src : undefined);
        if (imageSrc) {
          const img = await loadImage(imageSrc).catch(() => null);
          if (img) {
            layer.add(
              new Konva.Image({
                image: img,
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
        const parts = sticker.viewBox.trim().split(/\s+/).map(Number);
        const vbW = Math.max(1, parts[2] || 24);
        const vbH = Math.max(1, parts[3] || 24);
        const s = Math.min(pw / vbW, ph / vbH);
        const group = new Konva.Group({
          x: px + (pw - vbW * s) / 2,
          y: py + (ph - vbH * s) / 2,
          scaleX: s,
          scaleY: s,
          opacity: element.opacity,
          listening: false,
        });
        for (const path of sticker.paths) {
          group.add(
            new Konva.Path({
              data: path.d,
              fill:
                path.fill === "currentColor"
                  ? element.color
                  : path.fill && path.fill !== "none"
                    ? path.fill
                    : undefined,
              stroke:
                path.stroke === "currentColor"
                  ? element.color
                  : path.stroke && path.stroke !== "none"
                    ? path.stroke
                    : undefined,
              strokeWidth: path.strokeWidth ?? 0,
              opacity: path.opacity ?? 1,
              listening: false,
            }),
          );
        }
        layer.add(group);
        continue;
      }

      if (element.type === "qr") {
        const { getQrMatrix } = await import("@/lib/qr");
        const matrix = getQrMatrix(element.value, element.errorCorrection);
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
        if (matrix) {
          const count = matrix.length;
          const qz = 4;
          const total = count + qz * 2;
          const mod = Math.min(pw, ph) / total;
          const ox = px + (pw - mod * total) / 2;
          const oy = py + (ph - mod * total) / 2;
          for (let r = 0; r < count; r += 1) {
            for (let c = 0; c < count; c += 1) {
              if (matrix[r]![c]) {
                layer.add(
                  new Konva.Rect({
                    x: ox + (c + qz) * mod,
                    y: oy + (r + qz) * mod,
                    width: Math.max(0.3, mod),
                    height: Math.max(0.3, mod),
                    fill: element.foreground,
                    listening: false,
                  }),
                );
              }
            }
          }
        }
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

async function loadImage(src: string): Promise<HTMLImageElement> {
  const resolved = await resolveMediaUrl(src);
  if (!resolved) throw new Error("Empty image source");
  return new Promise((resolve, reject) => {
    const image = new window.Image();
    if (/^https?:\/\//i.test(resolved)) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = resolved;
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
