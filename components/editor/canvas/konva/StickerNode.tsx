"use client";

import { useMemo } from "react";
import { Group, Path } from "react-konva";
import type { StickerElement } from "@/types";
import { getSticker } from "@/lib/stickers";

interface StickerNodeProps {
  element: StickerElement;
  listening?: boolean;
}

export function StickerNode({ element, listening = false }: StickerNodeProps) {
  const sticker = getSticker(element.stickerId);

  // The sticker viewBox is 24x24, so one viewBox unit is width/24 millimetres.
  const scale = useMemo(
    () => Math.min(element.width, element.height) / 24,
    [element.width, element.height],
  );

  return (
    <Group
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
      listening={listening}
    >
      <Group scaleX={scale} scaleY={scale}>
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
    </Group>
  );
}
