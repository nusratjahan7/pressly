"use client";

import { useMemo } from "react";
import { Rect } from "react-konva";
import type { BackgroundDefinition } from "@/lib/backgrounds";
import { getPatternTile, getPatternTileScale } from "@/lib/konva/patternTiles";

interface BackgroundNodeProps {
  background: BackgroundDefinition;
  width: number;
  height: number;
  scale: number;
  dpr?: number;
}

/**
 * Draws a page background using Konva primitives. Solid colours map directly to
 * a Rect fill; the four CSS patterns are reproduced from a cached canvas tile so
 * a page never materialises thousands of individual nodes.
 */
export function BackgroundNode({
  background,
  width,
  height,
  scale,
  dpr = 1,
}: BackgroundNodeProps) {
  const pattern = background.pdfPattern;

  const tile = useMemo(
    () => (pattern ? getPatternTile(pattern, scale, dpr) : null),
    [pattern, scale, dpr],
  );

  const tileScale = useMemo(
    () => (pattern && tile ? getPatternTileScale(pattern, tile) : 1),
    [pattern, tile],
  );

  return (
    <Rect
      x={0}
      y={0}
      width={width}
      height={height}
      fill={tile ? undefined : background.baseColor}
      // Konva accepts a canvas here but types it as an image element.
      fillPatternImage={(tile ?? undefined) as unknown as
        | HTMLImageElement
        | undefined}
      fillPatternRepeat="repeat"
      fillPatternScaleX={tileScale}
      fillPatternScaleY={tileScale}
      listening={false}
      perfectDrawEnabled={false}
    />
  );
}
