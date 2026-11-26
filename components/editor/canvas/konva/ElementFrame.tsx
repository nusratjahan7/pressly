"use client";

import { useEffect, useRef } from "react";
import { Group, Rect } from "react-konva";
import type Konva from "konva";
import type { Element } from "@/types";
import { useEditorStore } from "@/store";
import { round } from "@/lib/units";
import {
  registerElementNode,
  unregisterElementNode,
} from "@/lib/konva/elementNodes";
import {
  ElementContent,
  ElementHitArea,
} from "@/components/editor/canvas/konva/ElementContent";

export const MIN_ELEMENT_MM = 2;

interface ElementFrameProps {
  element: Element;
  pageId: string;
  /** Page offset within the spread, in millimetres. */
  pageOffsetX: number;
  pageWidth: number;
  pageHeight: number;
  selected: boolean;
  decorative?: boolean;
  isLargestEmpty?: boolean;
  isSwapTarget?: boolean;
  isCropping?: boolean;
  animSeq?: number;
  onOpenPhotoPicker?: (elementId: string, pageId: string) => void;
  onDoubleClickFrame?: (element: Element, pageId: string) => void;
  onContextMenuFrame?: (
    element: Element,
    pageId: string,
    clientX: number,
    clientY: number,
  ) => void;
  onFrameDragMove?: (elementId: string, pointerX: number, pointerY: number) => void;
  onFrameDragEndSwap?: (
    elementId: string,
    pointerX: number,
    pointerY: number,
  ) => boolean;
}

/**
 * Positions one element and makes it interactive: press to select, drag to
 * move (or swap photos between frames), double-click to crop/edit, right-click
 * for frame actions, and register its node so the Transformer can attach.
 */
