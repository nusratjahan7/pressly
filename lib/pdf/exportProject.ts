import type {
  ImageElement,
  Project,
  ShapeElement,
  StickerElement,
  TextElement,
} from "@/types";
import { getBackground, type BackgroundPattern } from "@/lib/backgrounds";
import { fetchFontBytesForPdf } from "@/lib/fonts";
import { buildCssFilterString, resolveMediaUrl } from "@/lib/mediaStorage";
import { getPdfExportPages } from "@/lib/spreads";
import { getSticker, stickerToSvgString } from "@/lib/stickers";
import { buildCurvedTextPath, DEFAULT_CURVE_ARC } from "@/lib/textCurve";
import { mmToPt } from "@/lib/units";

export interface PdfExportOptions {
  includeBleed?: boolean;
}

type PdfDocument = import("pdf-lib").PDFDocument;
type PdfPage = import("pdf-lib").PDFPage;
type PdfFont = import("pdf-lib").PDFFont;
type RGB = import("pdf-lib").RGB;

const PRINT_DPI = 300;
const MAX_RASTER_EDGE = 3200;

function drawPattern(
  page: PdfPage,
  pattern: {
    kind: BackgroundPattern;
    color: string;
    opacity: number;
    spacingMm: number;
  },
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
          x,
          y,
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
        start: { x: 0, y },
        end: { x: width, y },
        thickness: weight,
        color,
        opacity: pattern.opacity,
      });
    }
    if (pattern.kind === "ruled") return;
    for (let x = spacing; x < width; x += spacing) {
      page.drawLine({
        start: { x, y: 0 },
        end: { x, y: height },
        thickness: weight,
        color,
        opacity: pattern.opacity,
      });
    }
    return;
  }

  for (let x = -height; x < width; x += spacing) {
    page.drawLine({
      start: { x, y: 0 },
      end: { x: x + height, y: height },
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

async function rasterizeImage(
  element: ImageElement,
): Promise<string | null> {
  if (!element.src) return null;
  try {
    const targetWidth = Math.min(
      MAX_RASTER_EDGE,
      Math.max(1, Math.round((element.width / 25.4) * PRINT_DPI)),
    );
    const targetHeight = Math.min(
      MAX_RASTER_EDGE,
      Math.max(1, Math.round((element.height / 25.4) * PRINT_DPI)),
    );
    const image = await loadImageElement(element.src);
    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;
    const context = canvas.getContext("2d");
    if (!context) return null;

    const radiusPx =
      (element.radius / Math.max(element.width, 1)) * targetWidth;
    if (radiusPx > 0) {
      context.beginPath();
      context.roundRect(0, 0, targetWidth, targetHeight, radiusPx);
      context.clip();
    }

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
    const panX = ((element.cropX ?? 0) * Math.max(0, drawWidth - targetWidth)) / 2;
    const panY = ((element.cropY ?? 0) * Math.max(0, drawHeight - targetHeight)) / 2;

    const pxPerMm = targetWidth / Math.max(element.width, 1);
    const filterStr = buildCssFilterString({
      brightness: element.brightness,
      contrast: element.contrast,
      saturation: element.saturation,
      grayscale: element.grayscale,
      blur: element.blur ? element.blur * pxPerMm * 0.35 : 0,
    });

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
    context.drawImage(
      image,
      (targetWidth - drawWidth) / 2 + panX,
      (targetHeight - drawHeight) / 2 + panY,
      drawWidth,
      drawHeight,
    );
    context.restore();

    if (
      element.borderWidth &&
      element.borderWidth > 0 &&
      element.borderColor &&
      element.borderColor !== "transparent"
    ) {
      const bw = element.borderWidth * pxPerMm;
      context.save();
      context.strokeStyle = element.borderColor;
      context.lineWidth = bw;
      if (radiusPx > 0) {
        context.beginPath();
        context.roundRect(bw / 2, bw / 2, targetWidth - bw, targetHeight - bw, radiusPx);
        context.stroke();
      } else {
        context.strokeRect(bw / 2, bw / 2, targetWidth - bw, targetHeight - bw);
      }
      context.restore();
    }

    return canvas.toDataURL("image/png");
  } catch {
    return null;
  }
}

async function rasterizeSticker(
  element: StickerElement,
): Promise<string | null> {
  try {
    const size = Math.min(
      MAX_RASTER_EDGE,
      Math.max(
        64,
        Math.round((Math.max(element.width, element.height) / 25.4) * PRINT_DPI),
      ),
    );
    const definition = getSticker(element.stickerId);
    const svg = stickerToSvgString(definition.id, element.color, size);
    const image = await loadImageElement(
      `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`,
    );
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) return null;
    context.drawImage(image, 0, 0, size, size);
    return canvas.toDataURL("image/png");
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

export async function createProjectPdf(
  project: Project,
  options: PdfExportOptions = {},
): Promise<Uint8Array> {
  const { PDFDocument, StandardFonts, degrees } = await import("pdf-lib");
  const fontkit = (await import("@pdf-lib/fontkit")).default;
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

  const bleedMm = options.includeBleed ? project.pageSize.bleed : 0;
  const bleedPt = mmToPt(bleedMm);
  const trimWidthPt = mmToPt(project.pageSize.w);
  const trimHeightPt = mmToPt(project.pageSize.h);
  const mediaWidth = trimWidthPt + bleedPt * 2;
  const mediaHeight = trimHeightPt + bleedPt * 2;

  const exportPages = getPdfExportPages(project.pages);
  for (const page of exportPages) {
    const pdfPage: PdfPage = document.addPage([mediaWidth, mediaHeight]);
    const background = getBackground(page.backgroundId);
    const backgroundRgb = hexToRgb(background.baseColor);
    if (backgroundRgb) {
      pdfPage.drawRectangle({
        x: 0,
        y: 0,
        width: mediaWidth,
        height: mediaHeight,
        color: backgroundRgb,
      });
    }
    if (background.pdfPattern) {
      drawPattern(
        pdfPage,
        background.pdfPattern,
        mediaWidth,
        mediaHeight,
      );
    }

    const ordered = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);

    for (const element of ordered) {
      if (element.opacity <= 0) continue;

      const originX = bleedPt + mmToPt(element.x);
      const topY = mediaHeight - bleedPt - mmToPt(element.y);
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

        if (shape.shape === "ellipse") {
          pdfPage.drawEllipse({
            x: x + widthPt / 2,
            y: y + heightPt / 2,
            xScale: widthPt / 2,
            yScale: heightPt / 2,
            color: fill ?? undefined,
            borderColor: stroke ?? undefined,
            borderWidth: mmToPt(shape.strokeWidth),
            opacity: shape.opacity,
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
            const start = rotatePoint(x, centerY);
            const end = rotatePoint(x + widthPt, centerY);
            pdfPage.drawLine({
              start,
              end,
              thickness: Math.max(0.5, mmToPt(shape.strokeWidth)),
              color: lineColor,
              opacity: shape.opacity,
            });
          }
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
          const wPx = Math.min(MAX_RASTER_EDGE, Math.max(64, Math.round((text.width / 25.4) * PRINT_DPI)));
          const hPx = Math.min(MAX_RASTER_EDGE, Math.max(64, Math.round((text.height / 25.4) * PRINT_DPI)));
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
            const img = await loadImageElement(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`);
            const canvas = window.document.createElement("canvas");
            canvas.width = wPx;
            canvas.height = totalHPx;
            const ctx = canvas.getContext("2d");
            if (ctx) {
              ctx.drawImage(img, 0, 0, wPx, totalHPx);
              const pngData = canvas.toDataURL("image/png").split(",")[1];
              if (pngData) {
                const png = await document.embedPng(pngData);
                const padPt = padPx / pxPerPt;
                const x = originX;
                const y = topY - heightPt - padPt;
                const drawHeightPt = heightPt + 2 * padPt;
                const origin = rotatedOrigin(x, y, widthPt, drawHeightPt, text.rotation);
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
        const dataUrl = await rasterizeImage(image);
        if (!dataUrl) continue;
        const base64 = dataUrl.split(",")[1];
        if (!base64) continue;
        const png = await document.embedPng(base64);
        const x = originX;
        const y = topY - heightPt;
        const origin = rotatedOrigin(x, y, widthPt, heightPt, image.rotation);
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
        pdfPage.drawImage(png, {
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
        const dataUrl = await rasterizeSticker(sticker);
        if (!dataUrl) continue;
        const base64 = dataUrl.split(",")[1];
        if (!base64) continue;
        const png = await document.embedPng(base64);
        const x = originX;
        const y = topY - heightPt;
        const origin = rotatedOrigin(x, y, widthPt, heightPt, sticker.rotation);
        pdfPage.drawImage(png, {
          x: origin.x,
          y: origin.y,
          width: widthPt,
          height: heightPt,
          opacity: sticker.opacity,
          rotate: rotation,
        });
      }
    }
  }

  return document.save();
}
