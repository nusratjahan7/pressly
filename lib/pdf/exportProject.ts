import type {
  Element,
  ImageElement,
  Page,
  Project,
  QrElement,
  ShapeElement,
  StickerElement,
  TextElement,
} from "@/types";
import {
  resolvePageBackground,
  type BackgroundPattern,
  type ResolvedPageBackground,
} from "@/lib/backgrounds";
import { getPatternTile } from "@/lib/konva/patternTiles";
import { fetchFontBytesForPdf } from "@/lib/fonts";
import { buildCssFilterString, resolveMediaUrl } from "@/lib/mediaStorage";
import { getQrMatrix } from "@/lib/qr";
import {
  getGradientPoints,
  getPolygonPoints,
  getStarPoints,
  pointsToSvgPath,
} from "@/lib/shapes";
import {
  getSticker,
  loadCustomStickers,
  stickerToSvgString,
} from "@/lib/stickers";
import { buildCurvedTextPath, DEFAULT_CURVE_ARC } from "@/lib/textCurve";
import { mmToPt } from "@/lib/units";
import {
  buildPdfExportPlan,
  type PdfExportOptions,
} from "@/lib/pdf/plan";
import {
  createWorkerRasterSession,
  type WorkerRasterSession,
} from "@/lib/pdf/rasterWorker";

export type { PdfExportOptions, PdfLayoutMode, PdfPreset } from "@/lib/pdf/plan";

export interface PdfExportProgress {
  phase: "preparing" | "rendering" | "saving";
  percent: number;
  currentSheet: number;
  totalSheets: number;
  label: string;
}

type PdfDocument = import("pdf-lib").PDFDocument;
type PdfPage = import("pdf-lib").PDFPage;
type PdfFont = import("pdf-lib").PDFFont;
type RGB = import("pdf-lib").RGB;

const MAX_RASTER_EDGE = 3800;

function throwIfAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Export cancelled", "AbortError");
  }
}

async function yieldToUi(signal?: AbortSignal): Promise<void> {
  throwIfAborted(signal);
  await new Promise<void>((resolve) => {
    window.setTimeout(resolve, 0);
  });
  throwIfAborted(signal);
}

function drawPattern(
  page: PdfPage,
  pattern: {
    kind: BackgroundPattern;
    color: string;
    opacity: number;
    spacingMm: number;
  },
  originX: number,
  originY: number,
  width: number,
  height: number,
) {
  const color = hexToRgb(pattern.color);
  if (!color) return;
  const spacing = mmToPt(pattern.spacingMm);
  const weight = mmToPt(0.08);

  if (pattern.kind === "dots") {
    const radius = mmToPt(0.16);
    for (let x = spacing / 2; x < width; x += spacing) {
      for (let y = spacing / 2; y < height; y += spacing) {
        page.drawCircle({
          x: originX + x,
          y: originY + y,
          size: radius,
          color,
          opacity: pattern.opacity,
        });
      }
    }
    return;
  }

  if (pattern.kind === "ruled" || pattern.kind === "grid") {
    for (let y = spacing; y < height; y += spacing) {
      page.drawLine({
        start: { x: originX, y: originY + y },
        end: { x: originX + width, y: originY + y },
        thickness: weight,
        color,
        opacity: pattern.opacity,
      });
    }
    if (pattern.kind === "ruled") return;
    for (let x = spacing; x < width; x += spacing) {
      page.drawLine({
        start: { x: originX + x, y: originY },
        end: { x: originX + x, y: originY + height },
        thickness: weight,
        color,
        opacity: pattern.opacity,
      });
    }
    return;
  }

  for (let x = -height; x < width; x += spacing) {
    const sx = Math.max(0, x);
    const ex = Math.min(width, x + height);
    const sy = Math.max(0, -x);
    const ey = Math.min(height, height - (x + height - width));
    if (ex <= sx || ey <= sy) continue;
    page.drawLine({
      start: { x: originX + sx, y: originY + sy },
      end: { x: originX + ex, y: originY + ey },
      thickness: weight,
      color,
      opacity: pattern.opacity,
    });
  }
}

function hexToRgb(hex: string): RGB | null {
  if (!hex || hex === "transparent") return null;
  const value = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{3}$|^[0-9a-fA-F]{6}$/.test(value)) return null;
  const expanded =
    value.length === 3
      ? value
          .split("")
          .map((char) => char + char)
          .join("")
      : value;
  const num = Number.parseInt(expanded, 16);
  return {
    type: "RGB",
    red: ((num >> 16) & 255) / 255,
    green: ((num >> 8) & 255) / 255,
    blue: (num & 255) / 255,
  } as RGB;
}

function rotatedOrigin(
  x: number,
  y: number,
  width: number,
  height: number,
  cssRotationDegrees: number,
) {
  if (!cssRotationDegrees) return { x, y };
  const theta = (-cssRotationDegrees * Math.PI) / 180;
  const cos = Math.cos(theta);
  const sin = Math.sin(theta);
  const centerX = x + width / 2;
  const centerY = y + height / 2;
  const originX = centerX + (-width / 2) * cos - (-height / 2) * sin;
  const originY = centerY + (-width / 2) * sin + (-height / 2) * cos;
  return { x: originX, y: originY };
}

/**
 * Rotates & optionally mirrors flat `[x0, y0, ...]` SVG points centered around `(0, 0)`.
 */
function transformSvgPoints(
  pts: number[],
  width: number,
  height: number,
  rotationDeg: number,
  flipX?: boolean,
  flipY?: boolean,
): number[] {
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const cx = width / 2;
  const cy = height / 2;

  const out: number[] = [];
  for (let i = 0; i + 1 < pts.length; i += 2) {
    let dx = pts[i]! - cx;
    let dy = pts[i + 1]! - cy;
    if (flipX) dx = -dx;
    if (flipY) dy = -dy;
    out.push(dx * cos - dy * sin, dx * sin + dy * cos);
  }
  return out;
}

