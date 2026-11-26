"use client";

import { Arrow, Ellipse, Line, Rect } from "react-konva";
import type { ShapeElement } from "@/types";
import { getGradientPoints, getPolygonPoints, getStarPoints } from "@/lib/shapes";

interface ShapeNodeProps {
  element: ShapeElement;
  /** Frame size from the enclosing transform group, in millimetres. */
  width: number;
  height: number;
  listening?: boolean;
}

/**
 * Shape body drawn at the local origin. Supports rectangle, ellipse, line,
 * arrow, polygon, star, linear gradients, corner radius, stroke, and drop shadow.
 */
export function ShapeNode({
  element,
  width,
  height,
  listening = false,
}: ShapeNodeProps) {
  const hasShadow = Boolean(element.shadow);
  const shadowProps = hasShadow
    ? {
        shadowColor: "rgba(18,32,86,0.34)",
        shadowBlur: Math.max(1.6, Math.min(width, height) * 0.08),
        shadowOffsetX: 0.9,
        shadowOffsetY: 1.5,
        shadowEnabled: true,
      }
    : { shadowEnabled: false };

  const common = {
    perfectDrawEnabled: false,
    listening,
    shadowForStrokeEnabled: hasShadow,
    ...shadowProps,
  };

  const hasGradient = Boolean(element.fillGradient?.enabled);
  const hasSolidFill = element.fill !== "transparent";
  const hasStroke = element.stroke !== "transparent" && element.strokeWidth > 0;
  const strokeWidth = hasStroke ? Math.max(0.05, element.strokeWidth) : 0;

  const linearGradientProps = (centered = false) => {
    if (!hasGradient || !element.fillGradient) return {};
    const { start, end } = getGradientPoints(
      width,
      height,
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

  if (element.shape === "line") {
    const color =
      element.stroke !== "transparent" ? element.stroke : element.fill;
    const resolved = color === "transparent" ? "#122056" : color;
    return (
      <Line
        {...common}
        points={[0, height / 2, width, height / 2]}
        stroke={resolved}
        strokeWidth={Math.max(0.15, element.strokeWidth)}
        lineCap="round"
        hitStrokeWidth={Math.max(2, height)}
      />
    );
  }

  if (element.shape === "arrow") {
    const color =
      element.stroke !== "transparent" ? element.stroke : element.fill;
    const resolved = color === "transparent" ? "#122056" : color;
    const sw = Math.max(0.25, element.strokeWidth);
    const ptr = Math.max(2.5, Math.min(width * 0.35, sw * 3.6 + 2));
    return (
      <Arrow
        {...common}
        points={[0, height / 2, Math.max(2, width - sw * 0.5), height / 2]}
        pointerLength={ptr}
        pointerWidth={ptr * 0.85}
        fill={resolved}
        stroke={resolved}
        strokeWidth={sw}
        lineCap="round"
        lineJoin="round"
        hitStrokeWidth={Math.max(3, height)}
      />
    );
  }

  if (element.shape === "ellipse") {
    return (
      <Ellipse
        {...common}
        x={width / 2}
        y={height / 2}
        radiusX={width / 2}
        radiusY={height / 2}
        fill={!hasGradient && hasSolidFill ? element.fill : undefined}
        {...linearGradientProps(true)}
        stroke={hasStroke ? element.stroke : undefined}
        strokeWidth={strokeWidth}
      />
    );
  }

  if (element.shape === "polygon" || element.shape === "star") {
    const points =
      element.shape === "polygon"
        ? getPolygonPoints(width, height, element.sides ?? 6)
        : getStarPoints(
            width,
            height,
            element.sides ?? 5,
            element.innerRadiusRatio ?? 0.45,
          );
    return (
      <Line
        {...common}
        points={points}
        closed
        lineJoin={element.radius > 0 ? "round" : "miter"}
        fill={!hasGradient && hasSolidFill ? element.fill : undefined}
        {...linearGradientProps(false)}
        stroke={hasStroke ? element.stroke : undefined}
        strokeWidth={strokeWidth}
      />
    );
  }

  return (
    <Rect
      {...common}
      width={width}
      height={height}
      fill={!hasGradient && hasSolidFill ? element.fill : undefined}
      {...linearGradientProps(false)}
      stroke={hasStroke ? element.stroke : undefined}
      strokeWidth={strokeWidth}
      cornerRadius={Math.max(0, element.radius)}
    />
  );
}
