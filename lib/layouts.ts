import type { Element, ImageElement, PageSize, TextElement } from "@/types";
import { createImageElement, createTextElement } from "@/lib/elements";
import { round } from "@/lib/units";
import rawLayouts from "@/lib/layouts.json";

export type LayoutScope = "page" | "spread";

export interface LayoutFrame {
  type: "photo" | "text";
  /** Percentage (0–1) of the safe area. */
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutDefinition {
  id: string;
  name: string;
  scope: LayoutScope;
  photoCount: number;
  hasText: boolean;
  frames: LayoutFrame[];
}

export const DEFAULT_FRAME_GAP_MM = 3;

export const LAYOUTS: LayoutDefinition[] = rawLayouts as LayoutDefinition[];

const layoutById = new Map(LAYOUTS.map((layout) => [layout.id, layout]));

export function getLayoutById(id: string | null | undefined): LayoutDefinition | null {
  if (!id) return null;
  return layoutById.get(id) ?? null;
}

/**
 * Returns the N most relevant layouts matching the current photo count.
 */
export function getRelevantLayouts(
  photoCount: number,
  scope: LayoutScope = "page",
  limit = 8,
): LayoutDefinition[] {
  const pool = LAYOUTS.filter((layout) => layout.scope === scope);
  const target = Math.max(1, photoCount);
  const ranked = [...pool].sort((a, b) => {
    const diffA = Math.abs(a.photoCount - target);
    const diffB = Math.abs(b.photoCount - target);
    if (diffA !== diffB) return diffA - diffB;
    if (a.hasText !== b.hasText) return a.hasText ? 1 : -1;
    return 0;
  });
  return ranked.slice(0, limit);
}

/**
 * Converts a normalized frame (0–1) into millimetre geometry inside the safe
 * area defined by `marginMm`, inserting exact `gapMm` gutters between
 * interior edges.
 */
export function computeFrameRectMm(
  frame: LayoutFrame,
  areaWidth: number,
  areaHeight: number,
  gapMm: number,
  marginMm: number,
): { x: number; y: number; width: number; height: number } {
  const safeX = Math.max(0, Math.min(marginMm, areaWidth * 0.25));
  const safeY = Math.max(0, Math.min(marginMm, areaHeight * 0.25));
  const safeW = Math.max(12, areaWidth - safeX * 2);
  const safeH = Math.max(12, areaHeight - safeY * 2);

  const halfGap = Math.max(0, gapMm) / 2;
  const insetLeft = frame.x > 0.001 ? halfGap : 0;
  const insetRight = frame.x + frame.w < 0.999 ? halfGap : 0;
  const insetTop = frame.y > 0.001 ? halfGap : 0;
  const insetBottom = frame.y + frame.h < 0.999 ? halfGap : 0;

  const x = safeX + frame.x * safeW + insetLeft;
  const y = safeY + frame.y * safeH + insetTop;
  const width = Math.max(8, frame.w * safeW - insetLeft - insetRight);
  const height = Math.max(8, frame.h * safeH - insetTop - insetBottom);

  return {
    x: round(x, 2),
    y: round(y, 2),
    width: round(width, 2),
    height: round(height, 2),
  };
}

export interface ReflowPhoto {
  src: string;
  alt: string;
  fit?: "cover" | "contain";
  cropScale?: number;
  cropX?: number;
  cropY?: number;
}

function createTextFrameElement(
  rect: { x: number; y: number; width: number; height: number },
  zIndex: number,
  existingText?: string,
): TextElement {
  const hasExisting = Boolean(existingText && existingText.trim().length > 0);
  const fontSize = Math.max(12, Math.min(34, Math.round(rect.height * 0.65)));
  return createTextElement(
    { ...rect, zIndex },
    {
      text: hasExisting ? existingText! : "text",
      fontSize,
      fontWeight: 700,
      align: "center",
      color: hasExisting ? "#122056" : "#D4A3B8",
      lineHeight: 1.15,
      isPlaceholder: !hasExisting,
    },
  );
}

/**
 * Materializes a single-page layout into ImageElement / TextElement frames,
 * reflowing existing photos into frames largest-first.
 */
export function buildPageLayoutElements(
  layout: LayoutDefinition,
  pageSize: PageSize,
  gapMm = DEFAULT_FRAME_GAP_MM,
  marginMm = pageSize.safeMargin,
  existingPhotos: ReflowPhoto[] = [],
  existingTexts: string[] = [],
): Element[] {
  const rects = layout.frames.map((frame, index) => ({
    index,
    type: frame.type,
    rect: computeFrameRectMm(frame, pageSize.w, pageSize.h, gapMm, marginMm),
  }));

  const photoSlots = rects
    .filter((item) => item.type === "photo")
    .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);

