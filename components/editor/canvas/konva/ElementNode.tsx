"use client";

import type { Element } from "@/types";
import { TextNode } from "@/components/editor/canvas/konva/TextNode";
import { ImageNode } from "@/components/editor/canvas/konva/ImageNode";
import { ShapeNode } from "@/components/editor/canvas/konva/ShapeNode";
import { StickerNode } from "@/components/editor/canvas/konva/StickerNode";
import { QrNode } from "@/components/editor/canvas/konva/QrNode";

interface ElementNodeProps {
  element: Element;
  decorative?: boolean;
}

/**
 * Dispatches to the per-type renderer. `decorative` disables hit detection for
 * previews; the editing stage enables it so elements can be selected.
 */
export function ElementNode({ element, decorative = false }: ElementNodeProps) {
  const listening = !decorative;

  switch (element.type) {
    case "text":
      return <TextNode element={element} listening={listening} />;
    case "image":
      return <ImageNode element={element} listening={listening} />;
    case "shape":
      return <ShapeNode element={element} listening={listening} />;
    case "sticker":
      return <StickerNode element={element} listening={listening} />;
    case "qr":
      return <QrNode element={element} listening={listening} />;
  }
}
