"use client";

import { Group, Rect } from "react-konva";
import type { Element } from "@/types";
import { TextNode } from "@/components/editor/canvas/konva/TextNode";
import { ImageNode } from "@/components/editor/canvas/konva/ImageNode";
import { ShapeNode } from "@/components/editor/canvas/konva/ShapeNode";
import { StickerNode } from "@/components/editor/canvas/konva/StickerNode";
import { QrNode } from "@/components/editor/canvas/konva/QrNode";

interface ElementContentProps {
  element: Element;
  /** Frame size from the enclosing transform group, in millimetres. */
  width: number;
  height: number;
  isLargestEmpty?: boolean;
  listening?: boolean;
}

/**
 * Draws the element body in its own local coordinate space, anchored at (0,0)
 * and sized to `element.width` × `element.height`. Positioning, rotation and
 * opacity are applied by the surrounding frame; non-image flip transforms wrap cleanly here.
 */
export function ElementContent({
  element,
  width,
  height,
  isLargestEmpty = false,
  listening = false,
}: ElementContentProps) {
  if (element.type === "image") {
    return (
      <ImageNode
        element={element}
        width={width}
        height={height}
        isLargestEmpty={isLargestEmpty}
        listening={listening}
      />
    );
  }

  const flipX = Boolean(element.flipX);
  const flipY = Boolean(element.flipY);

  const inner = (() => {
    switch (element.type) {
      case "text":
        return (
          <TextNode
            element={element}
            width={width}
            height={height}
            listening={listening}
          />
        );
      case "shape":
        return (
          <ShapeNode
            element={element}
            width={width}
            height={height}
            listening={listening}
          />
        );
      case "sticker":
        return (
          <StickerNode
            element={element}
            width={width}
            height={height}
            listening={listening}
          />
        );
      case "qr":
        return (
          <QrNode
            element={element}
            width={width}
            height={height}
            listening={listening}
          />
        );
    }
  })();

  if (!flipX && !flipY) return inner;

  return (
    <Group
      x={flipX ? width : 0}
      y={flipY ? height : 0}
      scaleX={flipX ? -1 : 1}
      scaleY={flipY ? -1 : 1}
      listening={listening}
    >
      {inner}
    </Group>
  );
}

/**
 * Guarantees the whole frame is hit-testable, including empty text boxes and
 * transparent shapes, and gives the Transformer an exact bounding box.
 */
export function ElementHitArea({
  width,
  height,
  listening = true,
}: {
  width: number;
  height: number;
  listening?: boolean;
}) {
  return (
    <Rect
      width={width}
      height={height}
      fill="rgba(0,0,0,0.001)"
      listening={listening}
      perfectDrawEnabled={false}
    />
  );
}
