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
  /** Selected elements on the active page (1 or more). */
  elements: Element[];
  pageOffsetX: number;
  pageWidth: number;
  pageHeight: number;
  scale: number;
}

/**
 * Renders resize and rotate handles for one or multiple selected elements.
 */
export function SelectionTransformer({
  elements,
  pageOffsetX,
  pageWidth,
  pageHeight,
  scale,
}: SelectionTransformerProps) {
  const transformerRef = useRef<Konva.Transformer>(null);
  const updateElement = useEditorStore((state) => state.updateElement);
  const transformElements = useEditorStore((state) => state.transformElements);
  const pushHistory = useEditorStore((state) => state.pushHistory);

  const idsKey = elements.map((el) => el.id).join(",");

  useEffect(() => {
    const transformer = transformerRef.current;
    if (!transformer) return;

    const nodes = elements
      .map((el) => getElementNode(el.id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));
    transformer.nodes(nodes);
    transformer.getLayer()?.batchDraw();
  }, [elements, idsKey]);

  const handleSize = Math.max(7, Math.min(14, (8 / Math.max(scale, 0.0001)) * 0.9));
  const single = elements.length === 1 ? elements[0]! : null;
  const allLocked = elements.length > 0 && elements.every((el) => el.locked);

  return (
    <Transformer
      ref={transformerRef}
      rotateEnabled={!allLocked}
      keepRatio={elements.length > 1 || single?.type === "text"}
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
        allLocked || elements.length === 0
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
      boundBoxFunc={(oldBox, newBox) => {
        const min = MIN_ELEMENT_MM * Math.max(scale, 0.0001);
        if (Math.abs(newBox.width) < min || Math.abs(newBox.height) < min) {
          return oldBox;
        }
        return newBox;
      }}
      onTransformStart={() => {
        pushHistory();
      }}
      onTransformEnd={() => {
        const transformer = transformerRef.current;
        const nodes = transformer?.nodes() ?? [];
        if (elements.length === 0 || nodes.length === 0) return;

        if (single && nodes[0]) {
          const activeAnchor = transformer?.getActiveAnchor() ?? "";
          const isCorner =
            activeAnchor === "top-left" ||
            activeAnchor === "top-right" ||
            activeAnchor === "bottom-left" ||
            activeAnchor === "bottom-right";

          const group = nodes[0] as Konva.Group;
          const scaleX = group.scaleX();
          const scaleY = group.scaleY();
          const nextWidth = Math.max(
            MIN_ELEMENT_MM,
            single.width * Math.abs(scaleX),
          );
          const nextHeight = Math.max(
            MIN_ELEMENT_MM,
            single.height * Math.abs(scaleY),
          );
          group.scaleX(1);
          group.scaleY(1);

          const x = group.x() - pageOffsetX;
          const y = group.y();
          const clampedX = Math.min(
            Math.max(x, single.rotation ? -nextWidth / 2 : 0),
            Math.max(
              single.rotation ? pageWidth - nextWidth / 2 : pageWidth - nextWidth,
              0,
            ),
          );
          const clampedY = Math.min(
            Math.max(y, single.rotation ? -nextHeight / 2 : 0),
            Math.max(
              single.rotation ? pageHeight - nextHeight / 2 : pageHeight - nextHeight,
              0,
            ),
          );

          const patch: Partial<Element> = {
            x: round(clampedX),
            y: round(clampedY),
            width: round(nextWidth),
            height: round(nextHeight),
            rotation: round(group.rotation()),
          };

          if (single.type === "text" && isCorner) {
            const ratio = Math.max(0.1, Math.abs(scaleY));
            Object.assign(patch, {
              fontSize: Math.max(4, Math.min(400, round(single.fontSize * ratio, 1))),
              letterSpacing: round(single.letterSpacing * ratio, 2),
            });
          }

          updateElement(single.id, patch, { commit: false });
          return;
        }

        const updates: Array<{
          id: string;
          x: number;
          y: number;
          width: number;
          height: number;
          rotation: number;
        }> = [];
        for (const node of nodes) {
          const el = elements.find((candidate) => candidate.id === node.name());
          if (!el) continue;
          const sx = node.scaleX();
          const sy = node.scaleY();
          const nextW = Math.max(MIN_ELEMENT_MM, el.width * Math.abs(sx));
          const nextH = Math.max(MIN_ELEMENT_MM, el.height * Math.abs(sy));
          node.scaleX(1);
          node.scaleY(1);
          updates.push({
            id: el.id,
            x: node.x() - pageOffsetX,
            y: node.y(),
            width: nextW,
            height: nextH,
            rotation: node.rotation(),
          });
        }
        transformElements(updates, { commit: false });
      }}
    />
  );
}