  const photoMap = new Map<number, ReflowPhoto>();
  photoSlots.forEach((slot, order) => {
    const photo = existingPhotos[order];
    if (photo) photoMap.set(slot.index, photo);
  });

  let textCursor = 0;
  return rects.map(({ index, type, rect }) => {
    if (type === "text") {
      const text = existingTexts[textCursor++];
      return createTextFrameElement(rect, index, text);
    }
    const photo = photoMap.get(index);
    return createImageElement(
      { ...rect, zIndex: index },
      {
        src: photo?.src ?? "",
        alt: photo?.alt ?? "",
        fit: photo?.fit ?? "cover",
        cropScale: photo?.cropScale ?? 1,
        cropX: photo?.cropX ?? 0,
        cropY: photo?.cropY ?? 0,
      },
    );
  });
}

/**
 * Materializes a spread-spanning layout across the left and right pages of a
 * spread, splitting frames cleanly onto their containing page.
 */
export function buildSpreadLayoutElements(
  layout: LayoutDefinition,
  pageSize: PageSize,
  gapMm = DEFAULT_FRAME_GAP_MM,
  marginMm = pageSize.safeMargin,
  existingPhotos: ReflowPhoto[] = [],
  existingTexts: string[] = [],
): { left: Element[]; right: Element[] } {
  const spreadWidth = pageSize.w * 2;
  const rects = layout.frames.map((frame, index) => ({
    index,
    type: frame.type,
    rect: computeFrameRectMm(frame, spreadWidth, pageSize.h, gapMm, marginMm),
  }));

  const photoSlots = rects
    .filter((item) => item.type === "photo")
    .sort((a, b) => b.rect.width * b.rect.height - a.rect.width * a.rect.height);

  const photoMap = new Map<number, ReflowPhoto>();
  photoSlots.forEach((slot, order) => {
    const photo = existingPhotos[order];
    if (photo) photoMap.set(slot.index, photo);
  });

  const left: Element[] = [];
  const right: Element[] = [];
  let textCursor = 0;

  for (const { index, type, rect } of rects) {
    const crossesSpine = rect.x < pageSize.w && rect.x + rect.width > pageSize.w;
    if (crossesSpine) {
      // Split across spine cleanly so both halves remain independently editable.
      const leftWidth = round(Math.max(8, pageSize.w - gapMm / 2 - rect.x), 2);
      const rightX = round(gapMm / 2, 2);
      const rightWidth = round(
        Math.max(8, rect.x + rect.width - pageSize.w - gapMm / 2),
        2,
      );
      if (type === "text") {
        const text = existingTexts[textCursor++];
        left.push(
          createTextFrameElement(
            { x: rect.x, y: rect.y, width: leftWidth, height: rect.height },
            left.length,
            text,
          ),
        );
      } else {
        const photo = photoMap.get(index);
        left.push(
          createImageElement(
            {
              x: rect.x,
              y: rect.y,
              width: leftWidth,
              height: rect.height,
              zIndex: left.length,
            },
            {
              src: photo?.src ?? "",
              alt: photo?.alt ?? "",
              fit: photo?.fit ?? "cover",
              cropScale: photo?.cropScale ?? 1,
              cropX: photo?.cropX ?? 0,
              cropY: photo?.cropY ?? 0,
            },
          ),
        );
        right.push(
          createImageElement(
            {
              x: rightX,
              y: rect.y,
              width: rightWidth,
              height: rect.height,
              zIndex: right.length,
            },
            { src: "", alt: "", fit: "cover" },
          ),
        );
      }
      continue;
    }

    const onRight = rect.x + rect.width / 2 >= pageSize.w;
    const localRect = {
      x: onRight ? round(rect.x - pageSize.w, 2) : rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height,
    };
    const target = onRight ? right : left;

    if (type === "text") {
      const text = existingTexts[textCursor++];
      target.push(createTextFrameElement(localRect, target.length, text));
    } else {
      const photo = photoMap.get(index);
      target.push(
        createImageElement(
          { ...localRect, zIndex: target.length },
          {
            src: photo?.src ?? "",
            alt: photo?.alt ?? "",
            fit: photo?.fit ?? "cover",
            cropScale: photo?.cropScale ?? 1,
            cropX: photo?.cropX ?? 0,
            cropY: photo?.cropY ?? 0,
          },
        ),
      );
    }
  }

  return { left, right };
}

export interface LayoutGutter {
  id: string;
  axis: "vertical" | "horizontal";
  /** Position along the perpendicular axis in mm (center of gutter). */
  pos: number;
  /** Span start & end along the parallel axis in mm. */
  start: number;
  end: number;
  /** Gutter width in mm. */
  gap: number;
  /** Elements on the negative side (left or top) and positive side (right or bottom). */
  beforeIds: string[];
  afterIds: string[];
  /** Allowed drag delta bounds in mm so no frame shrinks below 10mm. */
  minDelta: number;
  maxDelta: number;
}