function roundedRectCenteredSvgPath(
  width: number,
  height: number,
  radius: number,
  rotationDeg: number,
): string {
  const r = Math.min(Math.max(0, radius), width / 2, height / 2);
  const hw = width / 2;
  const hh = height / 2;
  const rad = (rotationDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const rot = (x: number, y: number) => ({
    x: (x * cos - y * sin).toFixed(3),
    y: (x * sin + y * cos).toFixed(3),
  });

  // Approximate quarter-circle corners using cubic bezier kappa.
  const k = r * 0.5522847498;
  const p0 = rot(-hw + r, -hh);
  const p1 = rot(hw - r, -hh);
  const c1a = rot(hw - r + k, -hh);
  const c1b = rot(hw, -hh + r - k);
  const p2 = rot(hw, -hh + r);
  const p3 = rot(hw, hh - r);
  const c2a = rot(hw, hh - r + k);
  const c2b = rot(hw - r + k, hh);
  const p4 = rot(hw - r, hh);
  const p5 = rot(-hw + r, hh);
  const c3a = rot(-hw + r - k, hh);
  const c3b = rot(-hw, hh - r + k);
  const p6 = rot(-hw, hh - r);
  const p7 = rot(-hw, -hh + r);
  const c4a = rot(-hw, -hh + r - k);
  const c4b = rot(-hw + r - k, -hh);

  return [
    `M ${p0.x} ${p0.y}`,
    `L ${p1.x} ${p1.y}`,
    `C ${c1a.x} ${c1a.y} ${c1b.x} ${c1b.y} ${p2.x} ${p2.y}`,
    `L ${p3.x} ${p3.y}`,
    `C ${c2a.x} ${c2a.y} ${c2b.x} ${c2b.y} ${p4.x} ${p4.y}`,
    `L ${p5.x} ${p5.y}`,
    `C ${c3a.x} ${c3a.y} ${c3b.x} ${c3b.y} ${p6.x} ${p6.y}`,
    `L ${p7.x} ${p7.y}`,
    `C ${c4a.x} ${c4a.y} ${c4b.x} ${c4b.y} ${p0.x} ${p0.y}`,
    "Z",
  ].join(" ");
}

async function dataUrlToBytes(dataUrl: string): Promise<Uint8Array | null> {
  const b64 = dataUrl.split(",")[1];
  if (!b64) return null;
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

async function canvasToEncodedBytes(
  canvas: HTMLCanvasElement,
  mime: "image/jpeg" | "image/png",
  quality: number,
): Promise<{ bytes: Uint8Array; mime: "image/jpeg" | "image/png" } | null> {
  if (typeof canvas.toBlob === "function") {
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, mime, quality),
    );
    if (blob) {
      return { bytes: new Uint8Array(await blob.arrayBuffer()), mime };
    }
  }
  const bytes = await dataUrlToBytes(canvas.toDataURL(mime, quality));
  return bytes ? { bytes, mime } : null;
}

async function loadImageElement(src: string): Promise<HTMLImageElement> {
  const resolved = await resolveMediaUrl(src);
  if (!resolved) throw new Error("Empty image source");
  return new Promise((resolve, reject) => {
    const image = new Image();
    if (/^https?:\/\//i.test(resolved)) {
      image.crossOrigin = "anonymous";
    }
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = resolved;
  });
}

async function rasterizeRichBackground(
  background: ResolvedPageBackground,
  widthMm: number,
  heightMm: number,
  dpi: number,
  quality: number,
): Promise<{ bytes: Uint8Array; mime: "image/jpeg" | "image/png" } | null> {
  try {
    const bgDpi = Math.min(240, dpi);
    const wPx = Math.min(
      MAX_RASTER_EDGE,
      Math.max(120, Math.round((widthMm / 25.4) * bgDpi)),
    );
    const hPx = Math.min(
      MAX_RASTER_EDGE,
      Math.max(120, Math.round((heightMm / 25.4) * bgDpi)),
    );
    const scale = wPx / Math.max(1, widthMm);

    const canvas = document.createElement("canvas");
    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    ctx.fillStyle = "#FFFFFF";
    ctx.fillRect(0, 0, wPx, hPx);

    ctx.save();
    ctx.globalAlpha = background.opacity;
    if (background.blur > 0) {
      ctx.filter = `blur(${Math.max(0.5, background.blur * (scale * 0.35))}px)`;
    }

    if (background.gradient) {
      const { start, end } = getGradientPoints(
        wPx,
        hPx,
        background.gradient.angle,
        false,
      );
      const grad = ctx.createLinearGradient(start.x, start.y, end.x, end.y);
      grad.addColorStop(0, background.gradient.from);
      grad.addColorStop(1, background.gradient.to);
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, wPx, hPx);
    } else {
      ctx.fillStyle = background.baseColor;
      ctx.fillRect(0, 0, wPx, hPx);
    }

    if (background.pdfPattern) {
      const tile = getPatternTile(background.pdfPattern, scale, 1);
      if (tile) {
        const pat = ctx.createPattern(tile, "repeat");
        if (pat) {
          ctx.fillStyle = pat;
          ctx.fillRect(0, 0, wPx, hPx);
        }
      }
    }

    if (background.imageSrc) {
      const img = await loadImageElement(background.imageSrc);
      const ratio = Math.max(
        wPx / Math.max(1, img.naturalWidth),
        hPx / Math.max(1, img.naturalHeight),
      );
      const dw = img.naturalWidth * ratio;
      const dh = img.naturalHeight * ratio;
      ctx.drawImage(img, (wPx - dw) / 2, (hPx - dh) / 2, dw, dh);
    }

    ctx.restore();
    return await canvasToEncodedBytes(
      canvas,
      quality < 1 ? "image/jpeg" : "image/png",
      quality,
    );
  } catch {
    return null;
  }
}

