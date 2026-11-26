"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import type { Element, PageSize } from "@/types";
import { useEditorStore } from "@/store";
import { round } from "@/lib/units";

export type ResizeHandle = "nw" | "n" | "ne" | "e" | "se" | "s" | "sw" | "w";

interface HandleVector {
  /** -1 = left edge, 0 = horizontal centre, 1 = right edge. */
  hx: -1 | 0 | 1;
  /** -1 = top edge, 0 = vertical centre, 1 = bottom edge. */
  hy: -1 | 0 | 1;
}

export const HANDLE_VECTORS: Record<ResizeHandle, HandleVector> = {
  nw: { hx: -1, hy: -1 },
  n: { hx: 0, hy: -1 },
  ne: { hx: 1, hy: -1 },
  e: { hx: 1, hy: 0 },
  se: { hx: 1, hy: 1 },
  s: { hx: 0, hy: 1 },
  sw: { hx: -1, hy: 1 },
  w: { hx: -1, hy: 0 },
};

export const HANDLE_CURSOR: Record<ResizeHandle, string> = {
  nw: "nwse-resize",
  n: "ns-resize",
  ne: "nesw-resize",
  e: "ew-resize",
  se: "nwse-resize",
  s: "ns-resize",
  sw: "nesw-resize",
  w: "ew-resize",
};

const MIN_SIZE = 1;
const DRAG_THRESHOLD = 2;

function toRadians(degrees: number) {
  return (degrees * Math.PI) / 180;
}

function rotate(x: number, y: number, radians: number) {
  const cos = Math.cos(radians);
  const sin = Math.sin(radians);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}

/**
 * Keeps an unrotated box inside the page trim so it can never be dragged past
 * the page's clipped edge, where it would be unreachable.
 */
function clampToPage(
  x: number,
  y: number,
  width: number,
  height: number,
  rotation: number,
  pageSize: PageSize,
) {
  if (rotation) {
    // A rotated box needs extra room; keep its centre on the page instead.
    return {
      x: Math.min(Math.max(x, -width / 2), pageSize.w - width / 2),
      y: Math.min(Math.max(y, -height / 2), pageSize.h - height / 2),
    };
  }
  return {
    x: Math.min(Math.max(x, 0), Math.max(0, pageSize.w - width)),
    y: Math.min(Math.max(y, 0), Math.max(0, pageSize.h - height)),
  };
}

function startPointerSession<T extends HTMLElement>(
  event: ReactPointerEvent<T>,
  cursor: string,
  onCommit: () => void,
  onDelta: (dx: number, dy: number) => void,
) {
  if (event.pointerType === "mouse" && event.button !== 0) return;

  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;
  const body = document.body;
  const previousUserSelect = body.style.userSelect;
  const previousCursor = body.style.cursor;
  let committed = false;

  body.style.userSelect = "none";
  body.style.cursor = cursor;

  const stop = () => {
    window.removeEventListener("pointermove", handleMove);
    window.removeEventListener("pointerup", stop);
    window.removeEventListener("pointercancel", stop);
    body.style.userSelect = previousUserSelect;
    body.style.cursor = previousCursor;
  };

  const handleMove = (moveEvent: PointerEvent) => {
    if (moveEvent.pointerId !== pointerId) return;
    const dx = moveEvent.clientX - startX;
    const dy = moveEvent.clientY - startY;

    if (!committed) {
      if (Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      committed = true;
      onCommit();
    }

    onDelta(dx, dy);
  };

  window.addEventListener("pointermove", handleMove);
  window.addEventListener("pointerup", stop);
  window.addEventListener("pointercancel", stop);
}

export function useElementTransform(
  element: Element,
  pageSize: PageSize,
  scale: number,
) {
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const updateElement = useEditorStore((state) => state.updateElement);

  const beginMove = (event: ReactPointerEvent<HTMLElement>) => {
    if (scale <= 0) return;

    const originX = element.x;
    const originY = element.y;

    startPointerSession(event, "grabbing", pushHistory, (dx, dy) => {
      const next = clampToPage(
        originX + dx / scale,
        originY + dy / scale,
        element.width,
        element.height,
        element.rotation,
        pageSize,
      );
      updateElement(
        element.id,
        { x: round(next.x), y: round(next.y) },
        { commit: false },
      );
    });
  };

  const beginResize = (
    handle: ResizeHandle,
    event: ReactPointerEvent<HTMLElement>,
  ) => {
    if (scale <= 0) return;

    const { hx, hy } = HANDLE_VECTORS[handle];
    const radians = toRadians(element.rotation);
    const originX = element.x;
    const originY = element.y;
    const originWidth = element.width;
    const originHeight = element.height;

    // The opposite edge or corner stays pinned in page space for the gesture.
    const anchorOffset = rotate(
      (-hx * originWidth) / 2,
      (-hy * originHeight) / 2,
      radians,
    );
    const anchorX = originX + originWidth / 2 + anchorOffset.x;
    const anchorY = originY + originHeight / 2 + anchorOffset.y;

    startPointerSession(
      event,
      HANDLE_CURSOR[handle],
      pushHistory,
      (dx, dy) => {
        const delta = rotate(dx / scale, dy / scale, -radians);

        // Stop the moving edge at the page trim so the anchor stays pinned.
        const maxWidth =
          hx > 0
            ? pageSize.w - anchorX
            : hx < 0
              ? anchorX
              : Number.POSITIVE_INFINITY;
        const maxHeight =
          hy > 0
            ? pageSize.h - anchorY
            : hy < 0
              ? anchorY
              : Number.POSITIVE_INFINITY;

        const width = Math.max(
          MIN_SIZE,
          Math.min(originWidth + hx * delta.x, maxWidth),
        );
        const height = Math.max(
          MIN_SIZE,
          Math.min(originHeight + hy * delta.y, maxHeight),
        );

        const centreOffset = rotate((hx * width) / 2, (hy * height) / 2, radians);
        const centreX = anchorX + centreOffset.x;
        const centreY = anchorY + centreOffset.y;
        const next = clampToPage(
          centreX - width / 2,
          centreY - height / 2,
          width,
          height,
          element.rotation,
          pageSize,
        );

        updateElement(
          element.id,
          {
            x: round(next.x),
            y: round(next.y),
            width: round(width),
            height: round(height),
          },
          { commit: false },
        );
      },
    );
  };

  return { beginMove, beginResize };
}
