import type { Page, PageSize } from "@/types";

/**
 * Builds a cache key that changes whenever anything visible on the page
 * changes. Cheaper and more reliable than deep-comparing elements.
 */
export function getCacheKey(page: Page, pageSize: PageSize, width: number) {
  return [
    page.id,
    page.backgroundId,
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
    ];
    if (element.type === "text") {
      parts.push(element.text, element.fontSize, element.color, element.align, element.fontWeight, element.lineHeight, element.letterSpacing, element.isPlaceholder ? 1 : 0);
    } else if (element.type === "image") {
      parts.push(element.src.slice(0, 64), element.fit, element.radius, element.cropScale ?? 1, element.cropX ?? 0, element.cropY ?? 0);
    } else if (element.type === "shape") {
      parts.push(element.shape, element.fill, element.stroke, element.strokeWidth, element.radius);
    } else if (element.type === "sticker") {
      parts.push(element.stickerId, element.color);
    } else if (element.type === "qr") {
      parts.push(element.value, element.foreground, element.background);
    }
    const row = parts.join(",");
    for (let index = 0; index < row.length; index += 1) {
      hash = (hash * 31 + row.charCodeAt(index)) | 0;
    }
  }
  return hash;
}
