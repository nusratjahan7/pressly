import type { Page, PageSize } from "@/types";

/**
 * Builds a cache key that changes whenever anything visible on the page
 * changes. Cheaper and more reliable than deep-comparing elements.
 */
export function getCacheKey(page: Page, pageSize: PageSize, width: number) {
  return [
    page.id,
    page.backgroundId,
    page.background
      ? `${page.background.kind}:${page.background.color}:${page.background.gradient?.from ?? ""}:${page.background.gradient?.to ?? ""}:${page.background.gradient?.angle ?? 0}:${page.background.patternId ?? ""}:${page.background.imageSrc ?? ""}:${page.background.opacity ?? 1}:${page.background.blur ?? 0}`
      : "",
    page.isEndPaper ? "ep" : "pg",
    page.locked ? "lk" : "ed",
    width,
    pageSize.w,
    pageSize.h,
    // Element count catches additions and removals immediately.
    page.elements.length,
    getElementsSignature(page),
  ].join("|");
}

function getElementsSignature(page: Page) {
  let hash = 0;
  for (const element of page.elements) {
    const parts = [
      element.id,
      element.type,
      element.x,
      element.y,
      element.width,
      element.height,
      element.rotation,
      element.opacity,
      element.zIndex,
      element.hidden ? 1 : 0,
      element.flipX ? 1 : 0,
      element.flipY ? 1 : 0,
    ];
    if (element.type === "text") {
      parts.push(
        element.text,
        element.fontFamily,
        element.fontSize,
        element.color,
        element.align,
        element.fontWeight,
        element.fontStyle ?? "normal",
        element.textDecoration ?? "none",
        element.textTransform ?? "none",
        element.lineHeight,
        element.letterSpacing,
        element.isPlaceholder ? 1 : 0,
        element.textHighlight ?? "",
        element.textShadow ? 1 : 0,
        element.textOutline ? 1 : 0,
        element.curvedText ? element.curveRadius ?? 65 : 0,
      );
    } else if (element.type === "image") {
      parts.push(
        element.src.slice(0, 64),
        element.fit,
        element.radius,
        element.cropScale ?? 1,
        element.cropX ?? 0,
        element.cropY ?? 0,
        element.flipX ? 1 : 0,
        element.flipY ? 1 : 0,
        element.brightness ?? 100,
        element.contrast ?? 100,
        element.saturation ?? 100,
        element.grayscale ?? 0,
        element.blur ?? 0,
        element.borderWidth ?? 0,
        element.borderColor ?? "",
        element.shadow ? 1 : 0,
      );
    } else if (element.type === "shape") {
      parts.push(
        element.shape,
        element.fill,
        element.fillGradient?.enabled ? 1 : 0,
        element.fillGradient?.from ?? "",
        element.fillGradient?.to ?? "",
        element.fillGradient?.angle ?? 0,
        element.stroke,
        element.strokeWidth,
        element.radius,
        element.sides ?? 0,
        element.innerRadiusRatio ?? 0,
        element.shadow ? 1 : 0,
      );
    } else if (element.type === "sticker") {
      parts.push(
        element.stickerId,
        element.color,
        element.src ?? "",
        element.shadow ? 1 : 0,
      );
    } else if (element.type === "qr") {
      parts.push(
        element.value,
        element.foreground,
        element.background,
        element.errorCorrection,
      );
    }
    const row = parts.join(",");
    for (let index = 0; index < row.length; index += 1) {
      hash = (hash * 31 + row.charCodeAt(index)) | 0;
    }
  }
  return hash;
}
