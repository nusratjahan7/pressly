"use client";

import { useMemo } from "react";
import { Group, Layer, Line, Rect, Stage } from "react-konva";
import type { Page, PageSize } from "@/types";
import { getSpreadLayout } from "@/lib/konva/geometry";
import { PageNode } from "@/components/editor/canvas/konva/PageNode";

export interface SpreadStageProps {
  width: number;
  height: number;
  /** Container-relative offset of the spread's top-left corner, in px. */
  panX: number;
  panY: number;
  /** Device pixels per millimetre. */
  scale: number;
  pageSize: PageSize;
  pages: Page[];
  showSafeMargin: boolean;
  showBleed: boolean;
}

/**
 * Pure renderer for the active spread: pages, centring spine shadow and the
 * drop shadow beneath the paper. Viewport state is owned by `CanvasWorkspace`
 * so pan/zoom can be driven from the DOM container.
 */
export function SpreadStage({
  width,
  height,
  panX,
  panY,
  scale,
  pageSize,
  pages,
  showSafeMargin,
  showBleed,
}: SpreadStageProps) {
  const layout = useMemo(
    () => getSpreadLayout(pageSize, pages.length),
    [pageSize, pages.length],
  );

  const dpr =
    typeof window === "undefined"
      ? 1
      : Math.min(2, window.devicePixelRatio || 1);

  if (pages.length === 0 || width === 0 || height === 0) return null;

  const spine = layout.spineX;
  const hairline = Math.max(0.03, 0.6 / Math.max(scale, 0.0001));

  return (
    <Stage width={width} height={height} pixelRatio={dpr} listening>
      <Layer>
        <Group x={panX} y={panY} scaleX={scale} scaleY={scale}>
          <Rect
            x={0.6}
            y={1.2}
            width={layout.spreadWidth}
            height={layout.spreadHeight}
            fill="rgba(18,32,86,0.10)"
            listening={false}
            perfectDrawEnabled={false}
          />

          {pages.map((page, index) => (
            <PageNode
              key={page.id}
              page={page}
              pageSize={pageSize}
              x={index * layout.pageWidth}
              scale={scale}
              dpr={dpr}
              showSafeMargin={showSafeMargin}
              showBleed={showBleed}
            />
          ))}

          {spine !== null ? (
            <>
              <Rect
                x={spine - 1.6}
                y={0}
                width={3.2}
                height={layout.spreadHeight}
                fillLinearGradientStartPoint={{ x: -1.6, y: 0 }}
                fillLinearGradientEndPoint={{ x: 1.6, y: 0 }}
                fillLinearGradientColorStops={[
                  0,
                  "rgba(18,32,86,0)",
                  0.5,
                  "rgba(18,32,86,0.16)",
                  1,
                  "rgba(18,32,86,0)",
                ]}
                listening={false}
                perfectDrawEnabled={false}
              />
              <Line
                points={[spine, 0, spine, layout.spreadHeight]}
                stroke="rgba(18,32,86,0.10)"
                strokeWidth={hairline}
                listening={false}
                perfectDrawEnabled={false}
              />
            </>
          ) : null}
        </Group>
      </Layer>
    </Stage>
  );
}