export function ElementFrame({
  element,
  pageId,
  pageOffsetX,
  pageWidth,
  pageHeight,
  selected,
  decorative = false,
  isLargestEmpty = false,
  isSwapTarget = false,
  isCropping = false,
  animSeq = 0,
  onOpenPhotoPicker,
  onDoubleClickFrame,
  onContextMenuFrame,
  onFrameDragMove,
  onFrameDragEndSwap,
}: ElementFrameProps) {
  const groupRef = useRef<Konva.Group>(null);
  const selectElement = useEditorStore((state) => state.selectElement);
  const updateElement = useEditorStore((state) => state.updateElement);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const cropDragRef = useRef<{
    startX: number;
    startY: number;
    baseCropX: number;
    baseCropY: number;
  } | null>(null);
  const didDragRef = useRef(false);
  const lastAnimSeqRef = useRef(animSeq);

  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;
    registerElementNode(element.id, node);
    return () => unregisterElementNode(element.id);
  }, [element.id]);

  // 150ms fade/slide entrance animation when a layout is applied.
  useEffect(() => {
    const node = groupRef.current;
    if (!node || animSeq === 0 || animSeq === lastAnimSeqRef.current) return;
    lastAnimSeqRef.current = animSeq;

    const targetY = element.y;
    const targetOpacity = element.opacity;
    node.y(targetY + 5);
    node.opacity(0);

    const start = performance.now();
    const duration = 150;
    let raf = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      node.y(targetY + (1 - eased) * 5);
      node.opacity(targetOpacity * eased);
      node.getLayer()?.batchDraw();
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [animSeq, element.y, element.opacity]);

  const interactive = !decorative;
  const locked = element.locked;
  const isFilledImage = element.type === "image" && Boolean(element.src);
  const isEmptyImage = element.type === "image" && !element.src;

  const clampToPage = (x: number, y: number, width: number, height: number) => {
    if (element.rotation) {
      return {
        x: Math.min(Math.max(x, -width / 2), pageWidth - width / 2),
        y: Math.min(Math.max(y, -height / 2), pageHeight - height / 2),
      };
    }
    return {
      x: Math.min(Math.max(x, 0), Math.max(0, pageWidth - width)),
      y: Math.min(Math.max(y, 0), Math.max(0, pageHeight - height)),
    };
  };

  return (
    <Group
      ref={groupRef}
      name={element.id}
      x={pageOffsetX + element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      draggable={interactive && !locked && !isCropping}
      listening={interactive}
      onPointerDown={(event) => {
        if (!interactive) return;
        event.cancelBubble = true;
        didDragRef.current = false;
        selectElement(pageId, element.id);

        if (isCropping && element.type === "image") {
          cropDragRef.current = {
            startX: event.evt.clientX,
            startY: event.evt.clientY,
            baseCropX: element.cropX ?? 0,
            baseCropY: element.cropY ?? 0,
          };
          const handleMove = (moveEvent: PointerEvent) => {
            const drag = cropDragRef.current;
            if (!drag) return;
            const dx = (moveEvent.clientX - drag.startX) / 80;
            const dy = (moveEvent.clientY - drag.startY) / 80;
            updateElement(
              element.id,
              {
                cropX: Math.max(-1, Math.min(1, round(drag.baseCropX + dx, 3))),
                cropY: Math.max(-1, Math.min(1, round(drag.baseCropY + dy, 3))),
              },
              { commit: false },
            );
          };
          const handleUp = () => {
            cropDragRef.current = null;
            window.removeEventListener("pointermove", handleMove);
            window.removeEventListener("pointerup", handleUp);
          };
          window.addEventListener("pointermove", handleMove);
          window.addEventListener("pointerup", handleUp);
        }
      }}
      onClick={(event) => {
        if (!interactive || didDragRef.current) return;
        event.cancelBubble = true;
        if (isEmptyImage && onOpenPhotoPicker) {
          onOpenPhotoPicker(element.id, pageId);
        }
      }}
      onTap={(event) => {
        if (!interactive || didDragRef.current) return;
        event.cancelBubble = true;
        if (isEmptyImage && onOpenPhotoPicker) {
          onOpenPhotoPicker(element.id, pageId);
        }
      }}
      onDblClick={(event) => {
        if (!interactive) return;
        event.cancelBubble = true;
        onDoubleClickFrame?.(element, pageId);
      }}
      onDblTap={(event) => {
        if (!interactive) return;
        event.cancelBubble = true;
        onDoubleClickFrame?.(element, pageId);
      }}
      onContextMenu={(event) => {
        if (!interactive || !onContextMenuFrame) return;
        event.evt.preventDefault();
        event.cancelBubble = true;
        selectElement(pageId, element.id);
        onContextMenuFrame(element, pageId, event.evt.clientX, event.evt.clientY);
      }}
      onDragStart={() => {
        didDragRef.current = true;
        pushHistory();
      }}
      onDragMove={(event) => {
        const node = event.target;
        const next = clampToPage(
          node.x() - pageOffsetX,
          node.y(),
          element.width,
          element.height,
        );
        node.position({ x: pageOffsetX + next.x, y: next.y });

        if (isFilledImage && onFrameDragMove) {
          const pointer = node.getStage()?.getPointerPosition();
          if (pointer) {
            onFrameDragMove(element.id, pointer.x, pointer.y);
          }
        }
      }}
      onDragEnd={(event) => {
        const node = event.target;
        if (isFilledImage && onFrameDragEndSwap) {
          const pointer = node.getStage()?.getPointerPosition();
          if (pointer && onFrameDragEndSwap(element.id, pointer.x, pointer.y)) {
            node.position({ x: pageOffsetX + element.x, y: element.y });
            return;
          }
        }
        const next = clampToPage(
          node.x() - pageOffsetX,
          node.y(),
          element.width,
          element.height,
        );
        updateElement(
          element.id,
          { x: round(next.x), y: round(next.y) },
          { commit: false },
        );
      }}
    >
      <ElementContent
        element={element}
        width={element.width}
        height={element.height}
        isLargestEmpty={isLargestEmpty}
        listening={interactive}
      />
      {interactive ? (
        <ElementHitArea
          width={element.width}
          height={element.height}
          listening
        />
      ) : null}
      {isSwapTarget ? (
        <Rect
          width={element.width}
          height={element.height}
          stroke="#5b65dc"
          strokeWidth={1.6}
          fill="rgba(91,101,220,0.16)"
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}
      {isCropping ? (
        <Rect
          width={element.width}
          height={element.height}
          stroke="#5b65dc"
          strokeWidth={1.4}
          dash={[3, 2]}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}
    </Group>
  );
}
