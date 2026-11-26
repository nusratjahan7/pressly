"use client";

import { useEffect, useRef } from "react";
import { Group } from "react-konva";
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
}

/**
 * Positions one element and makes it interactive: press to select, drag to
 * move, and register its node so the Transformer can attach. The body itself
 * renders in local coordinates, so this is the single place that writes
 * geometry back to the store.
 */
export function ElementFrame({
  element,
  pageId,
  pageOffsetX,
  pageWidth,
  pageHeight,
  selected,
  decorative = false,
}: ElementFrameProps) {
  const groupRef = useRef<Konva.Group>(null);
  const selectElement = useEditorStore((state) => state.selectElement);
  const updateElement = useEditorStore((state) => state.updateElement);
  const pushHistory = useEditorStore((state) => state.pushHistory);

  useEffect(() => {
    const node = groupRef.current;
    if (!node) return;
    registerElementNode(element.id, node);
    return () => unregisterElementNode(element.id);
  }, [element.id]);

  const interactive = !decorative;
  const locked = element.locked;

  /**
   * Keeps an unrotated frame inside its page so it can never be dragged past
   * the clipped trim edge where it would become unreachable.
   */
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
      draggable={interactive && !locked}
      listening={interactive}
      onPointerDown={(event) => {
        if (!interactive) return;
        // Prevent the page from clearing the selection on the same press.
        event.cancelBubble = true;
        selectElement(pageId, element.id);
      }}
      onDragStart={() => {
        // One history entry per drag, captured before the first move.
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
      }}
      onDragEnd={(event) => {
        const node = event.target;
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
        listening={interactive}
      />
      {interactive ? (
        <ElementHitArea
          width={element.width}
          height={element.height}
          listening
        />
      ) : null}
    </Group>
  );
}
