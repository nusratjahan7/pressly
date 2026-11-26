"use client";

import { useMemo } from "react";
import type Konva from "konva";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import type { ImageElement } from "@/types";
import { useHtmlImage } from "@/components/editor/canvas/useHtmlImage";

interface ImageNodeProps {
  element: ImageNodeElement;
  width: number;
  height: number;
  listening?: boolean;
}

type ImageNodeElement = Pick<ImageElement, "src" | "fit" | "radius">;

/**
 * Image body drawn at the local origin.
 *
 * Konva has no `objectFit`, so `cover` is expressed with a source crop rather
 * than an oversized image: that keeps the visual bounds exactly equal to the
 * element frame, which the Transformer depends on.
 */
export function ImageNode({ element, width, height, listening = false }: ImageNodeProps) {
  const { image } = useHtmlImage(element.src);

  const crop = useMemo(() => {
    if (!image) return null;
    const naturalWidth = image.naturalWidth || 1;
    const naturalHeight = image.naturalHeight || 1;
    const sourceRatio = naturalWidth / naturalHeight;
    const frameRatio = width / Math.max(height, 0.01);

    if (element.fit === "contain") {
      let drawWidth = width;
      let drawHeight = drawWidth / sourceRatio;
      if (drawHeight > height) {
        drawHeight = height;
        drawWidth = drawHeight * sourceRatio;
      }
      return { x: (width - drawWidth) / 2, y: (height - drawHeight) / 2, width: drawWidth, height: drawHeight };
    }

    // Cover: crop the source so the drawn image exactly fills the frame.
    if (sourceRatio > frameRatio) {
      // Source is wider than the frame: crop the horizontal overflow.
      const visibleWidth = naturalHeight * frameRatio;
      return {
        x: 0,
        y: 0,
        width,
        height,
        crop: {
          x: (naturalWidth - visibleWidth) / 2,
          y: 0,
          width: visibleWidth,
          height: naturalHeight,
        },
      };
    }
    const visibleHeight = naturalWidth / frameRatio;
    return {
      x: 0,
      y: 0,
      width,
      height,
      crop: {
        x: 0,
        y: (naturalHeight - visibleHeight) / 2,
        width: naturalWidth,
        height: visibleHeight,
      },
    };
  }, [image, element.fit, width, height]);

  const radius = Math.max(
    0,
    Math.min(element.radius, Math.min(width, height) / 2),
  );

  const clipFunc =
    radius > 0
      ? (context: Konva.Context) => {
          context.beginPath();
          context.roundRect(0, 0, width, height, radius);
          context.closePath();
        }
      : undefined;

  return (
    <Group
      clipX={radius > 0 ? undefined : 0}
      clipY={radius > 0 ? undefined : 0}
      clipWidth={radius > 0 ? undefined : width}
      clipHeight={radius > 0 ? undefined : height}
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
          crop={
            "crop" in crop && crop.crop
              ? crop.crop
              : undefined
          }
          perfectDrawEnabled={false}
          listening={listening}
        />
      ) : (
        <Rect
          width={width}
          height={height}
          fill="#eceef8"
          listening={listening}
        />
      )}
    </Group>
  );
}
