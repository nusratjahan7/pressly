"use client";

import type { PageSize } from "@/types";
import type { LayoutDefinition } from "@/lib/layouts";
import { cn } from "@/lib/cn";

interface LayoutWireframeProps {
  layout: LayoutDefinition;
  pageSize: PageSize;
  maxWidth?: number;
  maxHeight?: number;
  className?: string;
}

/**
 * Miniature SVG wireframe of a layout's frames at the document's real page (or
 * spread) aspect ratio.
 */
export function LayoutWireframe({
  layout,
  pageSize,
  maxWidth = 88,
  maxHeight = 84,
  className,
}: LayoutWireframeProps) {
  const aspect =
    layout.scope === "spread"
      ? (pageSize.w * 2) / pageSize.h
      : pageSize.w / pageSize.h;

  let w = maxWidth;
  let h = w / aspect;
  if (h > maxHeight) {
    h = maxHeight;
    w = h * aspect;
  }

  const boxW = Math.round(w * 10) / 10;
  const boxH = Math.round(h * 10) / 10;
  const pad = 4;
  const innerW = Math.max(10, boxW - pad * 2);
  const innerH = Math.max(10, boxH - pad * 2);
  const gap = 1.6;

  return (
    <svg
      width={boxW}
      height={boxH}
      viewBox={`0 0 ${boxW} ${boxH}`}
      aria-hidden="true"
      className={cn("block shrink-0", className)}
    >
      <rect
        x={0.5}
        y={0.5}
        width={boxW - 1}
        height={boxH - 1}
        rx={1}
        fill="#FFFFFF"
        stroke="#D8DBE8"
        strokeWidth={1}
      />
      {layout.scope === "spread" ? (
        <line
          x1={boxW / 2}
          y1={1}
          x2={boxW / 2}
          y2={boxH - 1}
          stroke="#E4E7F2"
          strokeWidth={1}
        />
      ) : null}
      {layout.frames.map((frame, index) => {
        const insetL = frame.x > 0.001 ? gap / 2 : 0;
        const insetR = frame.x + frame.w < 0.999 ? gap / 2 : 0;
        const insetT = frame.y > 0.001 ? gap / 2 : 0;
        const insetB = frame.y + frame.h < 0.999 ? gap / 2 : 0;

        const fx = pad + frame.x * innerW + insetL;
        const fy = pad + frame.y * innerH + insetT;
        const fw = Math.max(2, frame.w * innerW - insetL - insetR);
        const fh = Math.max(2, frame.h * innerH - insetT - insetB);

        const isText = frame.type === "text";
        return (
          <g key={index}>
            <rect
              x={fx}
              y={fy}
              width={fw}
              height={fh}
              rx={0.8}
              fill={isText ? "#FAF2F6" : "#E5E7EE"}
              stroke={isText ? "#D4A3B8" : "#B5B9C7"}
              strokeWidth={0.75}
              strokeDasharray={isText ? "2 1.5" : undefined}
            />
            {isText && fh >= 8 ? (
              <text
                x={fx + fw / 2}
                y={fy + fh / 2 + 2.2}
                textAnchor="middle"
                fontSize={Math.min(7, fh * 0.52)}
                fontWeight={700}
                fill="#E09BB6"
              >
                text
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
