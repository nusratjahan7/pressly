"use client";

import { Ellipse, Line, Rect } from "react-konva";
import type { ShapeElement } from "@/types";

interface ShapeNodeProps {
  element: ShapeElement;
  listening?: boolean;
}

export function ShapeNode({ element, listening = false }: ShapeNodeProps) {
  const { x, y, width, height, rotation, opacity } = element;
  const common = {
    x,
    y,
    rotation,
    opacity,
    perfectDrawEnabled: false,
    listening,
    shadowForStrokeEnabled: false,
  };

  if (element.shape === "line") {
    const color =
      element.stroke !== "transparent" ? element.stroke : element.fill;
    const resolved = color === "transparent" ? "#122056" : color;
    return (
      <Line
        {...common}
        points={[0, height / 2, width, height / 2]}
        stroke={resolved}
        strokeWidth={Math.max(0.05, element.strokeWidth)}
        lineCap="butt"
        hitStrokeWidth={Math.max(2, height)}
      />
    );
  }

  if (element.shape === "ellipse") {
    const hasFill = element.fill !== "transparent";
    const hasStroke = element.stroke !== "transparent" && element.strokeWidth > 0;
    return (
      <Ellipse
        {...common}
        x={x + width / 2}
        y={y + height / 2}
        radiusX={width / 2}
        radiusY={height / 2}
        fill={hasFill ? element.fill : undefined}
        stroke={hasStroke ? element.stroke : undefined}
        strokeWidth={hasStroke ? element.strokeWidth : 0}
      />
    );
  }

  const hasFill = element.fill !== "transparent";
  const hasStroke = element.stroke !== "transparent" && element.strokeWidth > 0;
  return (
    <Rect
      {...common}
      width={width}
      height={height}
      fill={hasFill ? element.fill : undefined}
      stroke={hasStroke ? element.stroke : undefined}
      strokeWidth={hasStroke ? element.strokeWidth : 0}
      cornerRadius={Math.max(0, element.radius)}
    />
  );
}
