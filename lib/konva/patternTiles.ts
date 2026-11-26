import type { BackgroundPattern } from "@/lib/backgrounds";

export interface PatternTileConfig {
  kind: BackgroundPattern;
  color: string;
  opacity: number;
  spacingMm: number;
}

const cache = new Map<string, HTMLCanvasElement>();
const MAX_ENTRIES = 64;

/**
 * Builds a repeating tile for a background pattern or paper texture.
 * Sized in device pixels for crisp print & zoom fidelity.
 */
export function getPatternTile(
  config: PatternTileConfig,
  scale: number,
  dpr = 1,
): HTMLCanvasElement | null {
  if (typeof document === "undefined") return null;
  const spacingMm = Math.max(0.2, config.spacingMm);
  const tilePx = Math.max(
    12,
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

  switch (config.kind) {
    case "dots": {
      const radius = Math.max(0.7, 0.18 * pxPerMm);
      ctx.beginPath();
      ctx.arc(tilePx / 2, tilePx / 2, radius, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case "ruled": {
      ctx.lineWidth = Math.max(1, 0.08 * pxPerMm);
      ctx.beginPath();
      ctx.moveTo(0, tilePx / 2);
      ctx.lineTo(tilePx, tilePx / 2);
      ctx.stroke();
      break;
    }
    case "grid": {
      ctx.lineWidth = Math.max(1, 0.08 * pxPerMm);
      ctx.beginPath();
      ctx.moveTo(0, tilePx / 2);
      ctx.lineTo(tilePx, tilePx / 2);
      ctx.moveTo(tilePx / 2, 0);
      ctx.lineTo(tilePx / 2, tilePx);
      ctx.stroke();
      break;
    }
    case "hatch": {
      ctx.lineWidth = Math.max(1, 0.08 * pxPerMm);
      const step = spacingMm * Math.SQRT2 * pxPerMm;
      ctx.beginPath();
      for (let offset = -tilePx; offset <= tilePx; offset += step) {
        ctx.moveTo(offset, 0);
        ctx.lineTo(offset + tilePx, tilePx);
      }
      ctx.stroke();
      break;
    }
    case "checker": {
      const half = tilePx / 2;
      ctx.fillRect(0, 0, half, half);
      ctx.fillRect(half, half, half, half);
      break;
    }
    case "waves": {
      ctx.lineWidth = Math.max(1, 0.14 * pxPerMm);
      ctx.beginPath();
      ctx.moveTo(0, tilePx * 0.5);
      ctx.bezierCurveTo(
        tilePx * 0.25,
        tilePx * 0.18,
        tilePx * 0.25,
        tilePx * 0.82,
        tilePx * 0.5,
        tilePx * 0.5,
      );
      ctx.bezierCurveTo(
        tilePx * 0.75,
        tilePx * 0.18,
        tilePx * 0.75,
        tilePx * 0.82,
        tilePx,
        tilePx * 0.5,
      );
      ctx.stroke();
      break;
    }
    case "terrazzo": {
      const chips = [
        [0.18, 0.24, 0.11, 0],
        [0.64, 0.18, 0.09, 1],
        [0.36, 0.68, 0.13, 0.5],
        [0.82, 0.62, 0.1, 2.1],
        [0.14, 0.82, 0.08, 1.4],
      ];
      for (const [cx, cy, r, rot] of chips) {
        ctx.save();
        ctx.translate(tilePx * cx!, tilePx * cy!);
        ctx.rotate(rot!);
        const s = tilePx * r!;
        ctx.beginPath();
        ctx.moveTo(-s, -s * 0.4);
        ctx.lineTo(s * 0.9, -s * 0.7);
        ctx.lineTo(s * 0.6, s * 0.8);
        ctx.lineTo(-s * 0.7, s * 0.5);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      }
      break;
    }
    case "linen": {
      ctx.lineWidth = Math.max(0.8, 0.06 * pxPerMm);
      const step = Math.max(3, Math.round(tilePx / 8));
      for (let i = 0; i < tilePx; i += step) {
        ctx.globalAlpha = config.opacity * (i % 2 === 0 ? 1 : 0.55);
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(tilePx, i);
        ctx.moveTo(i, 0);
        ctx.lineTo(i, tilePx);
        ctx.stroke();
      }
      break;
    }
    case "cotton":
    case "kraft-grain": {
      let seed = config.kind === "cotton" ? 41 : 97;
      const rand = () => {
        seed = (seed * 16807) % 2147483647;
        return (seed - 1) / 2147483646;
      };
      const count = Math.max(24, Math.min(240, Math.round(tilePx * 1.4)));
      for (let i = 0; i < count; i += 1) {
        const x = rand() * tilePx;
        const y = rand() * tilePx;
        const size = Math.max(0.8, (config.kind === "kraft-grain" ? 1.5 : 1) * (0.5 + rand()));
        ctx.globalAlpha = config.opacity * (0.4 + rand() * 0.6);
        ctx.fillRect(x, y, size, size);
      }
      break;
    }
    case "watercolor-wash":
    case "marble": {
      const grad = ctx.createRadialGradient(
        tilePx * 0.35,
        tilePx * 0.35,
        0,
        tilePx * 0.5,
        tilePx * 0.5,
        tilePx * 0.65,
      );
      grad.addColorStop(0, config.color);
      grad.addColorStop(1, "transparent");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, tilePx, tilePx);
      if (config.kind === "marble") {
        ctx.lineWidth = Math.max(0.8, 0.12 * pxPerMm);
        ctx.beginPath();
        ctx.moveTo(0, tilePx * 0.25);
        ctx.bezierCurveTo(
          tilePx * 0.35,
          tilePx * 0.45,
          tilePx * 0.65,
          tilePx * 0.1,
          tilePx,
          tilePx * 0.72,
        );
        ctx.stroke();
      }
      break;
    }
  }

  if (cache.size >= MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest !== undefined) cache.delete(oldest);
  }
  cache.set(key, canvas);
  return canvas;
}

/** Scale that maps the tile's pixel width onto `spacingMm` local units. */
export function getPatternTileScale(
  config: PatternTileConfig,
  tile: HTMLCanvasElement,
) {
  return Math.max(0.2, config.spacingMm) / tile.width;
}
