"use client";

import { Rect } from "react-konva";
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
  listening?: boolean;
}

/**
 * Draws the element body in its own local coordinate space, anchored at (0,0)
 * and sized to `element.width` × `element.height`. Positioning, rotation and
 * opacity are applied by the surrounding frame so this stays pure content.
 */
export function ElementContent({
  element,
  width,
  height,
  listening = false,
}: ElementContentProps) {
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
    case "image":
      return (
        <ImageNode
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