async function rasterizeImage(
  element: ImageElement,
  dpi: number,
  quality: number,
  workerSession: WorkerRasterSession | null,
  signal?: AbortSignal,
): Promise<{ bytes: Uint8Array; mime: "image/jpeg" | "image/png" } | null> {
  if (!element.src) return null;
  try {
    const targetWidth = Math.min(
      MAX_RASTER_EDGE,
      Math.max(1, Math.round((element.width / 25.4) * dpi)),
    );
    const targetHeight = Math.min(
      MAX_RASTER_EDGE,
      Math.max(1, Math.round((element.height / 25.4) * dpi)),
    );
    const image = await loadImageElement(element.src);
    throwIfAborted(signal);

    const scale =
      element.fit === "cover"
        ? Math.max(
            targetWidth / image.naturalWidth,
            targetHeight / image.naturalHeight,
          ) * Math.max(1, element.cropScale ?? 1)
        : Math.min(
            targetWidth / image.naturalWidth,
            targetHeight / image.naturalHeight,
          );
    const drawWidth = image.naturalWidth * scale;
    const drawHeight = image.naturalHeight * scale;
    const drawX =
      (targetWidth - drawWidth) / 2 +
      ((element.cropX ?? 0) * Math.max(0, drawWidth - targetWidth)) / 2;
    const drawY =
      (targetHeight - drawHeight) / 2 +
      ((element.cropY ?? 0) * Math.max(0, drawHeight - targetHeight)) / 2;

    const pxPerMm = targetWidth / Math.max(element.width, 1);
    const radiusPx =
      (element.radius / Math.max(element.width, 1)) * targetWidth;
    const filterStr = buildCssFilterString({
      brightness: element.brightness,
      contrast: element.contrast,
      saturation: element.saturation,
      grayscale: element.grayscale,
      blur: element.blur ? element.blur * pxPerMm * 0.35 : 0,
    });
    const borderWidthPx =
      element.borderWidth &&
      element.borderWidth > 0 &&
      element.borderColor &&
      element.borderColor !== "transparent"
        ? element.borderWidth * pxPerMm
        : 0;
    const needsAlpha = radiusPx > 0 || element.fit === "contain" || quality >= 0.99;
    const mime: "image/jpeg" | "image/png" = needsAlpha
      ? "image/png"
      : "image/jpeg";

    if (workerSession) {
      const workerResult = await workerSession.rasterize(
        image,
        {
          targetWidth,
          targetHeight,
          drawX,
          drawY,
          drawWidth,
          drawHeight,
          flipX: element.flipX,
          flipY: element.flipY,
          radiusPx,
          filterStr,
          borderWidthPx,
          borderColor: element.borderColor,
          mime,
          quality,
        },
        signal,
      );
      if (workerResult) return workerResult;
    }

    throwIfAborted(signal);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;

    if (mime === "image/jpeg") {
      context.fillStyle = "#FFFFFF";
      context.fillRect(0, 0, targetWidth, targetHeight);
    }
    if (radiusPx > 0) {
      context.beginPath();
      context.roundRect(0, 0, targetWidth, targetHeight, radiusPx);
      context.clip();
    }

    context.save();
    if (filterStr) context.filter = filterStr;
    if (element.flipX || element.flipY) {
      context.translate(
        element.flipX ? targetWidth : 0,
        element.flipY ? targetHeight : 0,
      );
      context.scale(element.flipX ? -1 : 1, element.flipY ? -1 : 1);
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(image, drawX, drawY, drawWidth, drawHeight);
    context.restore();

    if (borderWidthPx > 0 && element.borderColor) {
      const bw = borderWidthPx;
      context.save();
      context.strokeStyle = element.borderColor;
      context.lineWidth = bw;
      if (radiusPx > 0) {
        context.beginPath();
        context.roundRect(
          bw / 2,
          bw / 2,
          targetWidth - bw,
          targetHeight - bw,
          radiusPx,
        );
        context.stroke();
      } else {
        context.strokeRect(bw / 2, bw / 2, targetWidth - bw, targetHeight - bw);
      }
      context.restore();
    }

    return await canvasToEncodedBytes(canvas, mime, quality);
  } catch {
    return null;
  }
}

async function rasterizeSticker(
  element: StickerElement,
  dpi: number,
): Promise<Uint8Array | null> {
  try {
    const wPx = Math.min(
      MAX_RASTER_EDGE,
      Math.max(64, Math.round((element.width / 25.4) * dpi)),
    );
    const hPx = Math.min(
      MAX_RASTER_EDGE,
      Math.max(64, Math.round((element.height / 25.4) * dpi)),
    );
    const definition = getSticker(element.stickerId);
    const customSrc =
      element.src ??
      loadCustomStickers().find((c) => c.id === element.stickerId)?.src ??
      (definition.format === "png" ? definition.src : undefined);

    const image = customSrc
      ? await loadImageElement(customSrc)
      : await loadImageElement(
          `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
            stickerToSvgString(definition.id, element.color, Math.max(wPx, hPx)),
          )}`,
        );

    const canvas = document.createElement("canvas");
    canvas.width = wPx;
    canvas.height = hPx;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const natW = Math.max(1, image.naturalWidth || wPx);
    const natH = Math.max(1, image.naturalHeight || hPx);
    const scale = Math.min(wPx / natW, hPx / natH);
    const drawW = natW * scale;
    const drawH = natH * scale;

    context.save();
    if (element.flipX || element.flipY) {
      context.translate(element.flipX ? wPx : 0, element.flipY ? hPx : 0);
      context.scale(element.flipX ? -1 : 1, element.flipY ? -1 : 1);
    }
    if (element.shadow) {
      context.shadowColor = "rgba(18,32,86,0.34)";
      context.shadowBlur = Math.max(6, Math.min(wPx, hPx) * 0.04);
      context.shadowOffsetX = 3;
      context.shadowOffsetY = 5;
    }
    context.imageSmoothingEnabled = true;
    context.imageSmoothingQuality = "high";
    context.drawImage(
      image,
      (wPx - drawW) / 2,
      (hPx - drawH) / 2,
      drawW,
      drawH,
    );
    context.restore();
    const res = await canvasToEncodedBytes(canvas, "image/png", 1);
    return res?.bytes ?? null;
  } catch {
    return null;
  }
}

async function rasterizeGradientShape(
  shape: ShapeElement,
  dpi: number,
): Promise<Uint8Array | null> {
  try {
    const wPx = Math.min(
      MAX_RASTER_EDGE,
      Math.max(48, Math.round((shape.width / 25.4) * dpi)),
    );
    const hPx = Math.min(
      MAX_RASTER_EDGE,
      Math.max(48, Math.round((shape.height / 25.4) * dpi)),
    );
    const pxPerMm = wPx / Math.max(1, shape.width);
    const strokePx =
      shape.stroke !== "transparent" && shape.strokeWidth > 0
        ? shape.strokeWidth * pxPerMm
        : 0;
    const gradDef = shape.fillGradient?.enabled
      ? (() => {
          const { start, end } = getGradientPoints(
            wPx,
            hPx,
            shape.fillGradient.angle,
            false,
          );
          return `<defs><linearGradient id="g" gradientUnits="userSpaceOnUse" x1="${start.x}" y1="${start.y}" x2="${end.x}" y2="${end.y}"><stop offset="0%" stop-color="${shape.fillGradient.from}"/><stop offset="100%" stop-color="${shape.fillGradient.to}"/></linearGradient></defs>`;
        })()
      : "";
    const fillAttr = shape.fillGradient?.enabled
      ? "url(#g)"
      : shape.fill !== "transparent"
        ? shape.fill
        : "none";
    const strokeAttr = strokePx > 0 ? shape.stroke : "none";

    let body = "";
    if (shape.shape === "ellipse") {
      body = `<ellipse cx="${wPx / 2}" cy="${hPx / 2}" rx="${Math.max(1, wPx / 2 - strokePx / 2)}" ry="${Math.max(1, hPx / 2 - strokePx / 2)}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokePx}"/>`;
    } else if (shape.shape === "polygon" || shape.shape === "star") {
      const pts =
        shape.shape === "polygon"
          ? getPolygonPoints(wPx, hPx, shape.sides ?? 6)
          : getStarPoints(wPx, hPx, shape.sides ?? 5, shape.innerRadiusRatio ?? 0.45);
      body = `<path d="${pointsToSvgPath(pts, true)}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokePx}" stroke-linejoin="${shape.radius > 0 ? "round" : "miter"}"/>`;
    } else {
      const rx = Math.max(0, shape.radius * pxPerMm);
      body = `<rect x="${strokePx / 2}" y="${strokePx / 2}" width="${Math.max(1, wPx - strokePx)}" height="${Math.max(1, hPx - strokePx)}" rx="${rx}" fill="${fillAttr}" stroke="${strokeAttr}" stroke-width="${strokePx}"/>`;
    }

    const flipAttr =
      shape.flipX || shape.flipY
        ? ` transform="translate(${shape.flipX ? wPx : 0} ${shape.flipY ? hPx : 0}) scale(${shape.flipX ? -1 : 1} ${shape.flipY ? -1 : 1})"`
        : "";
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${wPx}" height="${hPx}" viewBox="0 0 ${wPx} ${hPx}">${gradDef}<g${flipAttr}>${body}</g></svg>`;
    const img = await loadImageElement(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
    const canvas = document.createElement("canvas");
    canvas.width = wPx;
    canvas.height = hPx;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.drawImage(img, 0, 0, wPx, hPx);
    const res = await canvasToEncodedBytes(canvas, "image/png", 1);
    return res?.bytes ?? null;
  } catch {
    return null;
  }
}

function wrapTextLines(
  text: string,
  font: PdfFont,
  fontSize: number,
  maxWidth: number,
): string[] {
  const lines: string[] = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(/\s+/);
    let current = "";
    for (const word of words) {
      const candidate = current ? `${current} ${word}` : word;
      if (font.widthOfTextAtSize(candidate, fontSize) <= maxWidth || !current) {
        current = candidate;
      } else {
        lines.push(current);
        current = word;
      }
    }
    if (current) lines.push(current);
  }
  return lines;
}

function drawCropAndFoldMarks(
  pdfPage: PdfPage,
  trimX: number,
  trimY: number,
  trimW: number,
  trimH: number,
  markPt: number,
  bleedPt: number,
  foldOffsetsPt: number[] = [],
) {
  const c = { type: "RGB", red: 0.08, green: 0.09, blue: 0.14 } as RGB;
  const weight = 0.35;
  const offset = Math.max(1.5, bleedPt * 0.35);
  const len = Math.max(6, markPt - offset);

  const corners = [
    // Bottom-left
    [
      [trimX - offset - len, trimY, trimX - offset, trimY],
      [trimX, trimY - offset - len, trimX, trimY - offset],
    ],
    // Bottom-right
    [
      [trimX + trimW + offset, trimY, trimX + trimW + offset + len, trimY],
      [trimX + trimW, trimY - offset - len, trimX + trimW, trimY - offset],
    ],
    // Top-left
    [
      [trimX - offset - len, trimY + trimH, trimX - offset, trimY + trimH],
      [trimX, trimY + trimH + offset, trimX, trimY + trimH + offset + len],
    ],
    // Top-right
    [
      [trimX + trimW + offset, trimY + trimH, trimX + trimW + offset + len, trimY + trimH],
      [trimX + trimW, trimY + trimH + offset, trimX + trimW, trimY + trimH + offset + len],
    ],
  ];

  for (const pair of corners) {
    for (const [x1, y1, x2, y2] of pair) {
      pdfPage.drawLine({
        start: { x: x1, y: y1 },
        end: { x: x2, y: y2 },
        thickness: weight,
        color: c,
      });
    }
  }

  for (const fx of foldOffsetsPt) {
    const x = trimX + fx;
    pdfPage.drawLine({
      start: { x, y: trimY - offset - len },
      end: { x, y: trimY - offset },
      thickness: weight,
      color: c,
      dashArray: [2, 1.5],
    });
    pdfPage.drawLine({
      start: { x, y: trimY + trimH + offset },
      end: { x, y: trimY + trimH + offset + len },
      thickness: weight,
      color: c,
      dashArray: [2, 1.5],
    });
  }
}

export async function createProjectPdf(
  project: Project,
  options: PdfExportOptions = {},
  runtime: {
    onProgress?: (progress: PdfExportProgress) => void;
    signal?: AbortSignal;
  } = {},
): Promise<Uint8Array> {
  const { onProgress, signal } = runtime;
  throwIfAborted(signal);

  const plan = buildPdfExportPlan(project, options);
  const { selectedSheets, dpi, quality, bleedMm, cropMarks } = plan;

  onProgress?.({
    phase: "preparing",
    percent: 4,
    currentSheet: 0,
    totalSheets: selectedSheets.length,
    label: "Loading PDF engine & font subsets…",
  });

  const { PDFDocument, StandardFonts, degrees } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
  throwIfAborted(signal);

  const document: PdfDocument = await PDFDocument.create();
  document.registerFontkit(fontkit);

  const regular = await document.embedFont(StandardFonts.Helvetica);
  const bold = await document.embedFont(StandardFonts.HelveticaBold);
  const embeddedFonts = new Map<string, PdfFont>();

  const resolvePdfFont = async (
    fontFamily: string,
    weight: number,
    italic: boolean,
  ): Promise<PdfFont> => {
    const key = `${fontFamily}:${weight}:${italic ? "i" : "n"}`;
    const cached = embeddedFonts.get(key);
    if (cached) return cached;

    const bytes = await fetchFontBytesForPdf(fontFamily, weight, italic);
    if (bytes) {
      try {
        const embedded = await document.embedFont(bytes, { subset: true });
        embeddedFonts.set(key, embedded);
        return embedded;
      } catch {
        /* fallback below */
      }
    }
    return weight >= 600 ? bold : regular;
  };

  // Pre-warm fonts once upfront.
  const fontKeys = new Map<
    string,
    { fontFamily: string; fontWeight: number; italic: boolean }
  >();
  for (const p of project.pages) {
    if (p.isEndPaper) continue;
    for (const el of p.elements) {
      if (el.hidden || el.type !== "text" || el.isPlaceholder || !el.text.trim()) {
        continue;
      }
      const italic = el.fontStyle === "italic";
      const k = `${el.fontFamily}:${el.fontWeight}:${italic ? "i" : "n"}`;
      if (!fontKeys.has(k)) {
        fontKeys.set(k, {
          fontFamily: el.fontFamily,
          fontWeight: el.fontWeight,
          italic,
        });
      }
    }
  }
  await Promise.all(
    Array.from(fontKeys.values()).map((f) =>
      resolvePdfFont(f.fontFamily, f.fontWeight, f.italic),
    ),
  );
  throwIfAborted(signal);

  const workerSession = createWorkerRasterSession();

  try {
    const bleedPt = mmToPt(bleedMm);
    const markMm = cropMarks ? 5 : 0;
    const markPt = mmToPt(markMm);

    const drawPageBackgroundRegion = async (
      pdfPage: PdfPage,
      page: Page,
      regionOriginXPt: number,
      regionOriginYPt: number,
      regionWidthMm: number,
      regionHeightMm: number,
    ) => {
      const background = resolvePageBackground(page);
      const regionWidthPt = mmToPt(regionWidthMm);
      const regionHeightPt = mmToPt(regionHeightMm);

      const needsRichBgRaster =
        Boolean(background.gradient) ||
        Boolean(background.imageSrc) ||
        background.opacity < 1 ||
        background.blur > 0 ||
        (background.pdfPattern &&
          !["dots", "ruled", "grid", "hatch"].includes(
            background.pdfPattern.kind,
          ));

      if (needsRichBgRaster) {
        const bgRes = await rasterizeRichBackground(
          background,
          regionWidthMm,
          regionHeightMm,
          dpi,
          quality,
        );
        if (bgRes) {
          const embedded =
            bgRes.mime === "image/jpeg"
              ? await document.embedJpg(bgRes.bytes)
              : await document.embedPng(bgRes.bytes);
          pdfPage.drawImage(embedded, {
            x: regionOriginXPt,
            y: regionOriginYPt,
            width: regionWidthPt,
            height: regionHeightPt,
          });
        }
        return;
      }

      const backgroundRgb = hexToRgb(background.baseColor);
      if (backgroundRgb) {
        pdfPage.drawRectangle({
          x: regionOriginXPt,
          y: regionOriginYPt,
          width: regionWidthPt,
          height: regionHeightPt,
          color: backgroundRgb,
        });
      }
      if (background.pdfPattern) {
        drawPattern(
          pdfPage,
          background.pdfPattern,
          regionOriginXPt,
          regionOriginYPt,
          regionWidthPt,
          regionHeightPt,
        );
      }
    };

    const drawElementsIntoRegion = async (
      pdfPage: PdfPage,
      elements: Element[],
      trimOriginXPt: number,
      trimTopYPt: number,
    ) => {
      for (const element of elements) {
        if (element.hidden || element.opacity <= 0) continue;
        await yieldToUi(signal);

        const originX = trimOriginXPt + mmToPt(element.x);
        const topY = trimTopYPt - mmToPt(element.y);
        const widthPt = mmToPt(element.width);
        const heightPt = mmToPt(element.height);
        const rotation = degrees(-element.rotation);

        if (element.type === "shape") {
          const shape = element as ShapeElement;
          const x = originX;
          const y = topY - heightPt;
          const fill = hexToRgb(shape.fill);
          const stroke = hexToRgb(shape.stroke);
          const origin = rotatedOrigin(x, y, widthPt, heightPt, shape.rotation);

          if (shape.shadow) {
            const shadowRgb = hexToRgb("#122056");
            if (shadowRgb) {
              pdfPage.drawRectangle({
                x: origin.x + 1.5,
                y: origin.y - 2,
                width: widthPt,
                height: heightPt,
                color: shadowRgb,
                opacity: shape.opacity * 0.14,
                rotate: rotation,
              });
            }
          }

          if (shape.fillGradient?.enabled) {
            const gradBytes = await rasterizeGradientShape(shape, dpi);
            if (gradBytes) {
              const png = await document.embedPng(gradBytes);
              pdfPage.drawImage(png, {
                x: origin.x,
                y: origin.y,
                width: widthPt,
                height: heightPt,
                opacity: shape.opacity,
                rotate: rotation,
              });
              continue;
            }
          }

          // Pure vector rendering for solid/stroked shapes:
          if (shape.shape === "ellipse") {
            pdfPage.drawEllipse({
              x: x + widthPt / 2,
              y: y + heightPt / 2,
              xScale: widthPt / 2,
              yScale: heightPt / 2,
              color: fill ?? undefined,
              borderColor: stroke ?? undefined,
              borderWidth: stroke ? mmToPt(shape.strokeWidth) : 0,
              opacity: shape.opacity,
              borderOpacity: shape.opacity,
              rotate: rotation,
            });
          } else if (shape.shape === "line") {
            const lineColor = stroke ?? fill ?? hexToRgb("#122056");
            if (lineColor) {
              const centerX = x + widthPt / 2;
              const centerY = y + heightPt / 2;
              const theta = (-shape.rotation * Math.PI) / 180;
              const cos = Math.cos(theta);
              const sin = Math.sin(theta);
              const rotatePoint = (pointX: number, pointY: number) => ({
                x:
                  centerX +
                  (pointX - centerX) * cos -
                  (pointY - centerY) * sin,
                y:
                  centerY +
                  (pointX - centerX) * sin +
                  (pointY - centerY) * cos,
              });
              pdfPage.drawLine({
                start: rotatePoint(x, centerY),
                end: rotatePoint(x + widthPt, centerY),
                thickness: Math.max(0.5, mmToPt(shape.strokeWidth)),
                color: lineColor,
                opacity: shape.opacity,
              });
            }
          } else if (shape.shape === "arrow") {
            const arrowColor =
              stroke ?? fill ?? hexToRgb("#122056");
            if (arrowColor) {
              const swPt = Math.max(0.75, mmToPt(shape.strokeWidth));
              const ptr = Math.max(4, Math.min(widthPt * 0.35, swPt * 3.5 + 3));
              const dir = shape.flipX ? -1 : 1;
              const centerX = x + widthPt / 2;
              const centerY = y + heightPt / 2;
              const theta = (-shape.rotation * Math.PI) / 180;
              const cos = Math.cos(theta);
              const sin = Math.sin(theta);
              const rotateLocal = (dx: number, dy: number) => ({
                x: centerX + dx * cos - dy * sin,
                y: centerY + dx * sin + dy * cos,
              });
              const shaftStart = rotateLocal((-widthPt / 2) * dir, 0);
              const shaftEnd = rotateLocal((widthPt / 2 - ptr * 0.7) * dir, 0);
              pdfPage.drawLine({
                start: shaftStart,
                end: shaftEnd,
                thickness: swPt,
                color: arrowColor,
                opacity: shape.opacity,
              });
              const headPts = transformSvgPoints(
                [
                  shape.flipX ? 0 : widthPt,
                  heightPt / 2,
                  shape.flipX ? ptr : widthPt - ptr,
                  heightPt / 2 - ptr * 0.48,
                  shape.flipX ? ptr : widthPt - ptr,
                  heightPt / 2 + ptr * 0.48,
                ],
                widthPt,
                heightPt,
                shape.rotation,
              );
              pdfPage.drawSvgPath(pointsToSvgPath(headPts, true), {
                x: centerX,
                y: centerY,
                color: arrowColor,
                opacity: shape.opacity,
              });
            }
          } else if (shape.shape === "polygon" || shape.shape === "star") {
            const rawPts =
              shape.shape === "polygon"
                ? getPolygonPoints(widthPt, heightPt, shape.sides ?? 6)
                : getStarPoints(
                    widthPt,
                    heightPt,
                    shape.sides ?? 5,
                    shape.innerRadiusRatio ?? 0.45,
                  );
            const centeredPts = transformSvgPoints(
              rawPts,
              widthPt,
              heightPt,
              shape.rotation,
              shape.flipX,
              shape.flipY,
            );
            pdfPage.drawSvgPath(pointsToSvgPath(centeredPts, true), {
              x: x + widthPt / 2,
              y: y + heightPt / 2,
              color: fill ?? undefined,
              borderColor: stroke ?? undefined,
              borderWidth: stroke ? mmToPt(shape.strokeWidth) : 0,
              opacity: shape.opacity,
              borderOpacity: shape.opacity,
            });
          } else if (shape.radius > 0) {
            const svgPath = roundedRectCenteredSvgPath(
              widthPt,
              heightPt,
              mmToPt(shape.radius),
              shape.rotation,
            );
            pdfPage.drawSvgPath(svgPath, {
              x: x + widthPt / 2,
              y: y + heightPt / 2,
              color: fill ?? undefined,
              borderColor: stroke ?? undefined,
              borderWidth: stroke ? mmToPt(shape.strokeWidth) : 0,
              opacity: shape.opacity,
              borderOpacity: shape.opacity,
            });
          } else {
            pdfPage.drawRectangle({
              x: origin.x,
              y: origin.y,
              width: widthPt,
              height: heightPt,
              color: fill ?? undefined,
              borderColor: stroke ?? undefined,
              borderWidth: stroke ? mmToPt(shape.strokeWidth) : 0,
              opacity: shape.opacity,
              borderOpacity: shape.opacity,
              rotate: rotation,
            });
          }
          continue;
        }

        if (element.type === "text") {
          const text = element as TextElement;
          if (text.isPlaceholder) continue;
          const isItalic = text.fontStyle === "italic";
          const font = await resolvePdfFont(
            text.fontFamily,
            text.fontWeight,
            isItalic,
          );
          const fontSize = Math.max(1, text.fontSize);
          const lineHeight = fontSize * Math.max(0.8, text.lineHeight);
          const maxWidth = widthPt;
          const contentText =
            text.textTransform === "uppercase"
              ? text.text.toUpperCase()
              : text.text;
          const lines = wrapTextLines(contentText, font, fontSize, maxWidth);
          const color = hexToRgb(text.color) ?? hexToRgb("#122056")!;
          const highlight = text.textHighlight
            ? hexToRgb(text.textHighlight)
            : null;

          if (highlight) {
            const rectOrigin = rotatedOrigin(
              originX,
              topY - heightPt,
              widthPt,
              heightPt,
              text.rotation,
            );
            pdfPage.drawRectangle({
              x: rectOrigin.x,
              y: rectOrigin.y,
              width: widthPt,
              height: heightPt,
              color: highlight,
              opacity: text.opacity,
              rotate: rotation,
            });
          }

          const centerX = originX + widthPt / 2;
          const centerY = topY - heightPt / 2;
          const theta = (-text.rotation * Math.PI) / 180;
          const cos = Math.cos(theta);
          const sin = Math.sin(theta);

          if (text.curvedText && contentText) {
            const wPx = Math.min(
              MAX_RASTER_EDGE,
              Math.max(64, Math.round((text.width / 25.4) * dpi)),
            );
            const hPx = Math.min(
              MAX_RASTER_EDGE,
              Math.max(64, Math.round((text.height / 25.4) * dpi)),
            );
            const pxPerPt = wPx / Math.max(1, widthPt);
            const fontSizePx = fontSize * pxPerPt;
            const curvePath = buildCurvedTextPath(
              wPx,
              hPx,
              text.curveRadius ?? DEFAULT_CURVE_ARC,
            );
            const padPx = Math.max(
              0,
              Math.ceil(fontSizePx * 1.6 - curvePath.minY),
              Math.ceil(curvePath.maxY + fontSizePx * 1.6 - hPx),
            );
            const totalHPx = Math.min(MAX_RASTER_EDGE, hPx + 2 * padPx);
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${wPx}" height="${totalHPx}" viewBox="0 ${-padPx} ${wPx} ${totalHPx}">
              <defs><path id="c" d="${curvePath.d}"/></defs>
              <text fill="${text.color}" font-family="${text.fontFamily}, sans-serif" font-size="${fontSizePx}" font-weight="${text.fontWeight}" font-style="${isItalic ? "italic" : "normal"}">
                <textPath href="#c" startOffset="${text.align === "center" ? "50%" : text.align === "right" ? "100%" : "0%"}" text-anchor="${text.align === "center" ? "middle" : text.align === "right" ? "end" : "start"}">${contentText.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</textPath>
              </text>
            </svg>`;
            try {
              const img = await loadImageElement(
                `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
              );
              const canvas = window.document.createElement("canvas");
              canvas.width = wPx;
              canvas.height = totalHPx;
              const ctx = canvas.getContext("2d");
              if (ctx) {
                ctx.drawImage(img, 0, 0, wPx, totalHPx);
                const encoded = await canvasToEncodedBytes(canvas, "image/png", 1);
                if (encoded) {
                  const png = await document.embedPng(encoded.bytes);
                  const padPt = padPx / pxPerPt;
                  const x = originX;
                  const y = topY - heightPt - padPt;
                  const drawHeightPt = heightPt + 2 * padPt;
                  const origin = rotatedOrigin(
                    x,
                    y,
                    widthPt,
                    drawHeightPt,
                    text.rotation,
                  );
                  pdfPage.drawImage(png, {
                    x: origin.x,
                    y: origin.y,
                    width: widthPt,
                    height: drawHeightPt,
                    opacity: text.opacity,
                    rotate: rotation,
                  });
                  continue;
                }
              }
            } catch {
              /* fall back to standard text */
            }
          }

          lines.forEach((line, index) => {
            const lineWidth = font.widthOfTextAtSize(line, fontSize);
            let x = originX;
            if (text.align === "center") x += (widthPt - lineWidth) / 2;
            if (text.align === "right") x += widthPt - lineWidth;
            let y = topY - fontSize - index * lineHeight;

            if (text.rotation) {
              const offsetX = x - centerX;
              const offsetY = y - centerY;
              x = centerX + offsetX * cos - offsetY * sin;
              y = centerY + offsetX * sin + offsetY * cos;
            }

            if (text.textShadow) {
              pdfPage.drawText(line, {
                x: x + 1,
                y: y - 1,
                size: fontSize,
                font,
                color: hexToRgb("#122056")!,
                opacity: text.opacity * 0.28,
                rotate: text.rotation ? degrees(-text.rotation) : undefined,
              });
            }

            pdfPage.drawText(line, {
              x,
              y,
              size: fontSize,
              font,
              color,
              opacity: text.opacity,
              rotate: text.rotation ? degrees(-text.rotation) : undefined,
            });

            if (text.textDecoration === "underline" && lineWidth > 0) {
              pdfPage.drawLine({
                start: { x, y: y - Math.max(1, fontSize * 0.1) },
                end: { x: x + lineWidth, y: y - Math.max(1, fontSize * 0.1) },
                thickness: Math.max(0.6, fontSize * 0.06),
                color,
                opacity: text.opacity,
              });
            }
          });
          continue;
        }

        if (element.type === "image") {
          const image = element as ImageElement;
          const encoded = await rasterizeImage(
            image,
            dpi,
            quality,
            workerSession,
            signal,
          );
          if (!encoded) continue;
          const embedded =
            encoded.mime === "image/jpeg"
              ? await document.embedJpg(encoded.bytes)
              : await document.embedPng(encoded.bytes);
          const x = originX;
          const y = topY - heightPt;
          const origin = rotatedOrigin(
            x,
            y,
            widthPt,
            heightPt,
            image.rotation,
          );
          if (image.shadow) {
            const shadowRgb = hexToRgb("#122056");
            if (shadowRgb) {
              pdfPage.drawRectangle({
                x: origin.x + 1.5,
                y: origin.y - 2.5,
                width: widthPt,
                height: heightPt,
                color: shadowRgb,
                opacity: image.opacity * 0.16,
                rotate: rotation,
              });
            }
          }
          pdfPage.drawImage(embedded, {
            x: origin.x,
            y: origin.y,
            width: widthPt,
            height: heightPt,
            opacity: image.opacity,
            rotate: rotation,
          });
          continue;
        }

        if (element.type === "sticker") {
          const sticker = element as StickerElement;
          const bytes = await rasterizeSticker(sticker, dpi);
          if (!bytes) continue;
          const png = await document.embedPng(bytes);
          const x = originX;
          const y = topY - heightPt;
          const origin = rotatedOrigin(
            x,
            y,
            widthPt,
            heightPt,
            sticker.rotation,
          );
          pdfPage.drawImage(png, {
            x: origin.x,
            y: origin.y,
            width: widthPt,
            height: heightPt,
            opacity: sticker.opacity,
            rotate: rotation,
          });
          continue;
        }

        if (element.type === "qr") {
          const qr = element as QrElement;
          const x = originX;
          const y = topY - heightPt;
          const bgRgb = hexToRgb(qr.background);
          const fgRgb = hexToRgb(qr.foreground) ?? hexToRgb("#122056")!;
          const centerX = x + widthPt / 2;
          const centerY = y + heightPt / 2;
          const theta = (-qr.rotation * Math.PI) / 180;
          const cos = Math.cos(theta);
          const sin = Math.sin(theta);

          if (bgRgb) {
            const bgOrigin = rotatedOrigin(
              x,
              y,
              widthPt,
              heightPt,
              qr.rotation,
            );
            pdfPage.drawRectangle({
              x: bgOrigin.x,
              y: bgOrigin.y,
              width: widthPt,
              height: heightPt,
              color: bgRgb,
              opacity: qr.opacity,
              rotate: rotation,
            });
          }

          const matrix = getQrMatrix(qr.value, qr.errorCorrection);
          if (matrix) {
            const count = matrix.length;
            const quietZone = 4;
            const total = count + quietZone * 2;
            const mod = Math.min(widthPt, heightPt) / total;
            const offsetX = (widthPt - mod * total) / 2;
            const offsetYTop = (heightPt - mod * total) / 2;

            for (let row = 0; row < count; row += 1) {
              const line = matrix[row]!;
              for (let col = 0; col < count; col += 1) {
                if (!line[col]) continue;
                const mx = x + offsetX + (col + quietZone) * mod;
                const my = topY - offsetYTop - (row + 1 + quietZone) * mod;
                const dx = mx - centerX;
                const dy = my - centerY;
                const rx = qr.rotation ? centerX + dx * cos - dy * sin : mx;
                const ry = qr.rotation ? centerY + dx * sin + dy * cos : my;
                pdfPage.drawRectangle({
                  x: rx,
                  y: ry,
                  width: mod * 1.02,
                  height: mod * 1.02,
                  color: fgRgb,
                  opacity: qr.opacity,
                  rotate: rotation,
                });
              }
            }
          }
        }
      }
    };

    const drawSpineStrip = (
      pdfPage: PdfPage,
      coverPage: Page,
      originXPt: number,
      originYPt: number,
      spineWidthPt: number,
      heightPt: number,
    ) => {
      const spineBackground = resolvePageBackground(coverPage);
      const spineRgb = hexToRgb(spineBackground.baseColor) ?? hexToRgb("#122056")!;
      pdfPage.drawRectangle({
        x: originXPt,
        y: originYPt,
        width: spineWidthPt,
        height: heightPt,
        color: spineRgb,
      });

      const spineText = (project.spineText ?? project.name).trim();
      if (!spineText) return;

      const textRgb =
        spineBackground.tone === "dark"
          ? hexToRgb("#FFFFFF")!
          : hexToRgb("#122056")!;
      const fontSize = Math.min(spineWidthPt * 0.52, 8.5);
      const textWidth = bold.widthOfTextAtSize(spineText, fontSize);
      pdfPage.drawText(spineText, {
        x: originXPt + spineWidthPt / 2 + fontSize * 0.32,
        y: originYPt + Math.max(12, (heightPt - textWidth) / 2),
        size: fontSize,
        font: bold,
        color: textRgb,
        opacity: 0.78,
        rotate: degrees(90),
      });
    };

    for (let i = 0; i < selectedSheets.length; i += 1) {
      const sheet = selectedSheets[i]!;
      throwIfAborted(signal);

      onProgress?.({
        phase: "rendering",
        percent: Math.round(10 + ((i + 0.1) / selectedSheets.length) * 78),
        currentSheet: i + 1,
        totalSheets: selectedSheets.length,
        label: `Rendering ${sheet.label} (${i + 1} of ${selectedSheets.length})…`,
      });
      await yieldToUi(signal);

      const trimWidthMm =
        sheet.kind === "single"
          ? sheet.widthMm
          : sheet.kind === "spine"
            ? sheet.spineWidthMm
            : sheet.kind === "spread-cover"
              ? sheet.pageWidthMm * 2 + sheet.spineWidthMm
              : sheet.pageWidthMm * 2;
      const trimHeightMm = sheet.heightMm;

      const trimWidthPt = mmToPt(trimWidthMm);
      const trimHeightPt = mmToPt(trimHeightMm);
      const mediaWidth = trimWidthPt + bleedPt * 2 + markPt * 2;
      const mediaHeight = trimHeightPt + bleedPt * 2 + markPt * 2;

      const pdfPage: PdfPage = document.addPage([mediaWidth, mediaHeight]);
      const trimX = markPt + bleedPt;
      const trimY = markPt + bleedPt;
      const trimTopY = trimY + trimHeightPt;

      pdfPage.setBleedBox(
        markPt,
        markPt,
        trimWidthPt + bleedPt * 2,
        trimHeightPt + bleedPt * 2,
      );
      pdfPage.setTrimBox(trimX, trimY, trimWidthPt, trimHeightPt);

      if (sheet.kind === "single") {
        await drawPageBackgroundRegion(
          pdfPage,
          sheet.page,
          markPt,
          markPt,
          trimWidthMm + bleedMm * 2,
          trimHeightMm + bleedMm * 2,
        );
        const spanningFromLeft = sheet.leftPartner
          ? sheet.leftPartner.elements
              .filter((el) => !el.hidden && Boolean(el.spanSpread))
              .map((el) => ({ ...el, x: el.x - project.pageSize.w }))
          : [];
        const ordered = [...spanningFromLeft, ...sheet.page.elements].sort(
          (a, b) => a.zIndex - b.zIndex,
        );
        await drawElementsIntoRegion(pdfPage, ordered, trimX, trimTopY);
        if (cropMarks) {
          drawCropAndFoldMarks(
            pdfPage,
            trimX,
            trimY,
            trimWidthPt,
            trimHeightPt,
            markPt,
            bleedPt,
          );
        }
      } else if (sheet.kind === "spine") {
        drawSpineStrip(
          pdfPage,
          sheet.coverPage,
          markPt,
          markPt,
          trimWidthPt + bleedPt * 2,
          trimHeightPt + bleedPt * 2,
        );
        // Re-center vertical spine text inside trim bounds when bleed exists.
        if (bleedPt > 0) {
          drawSpineStrip(
            pdfPage,
            sheet.coverPage,
            trimX,
            trimY,
            trimWidthPt,
            trimHeightPt,
          );
        }
        if (cropMarks) {
          drawCropAndFoldMarks(
            pdfPage,
            trimX,
            trimY,
            trimWidthPt,
            trimHeightPt,
            markPt,
            bleedPt,
          );
        }
      } else if (sheet.kind === "spread-cover") {
        const halfW = sheet.pageWidthMm;
        const spineW = sheet.spineWidthMm;
        const halfWPt = mmToPt(halfW);
        const spineWPt = mmToPt(spineW);

        // Back cover left half (including left bleed).
        await drawPageBackgroundRegion(
          pdfPage,
          sheet.backPage,
          markPt,
          markPt,
          halfW + bleedMm,
          trimHeightMm + bleedMm * 2,
        );
        // Front cover right half (including right bleed).
        await drawPageBackgroundRegion(
          pdfPage,
          sheet.frontPage,
          trimX + halfWPt + spineWPt,
          markPt,
          halfW + bleedMm,
          trimHeightMm + bleedMm * 2,
        );
        // Spine band spanning full height including top/bottom bleed.
        if (spineWPt > 0) {
          drawSpineStrip(
            pdfPage,
            sheet.backPage,
            trimX + halfWPt,
            markPt,
            spineWPt,
            trimHeightPt + bleedPt * 2,
          );
        }

        const backElements = [...sheet.backPage.elements]
          .filter((el) => !el.hidden)
          .sort((a, b) => a.zIndex - b.zIndex);
        await drawElementsIntoRegion(pdfPage, backElements, trimX, trimTopY);

        const frontElements = [...sheet.frontPage.elements]
          .filter((el) => !el.hidden)
          .sort((a, b) => a.zIndex - b.zIndex);
        await drawElementsIntoRegion(
          pdfPage,
          frontElements,
          trimX + halfWPt + spineWPt,
          trimTopY,
        );

        if (cropMarks) {
          const foldMarks =
            spineWPt > 0 ? [halfWPt, halfWPt + spineWPt] : [halfWPt];
          drawCropAndFoldMarks(
            pdfPage,
            trimX,
            trimY,
            trimWidthPt,
            trimHeightPt,
            markPt,
            bleedPt,
            foldMarks,
          );
        }
      } else {
        const halfW = sheet.pageWidthMm;
        const halfWPt = mmToPt(halfW);

        if (sheet.leftPage && !sheet.leftPage.isEndPaper) {
          await drawPageBackgroundRegion(
            pdfPage,
            sheet.leftPage,
            markPt,
            markPt,
            halfW + bleedMm,
            trimHeightMm + bleedMm * 2,
          );
        } else {
          pdfPage.drawRectangle({
            x: markPt,
            y: markPt,
            width: halfWPt + bleedPt,
            height: trimHeightPt + bleedPt * 2,
            color: hexToRgb("#FFFFFF")!,
          });
        }

        if (sheet.rightPage && !sheet.rightPage.isEndPaper) {
          await drawPageBackgroundRegion(
            pdfPage,
            sheet.rightPage,
            trimX + halfWPt,
            markPt,
            halfW + bleedMm,
            trimHeightMm + bleedMm * 2,
          );
        } else {
          pdfPage.drawRectangle({
            x: trimX + halfWPt,
            y: markPt,
            width: halfWPt + bleedPt,
            height: trimHeightPt + bleedPt * 2,
            color: hexToRgb("#FFFFFF")!,
          });
        }

        if (sheet.leftPage && !sheet.leftPage.isEndPaper) {
          const leftOrdered = [...sheet.leftPage.elements]
            .filter((el) => !el.hidden)
            .sort((a, b) => a.zIndex - b.zIndex);
          await drawElementsIntoRegion(pdfPage, leftOrdered, trimX, trimTopY);
        }

        if (sheet.rightPage && !sheet.rightPage.isEndPaper) {
          const rightOrdered = [...sheet.rightPage.elements]
            .filter((el) => !el.hidden)
            .sort((a, b) => a.zIndex - b.zIndex);
          await drawElementsIntoRegion(
            pdfPage,
            rightOrdered,
            trimX + halfWPt,
            trimTopY,
          );
        }

        if (cropMarks) {
          drawCropAndFoldMarks(
            pdfPage,
            trimX,
            trimY,
            trimWidthPt,
            trimHeightPt,
            markPt,
            bleedPt,
            [halfWPt],
          );
        }
      }
    }

    onProgress?.({
      phase: "saving",
      percent: 92,
      currentSheet: selectedSheets.length,
      totalSheets: selectedSheets.length,
      label: "Assembling print PDF…",
    });
    await yieldToUi(signal);

    const bytes = await document.save();
    throwIfAborted(signal);

    onProgress?.({
      phase: "saving",
      percent: 100,
      currentSheet: selectedSheets.length,
      totalSheets: selectedSheets.length,
      label: "Download ready",
    });

    return bytes;
  } finally {
    workerSession?.dispose();
  }
}
