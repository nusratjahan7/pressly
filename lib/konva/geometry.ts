import type { PageSize } from "@/types";

export const SAFE_MARGIN_MM = 5;

export interface SpreadLayout {
  pageWidth: number;
  pageHeight: number;
  pageCount: number;
  /** Spine width in millimetres (non-zero on wrap-around covers). */
  spineWidth: number;
  spreadWidth: number;
  spreadHeight: number;
  /** Horizontal position of the spine, or null for a single-page spread. */
  spineX: number | null;
}

export function getSpreadLayout(
  pageSize: PageSize,
  pageCount: number,
  spineWidth = 0,
): SpreadLayout {
  const count = Math.max(1, pageCount);
  const effectiveSpine = count > 1 ? Math.max(0, spineWidth) : 0;
  return {
    pageWidth: pageSize.w,
    pageHeight: pageSize.h,
    pageCount: count,
    spineWidth: effectiveSpine,
    spreadWidth: pageSize.w * count + effectiveSpine,
    spreadHeight: pageSize.h,
    spineX: count > 1 ? pageSize.w : null,
  };
}

/** Horizontal offset of a page within its spread, accounting for any spine. */
export function getPageOffsetX(pagePositionInSpread: number, layout: SpreadLayout) {
  if (pagePositionInSpread <= 0) return 0;
  return pagePositionInSpread * layout.pageWidth + layout.spineWidth;
}

export function getFitScale(
  layout: SpreadLayout,
  containerWidth: number,
  containerHeight: number,
) {
  if (containerWidth <= 0 || containerHeight <= 0) return 0;
  const horizontalPadding = containerWidth < 640 ? 48 : 128;
  const verticalPadding = containerHeight < 560 ? 48 : 112;
  const availableWidth = Math.max(80, containerWidth - horizontalPadding);
  const availableHeight = Math.max(
    80,
    containerHeight - verticalPadding - 30,
  );
  return Math.min(
    availableWidth / layout.spreadWidth,
    availableHeight / layout.spreadHeight,
  );
}

export function getDefaultViewCenter(layout: SpreadLayout) {
  return { x: layout.spreadWidth / 2, y: layout.spreadHeight / 2 };
}

export interface ViewportTransform {
  scale: number;
  panX: number;
  panY: number;
}

export function getViewportTransform(
  layout: SpreadLayout,
  fitScale: number,
  zoom: number,
  center: { x: number; y: number },
  containerWidth: number,
  containerHeight: number,
): ViewportTransform {
  const scale = Math.max(0.0001, fitScale * zoom);
  return {
    scale,
    panX: containerWidth / 2 - center.x * scale,
    panY: containerHeight / 2 - center.y * scale,
  };
}

/** Converts a container-relative screen point into spread millimetres. */
export function screenToSpread(
  screenX: number,
  screenY: number,
  transform: ViewportTransform,
) {
  return {
    x: (screenX - transform.panX) / transform.scale,
    y: (screenY - transform.panY) / transform.scale,
  };
}

export function getSafeMarginInset(pageSize: PageSize) {
  const configured = pageSize.safeMargin;
  if (typeof configured === "number" && configured > 0) {
    // Never let the guide consume more than a fifth of the page.
    return Math.min(configured, Math.min(pageSize.w, pageSize.h) * 0.2);
  }
  return Math.min(SAFE_MARGIN_MM, Math.min(pageSize.w, pageSize.h) * 0.15);
}
