"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useEditorStore } from "@/store";
import {
  getViewportTransform,
  type SpreadLayout,
} from "@/lib/konva/geometry";

interface PanZoomOptions {
  container: HTMLDivElement | null;
  layout: SpreadLayout;
  fitScale: number;
  containerWidth: number;
  containerHeight: number;
}

const WHEEL_ZOOM_SENSITIVITY = 0.0008;
const OVERSCROLL_PX = 32;

export function useStagePanZoom({
  container,
  layout,
  fitScale,
  containerWidth,
  containerHeight,
}: PanZoomOptions) {
  const [spaceHeld, setSpaceHeld] = useState(false);
  const [panning, setPanning] = useState(false);
  const panState = useRef<{ pointerId: number; lastX: number; lastY: number } | null>(
    null,
  );
  const pinchState = useRef<{ distance: number; zoom: number } | null>(null);

  const zoom = useEditorStore((state) => state.ui.zoom);
  const viewCenter = useEditorStore((state) => state.ui.viewCenter);
  const scale = Math.max(0.0001, fitScale * zoom);
  /**
   * Viewport clamping with the behaviour design tools use:
   * - when the spread fits, it stays fully on screen (centred by the clamp);
   * - when it overflows, panning stops at its edges plus a small overscroll,
   *   so the paper is never lost off-canvas.
   */
  const clampCenter = useCallback(
    (center: { x: number; y: number }) => {
      const spreadWpx = layout.spreadWidth * scale;
      const spreadHpx = layout.spreadHeight * scale;

      const rangeFor = (spreadPx: number, viewportPx: number) => {
        if (spreadPx <= viewportPx) {
          // Fits: lock it centred so it can never drift into a corner.
          const centred = (viewportPx - spreadPx) / 2;
          return { min: centred, max: centred };
        }
        return {
          min: viewportPx - spreadPx - OVERSCROLL_PX,
          max: OVERSCROLL_PX,
        };
      };

      const xRange = rangeFor(spreadWpx, containerWidth);
      const yRange = rangeFor(spreadHpx, containerHeight);

      const panX = Math.min(
        Math.max(containerWidth / 2 - center.x * scale, xRange.min),
        xRange.max,
      );
      const panY = Math.min(
        Math.max(containerHeight / 2 - center.y * scale, yRange.min),
        yRange.max,
      );

      return {
        x: (containerWidth / 2 - panX) / scale,
        y: (containerHeight / 2 - panY) / scale,
      };
    },
    [layout.spreadWidth, layout.spreadHeight, containerWidth, containerHeight, scale],
  );

  /** Zooms about a container-relative point, keeping that point anchored. */
  const zoomAtPoint = useCallback(
    (screenX: number, screenY: number, nextZoom: number) => {
      const state = useEditorStore.getState();
      const currentZoom = state.ui.zoom;
      const currentScale = Math.max(0.0001, fitScale * currentZoom);
      const center = state.ui.viewCenter;

      const spreadPoint = {
        x: (screenX - (containerWidth / 2 - center.x * currentScale)) /
          currentScale,
        y: (screenY - (containerHeight / 2 - center.y * currentScale)) /
          currentScale,
      };

      const clampedZoom = Math.min(
        3,
        Math.max(0.25, Math.round(nextZoom * 1000) / 1000),
      );
      const nextScale = Math.max(0.0001, fitScale * clampedZoom);
      const nextCenter = clampCenter({
        x: spreadPoint.x - (screenX - containerWidth / 2) / nextScale,
        y: spreadPoint.y - (screenY - containerHeight / 2) / nextScale,
      });

      state.zoomTo(clampedZoom, nextCenter);
    },
    [fitScale, containerWidth, containerHeight, clampCenter],
  );

  // ctrl/⌘ + wheel zooms; plain wheel pans vertically (and horizontally with shift).
  useEffect(() => {
    const element = container;
    if (!element) return;

    const handleWheel = (event: WheelEvent) => {
      const state = useEditorStore.getState();
      if (state.ui.previewOpen || state.ui.exportOpen) return;

      if (event.ctrlKey || event.metaKey) {
        event.preventDefault();
        const rect = element.getBoundingClientRect();
        const factor = Math.exp(-event.deltaY * WHEEL_ZOOM_SENSITIVITY);
        zoomAtPoint(
          event.clientX - rect.left,
          event.clientY - rect.top,
          state.ui.zoom * factor,
        );
        return;
      }

      event.preventDefault();
      const currentScale = Math.max(0.0001, fitScale * state.ui.zoom);
      const dx = (event.shiftKey ? event.deltaY : event.deltaX) / currentScale;
      const dy = (event.shiftKey ? 0 : event.deltaY) / currentScale;
      state.setViewCenter(
        clampCenter({
          x: state.ui.viewCenter.x + dx,
          y: state.ui.viewCenter.y + dy,
        }),
      );
    };

    element.addEventListener("wheel", handleWheel, { passive: false });
    return () => element.removeEventListener("wheel", handleWheel);
  }, [container, fitScale, zoomAtPoint, clampCenter]);

  // Trackpad/touch pinch.
  useEffect(() => {
    const element = container;
    if (!element) return;

    const distanceBetween = (touches: TouchList) => {
      const first = touches[0]!;
      const second = touches[1]!;
      return Math.hypot(
        first.clientX - second.clientX,
        first.clientY - second.clientY,
      );
    };

    const handleTouchStart = (event: TouchEvent) => {
      if (event.touches.length !== 2) return;
      pinchState.current = {
        distance: distanceBetween(event.touches),
        zoom: useEditorStore.getState().ui.zoom,
      };
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (event.touches.length !== 2 || !pinchState.current) return;
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      const distance = distanceBetween(event.touches);
      const ratio = distance / Math.max(1, pinchState.current.distance);
      const midpointX =
        (event.touches[0]!.clientX + event.touches[1]!.clientX) / 2 - rect.left;
      const midpointY =
        (event.touches[0]!.clientY + event.touches[1]!.clientY) / 2 - rect.top;
      zoomAtPoint(midpointX, midpointY, pinchState.current.zoom * ratio);
    };

    const handleTouchEnd = () => {
      pinchState.current = null;
    };

    element.addEventListener("touchstart", handleTouchStart, { passive: false });
    element.addEventListener("touchmove", handleTouchMove, { passive: false });
    element.addEventListener("touchend", handleTouchEnd);
    element.addEventListener("touchcancel", handleTouchEnd);

    return () => {
      element.removeEventListener("touchstart", handleTouchStart);
      element.removeEventListener("touchmove", handleTouchMove);
      element.removeEventListener("touchend", handleTouchEnd);
      element.removeEventListener("touchcancel", handleTouchEnd);
    };
  }, [container, zoomAtPoint]);

  // Space held turns the canvas into a pan surface.
  useEffect(() => {
    const isTyping = (target: EventTarget | null) => {
      const node = target as HTMLElement | null;
      return Boolean(
        node &&
          (node.isContentEditable ||
            ["INPUT", "TEXTAREA", "SELECT"].includes(node.tagName)),
      );
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.code !== "Space" || event.repeat) return;
      if (isTyping(event.target)) return;
      setSpaceHeld(true);
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code !== "Space") return;
      setSpaceHeld(false);
      panState.current = null;
      setPanning(false);
    };
    const handleBlur = () => {
      setSpaceHeld(false);
      panState.current = null;
      setPanning(false);
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);
    window.addEventListener("blur", handleBlur);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
      window.removeEventListener("blur", handleBlur);
    };
  }, []);

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const isMiddle = event.button === 1;
      if (!spaceHeld && !isMiddle) return;
      event.preventDefault();
      setPanning(true);
      panState.current = {
        pointerId: event.pointerId,
        lastX: event.clientX,
        lastY: event.clientY,
      };
      (event.currentTarget as HTMLElement).setPointerCapture?.(event.pointerId);
    },
    [spaceHeld],
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      const state = panState.current;
      if (!state || state.pointerId !== event.pointerId) return;
      const dx = event.clientX - state.lastX;
      const dy = event.clientY - state.lastY;
      state.lastX = event.clientX;
      state.lastY = event.clientY;

      const current = useEditorStore.getState();
      const currentScale = Math.max(0.0001, fitScale * current.ui.zoom);
      current.setViewCenter(
        clampCenter({
          x: current.ui.viewCenter.x - dx / currentScale,
          y: current.ui.viewCenter.y - dy / currentScale,
        }),
      );
    },
    [fitScale, clampCenter],
  );

  const onPointerUp = useCallback((event: React.PointerEvent<HTMLDivElement>) => {
    if (panState.current?.pointerId !== event.pointerId) return;
    panState.current = null;
    setPanning(false);
    (event.currentTarget as HTMLElement).releasePointerCapture?.(
      event.pointerId,
    );
  }, []);

  const cursor = panning
    ? "grabbing"
    : spaceHeld
      ? "grab"
      : "default";

  const transform = useMemo(
    () =>
      getViewportTransform(
        layout,
        fitScale,
        zoom,
        viewCenter,
        containerWidth,
        containerHeight,
      ),
    [layout, fitScale, zoom, viewCenter, containerWidth, containerHeight],
  );

  return {
    scale,
    transform,
    cursor,
    spaceHeld,
    isPanning: panning,
    handlers: { onPointerDown, onPointerMove, onPointerUp },
  };
}
