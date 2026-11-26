"use client";

import { useEffect, useRef } from "react";
import { Transformer } from "react-konva";
import type Konva from "konva";
import type { Element } from "@/types";
import { useEditorStore } from "@/store";
import { round } from "@/lib/units";
import { getElementNode } from "@/lib/konva/elementNodes";
import { MIN_ELEMENT_MM } from "@/components/editor/canvas/konva/ElementFrame";

interface SelectionTransformerProps {
  /** The element the transformer should attach to, if any. */
  element: Element | null;
  pageOffsetX: number;
  pageWidth: number;
  pageHeight: number;
  scale: number;
}

/**
 * Renders resize and rotate handles for the selected element.
 *
 * The transformer is attached imperatively rather than through `nodes={[...]}`
 * because element groups are registered by id across two page groups.
 */
export function SelectionTransformer({
  element,
  pageOffsetX,
  pageWidth,
  pageHeight,
  scale,
}: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  const pushHistory = useEditorStore((state) => state.pushHistory);

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const node = element ? getElementNode(element.id) : null;
    if (!element || !node) {
      transformer.nodes([]);
      transformer.getLayer()?.batchDraw();
      return;
    }

    transformer.nodes([node]);
    transformer.getLayer()?.batchDraw();
  }, [element, element?.id]);

  const handleSize = Math.max(7, Math.min(14, 8 / Math.max(scale, 0.0001) * 0.9));

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled
      keepRatio={false}
      flipEnabled={false}
      ignoreStroke
      anchorSize={handleSize}
      anchorStroke="#5b65dc"
      anchorFill="#ffffff"
      anchorCornerRadius={2}
      borderStroke="#5b65dc"
      borderStrokeWidth={1}
      rotateAnchorOffset={handleSize * 2.6}
      padding={0}
      enabledAnchors={
        element?.locked
          ? []
          : [
              "top-left",
              "top-center",
              "top-right",
              "middle-right",
              "bottom-right",
              "bottom-center",
              "bottom-left",
              "middle-left",
            ]
      }
      // Prevent collapsing a frame to nothing while dragging a handle inward.
      boundBoxFunc={(oldBox, newBox) => {
        const min = MIN_ELEMENT_MM * Math.max(scale, 0.0001);
        if (
          Math.abs(newBox.width) < min ||
          Math.abs(newBox.height) < min
        ) {
          return oldBox;
        }
        return newBox;
      }}
      onTransformStart={() => {
        pushHistory();
      }}
      onTransformEnd={() => {
        const node = transformerRef.current?.nodes()[0];
        if (!element || !node || !(node instanceof Object)) return;

        const group = node as Konva.Group;
        const scaleX = group.scaleX();
        const scaleY = group.scaleY();

        // Bake the transformer's scale into the model's millimetre size so the
        // node always keeps scale 1 and the stored geometry stays truthful.
        const nextWidth = Math.max(MIN_ELEMENT_MM, element.width * Math.abs(scaleX));
        const nextHeight = Math.max(MIN_ELEMENT_MM, element.height * Math.abs(scaleY));

        group.scaleX(1);
        group.scaleY(1);

        const x = group.x() - pageOffsetX;
        const y = group.y();
        const clampedX = Math.min(
          Math.max(x, element.rotation ? -nextWidth / 2 : 0),
          Math.max(
            element.rotation ? pageWidth - nextWidth / 2 : pageWidth - nextWidth,
            0,
          ),
        );
        const clampedY = Math.min(
          Math.max(y, element.rotation ? -nextHeight / 2 : 0),
          Math.max(
            element.rotation ? pageHeight - nextHeight / 2 : pageHeight - nextHeight,
            0,
          ),
        );

        updateElement(
          element.id,
          {
            x: round(clampedX),
            y: round(clampedY),
            width: round(nextWidth),
            height: round(nextHeight),
            rotation: round(group.rotation()),
          },
          { commit: false },
        );
      }}
    />
  );
}
