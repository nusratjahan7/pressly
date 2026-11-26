"use client";

import { useMemo } from "react";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import type Konva from "konva";
import type { ImageElement } from "@/types";
import { useHtmlImage } from "@/components/editor/canvas/useHtmlImage";

interface ImageNodeProps {
  element: ImageElement;
  listening?: boolean;
}

export function ImageNode({ element, listening = false }: ImageNodeProps) {
  const { image } = useHtmlImage(element.src);

  // Konva has no objectFit, so cover/contain is expressed by positioning the
  // image inside a clipped group.
  const crop = useMemo(() => {
    if (!image) return null;
    const naturalWidth = image.naturalWidth || 1;
    const naturalHeight = image.naturalHeight || 1;
    const sourceRatio = naturalWidth / naturalHeight;

    let drawWidth = element.width;
    let drawHeight = drawWidth / sourceRatio;

    if (element.fit === "contain") {
      if (drawHeight > element.height) {
        drawHeight = element.height;
        drawWidth = drawHeight * sourceRatio;
      }
    } else if (drawHeight < element.height) {
      drawHeight = element.height;
      drawWidth = drawHeight * sourceRatio;
    }

    return {
      x: (element.width - drawWidth) / 2,
      y: (element.height - drawHeight) / 2,
      width: drawWidth,
      height: drawHeight,
    };
  }, [image, element.fit, element.width, element.height]);

  const radius = Math.max(
    0,
    Math.min(element.radius, Math.min(element.width, element.height) / 2),
  );

  const clipFunc =
    radius > 0
      ? (context: Konva.Context) => {
          context.beginPath();
          context.roundRect(0, 0, element.width, element.height, radius);
          context.closePath();
        }
      : undefined;

  return (
    <Group
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      clipX={radius > 0 ? undefined : 0}
      clipY={radius > 0 ? undefined : 0}
      clipWidth={radius > 0 ? undefined : element.width}
      clipHeight={radius > 0 ? undefined : element.height}
      clipFunc={clipFunc}
      listening={listening}
    >
      {image && crop ? (
        <KonvaImage
          image={image}
          x={crop.x}
          y={crop.y}
          width={crop.width}
          height={crop.height}
          perfectDrawEnabled={false}
          listening={listening}
        />
      ) : (
        <Rect
          width={element.width}
          height={element.height}
          fill="#eceef8"
          listening={listening}
        />
      )}
    </Group>
  );
}
