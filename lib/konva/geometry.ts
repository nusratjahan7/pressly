import type { PageSize } from "@/types";

export const SAFE_MARGIN_MM = 5;

export interface SpreadLayout {
  pageWidth: number;
  pageHeight: number;
  pageCount: number;
  spreadWidth: number;
  spreadHeight: number;
  /** Horizontal position of the spine, or null for a single-page spread. */
  spineX: number | null;
}

export function getSpreadLayout(
  pageSize: PageSize,
  pageCount: number,
): SpreadLayout {
  const count = Math.max(1, pageCount);
  return {
    pageWidth: pageSize.w,
    pageHeight: pageSize.h,
    pageCount: count,
    spreadWidth: pageSize.w * count,
    spreadHeight: pageSize.h,
    spineX: count > 1 ? pageSize.w : null,
  };
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
  return Math.min(SAFE_MARGIN_MM, Math.min(pageSize.w, pageSize.h) * 0.15);
}
