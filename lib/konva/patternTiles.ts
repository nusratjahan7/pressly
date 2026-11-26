import type { BackgroundPattern } from "@/lib/backgrounds";

export interface PatternTileConfig {
  kind: BackgroundPattern;
  color: string;
  opacity: number;
  spacingMm: number;
}

const cache = new Map<string, HTMLCanvasElement>();
const MAX_ENTRIES = 48;

/**
 * Builds a repeating tile for a background pattern.
 *
 * The tile is sized so that one tile maps to exactly `spacingMm` and covers
 * `spacingMm * scale * dpr` device pixels, which keeps hairlines crisp instead
 * of downsampling a fixed-size tile at every zoom level.
 */
export function getPatternTile(
  config: PatternTileConfig,
  scale: number,
  dpr = 1,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const spacingMm = Math.max(0.2, config.spacingMm);
  const tilePx = Math.max(
    8,
    Math.min(512, Math.round(spacingMm * Math.max(scale, 0.0001) * dpr)),
  );
  const key = `${config.kind}|${config.color}|${config.opacity}|${tilePx}`;
  const cached = cache.get(key);
  if (cached) return cached;

  const canvas = document.createElement("canvas");
  canvas.width = tilePx;
  canvas.height = tilePx;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const pxPerMm = tilePx / spacingMm;
  ctx.clearRect(0, 0, tilePx, tilePx);
  ctx.globalAlpha = config.opacity;
  ctx.fillStyle = config.color;
  ctx.strokeStyle = config.color;

  if (config.kind === "dots") {
    const radius = Math.max(0.5, 0.16 * pxPerMm);
    ctx.beginPath();
    ctx.arc(tilePx / 2, tilePx / 2, radius, 0, Math.PI * 2);
    ctx.fill();
  } else if (config.kind === "ruled") {
    ctx.lineWidth = Math.max(1, 0.08 * pxPerMm);
    ctx.beginPath();
    ctx.moveTo(0, tilePx / 2);
    ctx.lineTo(tilePx, tilePx / 2);
    ctx.stroke();
  } else if (config.kind === "grid") {
    ctx.lineWidth = Math.max(1, 0.08 * pxPerMm);
    ctx.beginPath();
    ctx.moveTo(0, tilePx / 2);
    ctx.lineTo(tilePx, tilePx / 2);
    ctx.moveTo(tilePx / 2, 0);
    ctx.lineTo(tilePx / 2, tilePx);
    ctx.stroke();
  } else {
    ctx.lineWidth = Math.max(1, 0.08 * pxPerMm);
    const step = spacingMm * Math.SQRT2 * pxPerMm;
    ctx.beginPath();
    for (let offset = -tilePx; offset <= tilePx; offset += step) {
      ctx.moveTo(offset, 0);
      ctx.lineTo(offset + tilePx, tilePx);
    }
    ctx.stroke();
  }

  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, canvas);
  return canvas;
}

/** Scale that maps the tile's pixel width onto `spacingMm` local units. */
export function getPatternTileScale(config: PatternTileConfig, tile: HTMLCanvasElement) {
  return Math.max(0.2, config.spacingMm) / tile.width;
}
