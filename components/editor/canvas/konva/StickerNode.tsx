"use client";

import { useMemo } from "react";
import { Group, Path } from "react-konva";
import type { StickerElement } from "@/types";
import { getSticker } from "@/lib/stickers";

interface StickerNodeProps {
  element: StickerElement;
  width: number;
  height: number;
  listening?: boolean;
}

/**
 * Sticker body drawn at the local origin. The 24×24 viewBox is scaled to the
 * element frame so the ink fills the resize box exactly.
 */
export function StickerNode({ element, width, height, listening = false }: StickerNodeProps) {
  const sticker = getSticker(element.stickerId);

  const scale = useMemo(
    () => Math.min(width, height) / 24,
    [width, height],
  );

  return (
    <Group
      x={(width - 24 * scale) / 2}
      y={(height - 24 * scale) / 2}
      scaleX={scale}
      scaleY={scale}
      listening={listening}
    >
      {sticker.paths.map((path, index) => (
        <Path
          key={index}
          data={path.d}
          fill={path.fill === "currentColor" ? element.color : undefined}
          stroke={path.stroke === "currentColor" ? element.color : undefined}
          strokeWidth={path.strokeWidth ?? 0}
          lineCap="round"
          lineJoin="round"
          perfectDrawEnabled={false}
          listening={listening}
        />
      ))}
    </Group>
  );
}
