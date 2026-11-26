export const DEFAULT_CURVE_ARC = 65;

export interface CurvedPathResult {
  d: string;
  minY: number;
  maxY: number;
}

/**
 * Builds a quadratic Bezier arch path spanning the text box width.
 * `curveArc` in [-100, 100] controls rainbow (positive) vs smile (negative)
 * curvature proportional to box width so text bends noticeably at any box height.
 */
export function buildCurvedTextPath(
  width: number,
  height: number,
  curveArc = DEFAULT_CURVE_ARC,
): CurvedPathResult {
  const span = Math.max(8, width - 4);
  const ratio = Math.max(-1, Math.min(1, curveArc / 100));
  const sagitta = ratio * Math.max(span * 0.6, height);
  const baseY =
    height * 0.5 +
    Math.sign(ratio) * Math.min(height * 0.35, Math.abs(sagitta) * 0.4);
  const ctrlY = baseY - 2 * sagitta;
  const peakY = (baseY + ctrlY) / 2;
  const x0 = 2;
  const x1 = Math.max(4, width - 2);
  return {
    d: `M ${x0},${baseY.toFixed(2)} Q ${(width / 2).toFixed(2)},${ctrlY.toFixed(2)} ${x1.toFixed(2)},${baseY.toFixed(2)}`,
    minY: Math.min(baseY, peakY),
    maxY: Math.max(baseY, peakY),
  };
}
