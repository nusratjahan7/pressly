import type { ShapeKind } from "@/types";

export interface ShapePreset {
  kind: ShapeKind;
  label: string;
}

export const SHAPE_PRESETS: ShapePreset[] = [
  { kind: "rectangle", label: "Rectangle" },
  { kind: "ellipse", label: "Ellipse" },
  { kind: "line", label: "Line" },
  { kind: "arrow", label: "Arrow" },
  { kind: "polygon", label: "Polygon" },
  { kind: "star", label: "Star" },
];

/**
 * Generates flat `[x0, y0, ...]` vertices for a regular polygon inscribed inside `width` x `height`.
 */
export function getPolygonPoints(
  width: number,
  height: number,
  sides = 6,
): number[] {
  const count = Math.max(3, Math.min(12, Math.round(sides)));
  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.max(0.5, width / 2);
  const ry = Math.max(0.5, height / 2);
  const points: number[] = [];
  for (let i = 0; i < count; i += 1) {
    const angle = (i * 2 * Math.PI) / count - Math.PI / 2;
    points.push(cx + Math.cos(angle) * rx, cy + Math.sin(angle) * ry);
  }
  return points;
}

/**
 * Generates flat `[x0, y0, ...]` vertices for a star inscribed inside `width` x `height`.
 */
export function getStarPoints(
  width: number,
  height: number,
  pointsCount = 5,
  innerRatio = 0.45,
): number[] {
  const count = Math.max(3, Math.min(12, Math.round(pointsCount)));
  const inner = Math.max(0.15, Math.min(0.85, innerRatio));
  const cx = width / 2;
  const cy = height / 2;
  const rx = Math.max(0.5, width / 2);
  const ry = Math.max(0.5, height / 2);
  const step = Math.PI / count;
  const coords: number[] = [];
  for (let i = 0; i < count * 2; i += 1) {
    const scale = i % 2 === 0 ? 1 : inner;
    const angle = i * step - Math.PI / 2;
    coords.push(cx + Math.cos(angle) * rx * scale, cy + Math.sin(angle) * ry * scale);
  }
  return coords;
}

/**
 * Computes linear gradient start and end coordinates across `width` x `height`.
 * Set `centered` for shapes anchored at their centre (e.g., Konva `Ellipse`).
 */
export function getGradientPoints(
  width: number,
  height: number,
  angleDeg = 135,
  centered = false,
): { start: { x: number; y: number }; end: { x: number; y: number } } {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  const dx = Math.cos(rad);
  const dy = Math.sin(rad);
  const hw = width / 2;
  const hh = height / 2;
  const cx = centered ? 0 : hw;
  const cy = centered ? 0 : hh;
  return {
    start: { x: cx - dx * hw, y: cy - dy * hh },
    end: { x: cx + dx * hw, y: cy + dy * hh },
  };
}

/** Converts a flat `[x, y, ...]` coordinate array into an SVG path string. */
export function pointsToSvgPath(points: number[], closed = true): string {
  if (points.length < 4) return "";
  const parts: string[] = [];
  for (let i = 0; i < points.length; i += 2) {
    const cmd = i === 0 ? "M" : "L";
    parts.push(`${cmd} ${points[i]!.toFixed(2)} ${points[i + 1]!.toFixed(2)}`);
  }
  if (closed) parts.push("Z");
  return parts.join(" ");
}