const MIN_FRAME_MM = 10;

/**
 * Detects draggable gutters between adjacent frames on a page so dragging
 * a gutter resizes neighboring frames live while preserving the gap.
 */
export function findLayoutGutters(elements: Element[]): LayoutGutter[] {
  const boxes = elements.filter(
    (el) => !el.locked && el.rotation === 0 && (el.type === "image" || el.type === "text"),
  );
  if (boxes.length < 2) return [];

  const gutters: LayoutGutter[] = [];
  const seen = new Set<string>();

  // Vertical gutters (left | right)
  for (const a of boxes) {
    const aRight = a.x + a.width;
    for (const b of boxes) {
      if (a.id === b.id) continue;
      const gap = b.x - aRight;
      if (gap < 0.4 || gap > 14) continue;
      const overlapStart = Math.max(a.y, b.y);
      const overlapEnd = Math.min(a.y + a.height, b.y + b.height);
      if (overlapEnd - overlapStart < 6) continue;

      const center = round((aRight + b.x) / 2, 2);
      const key = `v:${Math.round(center * 2)}`;
      if (seen.has(key)) continue;

      const before = boxes.filter(
        (el) =>
          Math.abs(el.x + el.width - aRight) <= 1.2 &&
          Math.min(el.y + el.height, overlapEnd) - Math.max(el.y, overlapStart) > 2,
      );
      const after = boxes.filter(
        (el) =>
          Math.abs(el.x - b.x) <= 1.2 &&
          Math.min(el.y + el.height, overlapEnd) - Math.max(el.y, overlapStart) > 2,
      );
      if (before.length === 0 || after.length === 0) continue;

      const start = Math.min(...before.map((e) => e.y), ...after.map((e) => e.y));
      const end = Math.max(
        ...before.map((e) => e.y + e.height),
        ...after.map((e) => e.y + e.height),
      );
      const minDelta = -Math.min(...before.map((e) => e.width - MIN_FRAME_MM));
      const maxDelta = Math.min(...after.map((e) => e.width - MIN_FRAME_MM));
      if (minDelta >= maxDelta) continue;

      seen.add(key);
      gutters.push({
        id: key,
        axis: "vertical",
        pos: center,
        start,
        end,
        gap,
        beforeIds: before.map((e) => e.id),
        afterIds: after.map((e) => e.id),
        minDelta,
        maxDelta,
      });
    }
  }

  // Horizontal gutters (top / bottom)
  for (const a of boxes) {
    const aBottom = a.y + a.height;
    for (const b of boxes) {
      if (a.id === b.id) continue;
      const gap = b.y - aBottom;
      if (gap < 0.4 || gap > 14) continue;
      const overlapStart = Math.max(a.x, b.x);
      const overlapEnd = Math.min(a.x + a.width, b.x + b.width);
      if (overlapEnd - overlapStart < 6) continue;

      const center = round((aBottom + b.y) / 2, 2);
      const key = `h:${Math.round(center * 2)}`;
      if (seen.has(key)) continue;

      const before = boxes.filter(
        (el) =>
          Math.abs(el.y + el.height - aBottom) <= 1.2 &&
          Math.min(el.x + el.width, overlapEnd) - Math.max(el.x, overlapStart) > 2,
      );
      const after = boxes.filter(
        (el) =>
          Math.abs(el.y - b.y) <= 1.2 &&
          Math.min(el.x + el.width, overlapEnd) - Math.max(el.x, overlapStart) > 2,
      );
      if (before.length === 0 || after.length === 0) continue;

      const start = Math.min(...before.map((e) => e.x), ...after.map((e) => e.x));
      const end = Math.max(
        ...before.map((e) => e.x + e.width),
        ...after.map((e) => e.x + e.width),
      );
      const minDelta = -Math.min(...before.map((e) => e.height - MIN_FRAME_MM));
      const maxDelta = Math.min(...after.map((e) => e.height - MIN_FRAME_MM));
      if (minDelta >= maxDelta) continue;

      seen.add(key);
      gutters.push({
        id: key,
        axis: "horizontal",
        pos: center,
        start,
        end,
        gap,
        beforeIds: before.map((e) => e.id),
        afterIds: after.map((e) => e.id),
        minDelta,
        maxDelta,
      });
    }
  }

  return gutters;
}

/** Returns the ID of the largest empty image frame on a page, if any. */
export function getLargestEmptyFrameId(elements: Element[]): string | null {
  let bestId: string | null = null;
  let bestArea = -1;
  for (const el of elements) {
    if (el.type === "image" && !el.src) {
      const area = el.width * el.height;
      if (area > bestArea) {
        bestArea = area;
        bestId = el.id;
      }
    }
  }
  return bestId;
}

export function isImageElement(el: Element): el is ImageElement {
  return el.type === "image";
}
