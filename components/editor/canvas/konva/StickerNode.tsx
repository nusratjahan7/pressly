"use client";

import { useMemo } from "react";
import { Group, Image as KonvaImage, Path } from "react-konva";
import type { StickerElement } from "@/types";
import { getSticker, loadCustomStickers } from "@/lib/stickers";
import { useHtmlImage } from "@/components/editor/canvas/useHtmlImage";

interface StickerNodeProps {
  element: StickerElement;
  width: number;
  height: number;
  listening?: boolean;
}

function parseViewBox(viewBox: string): { w: number; h: number } {
  const parts = viewBox.trim().split(/\s+/).map(Number);
  if (parts.length === 4 && Number.isFinite(parts[2]) && Number.isFinite(parts[3])) {
    return { w: Math.max(1, parts[2]!), h: Math.max(1, parts[3]!) };
  }
  return { w: 24, h: 24 };
}

/**
 * Sticker body drawn at the local origin. Supports built-in SVG motifs,
 * PNG assets from `/stickers/`, and custom uploaded SVG/PNG stickers.
 */
export function StickerNode({
  element,
  width,
  height,
  listening = false,
}: StickerNodeProps) {
  const customAsset = useMemo(() => {
    if (element.src) return null;
    return loadCustomStickers().find((item) => item.id === element.stickerId) ?? null;
  }, [element.stickerId, element.src]);

  const definition = getSticker(element.stickerId);
  const imageSrc =
    element.src ??
    customAsset?.src ??
    (definition.format === "png" ? definition.src : undefined);

  const { image } = useHtmlImage(imageSrc ?? "");

  const shadowProps = element.shadow
    ? {
        shadowColor: "rgba(18,32,86,0.34)",
        shadowBlur: Math.max(1.6, Math.min(width, height) * 0.08),
        shadowOffsetX: 0.9,
        shadowOffsetY: 1.4,
        shadowEnabled: true,
      }
    : { shadowEnabled: false };

  const vb = useMemo(() => parseViewBox(definition.viewBox), [definition.viewBox]);
  const scale = useMemo(
    () => Math.min(width / vb.w, height / vb.h),
    [width, height, vb.w, vb.h],
  );

  if (imageSrc) {
    if (!image) return null;
    const natW = Math.max(1, image.naturalWidth || 1);
    const natH = Math.max(1, image.naturalHeight || 1);
    const imgScale = Math.min(width / natW, height / natH);
    const drawW = natW * imgScale;
    const drawH = natH * imgScale;
    return (
      <KonvaImage
        image={image}
        x={(width - drawW) / 2}
        y={(height - drawH) / 2}
        width={drawW}
        height={drawH}
        listening={listening}
        perfectDrawEnabled={false}
        {...shadowProps}
      />
    );
  }

  return (
    <Group
      x={(width - vb.w * scale) / 2}
      y={(height - vb.h * scale) / 2}
      scaleX={scale}
      scaleY={scale}
      listening={listening}
    >
      {definition.paths.map((path, index) => (
        <Path
          key={index}
          data={path.d}
          fill={
            path.fill === "currentColor"
              ? element.color
              : path.fill && path.fill !== "none"
                ? path.fill
                : undefined
          }
          stroke={
            path.stroke === "currentColor"
              ? element.color
              : path.stroke && path.stroke !== "none"
                ? path.stroke
                : undefined
          }
          strokeWidth={path.strokeWidth ?? 0}
          opacity={path.opacity ?? 1}
          lineCap="round"
          lineJoin="round"
          perfectDrawEnabled={false}
          listening={listening}
          {...shadowProps}
        />
      ))}
    </Group>
  );
}
