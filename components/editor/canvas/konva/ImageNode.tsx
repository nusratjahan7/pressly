"use client";

import { useMemo } from "react";
import type Konva from "konva";
import { Group, Image as KonvaImage, Line, Rect, Text } from "react-konva";
import type { ImageElement } from "@/types";
import { buildCssFilterString, hasNonDefaultFilters } from "@/lib/mediaStorage";
import { useHtmlImage } from "@/components/editor/canvas/useHtmlImage";

interface ImageNodeProps {
  element: ImageNodeElement;
  width: number;
  height: number;
  isLargestEmpty?: boolean;
  listening?: boolean;
}

type ImageNodeElement = Pick<
  ImageElement,
  | "src"
  | "fit"
  | "radius"
  | "cropScale"
  | "cropX"
  | "cropY"
  | "flipX"
  | "flipY"
  | "brightness"
  | "contrast"
  | "saturation"
  | "grayscale"
  | "blur"
  | "borderColor"
  | "borderWidth"
  | "shadow"
>;

/**
 * Computes source crop rectangle for `cover` fit with optional pan/zoom.
 */
export function computeCoverCrop(
  naturalWidth: number,
  naturalHeight: number,
  frameWidth: number,
  frameHeight: number,
  cropScale = 1,
  cropX = 0,
  cropY = 0,
) {
  const sourceRatio = naturalWidth / Math.max(1, naturalHeight);
  const frameRatio = frameWidth / Math.max(0.01, frameHeight);
  const zoom = Math.max(1, cropScale);

  const baseW =
    sourceRatio > frameRatio ? naturalHeight * frameRatio : naturalWidth;
  const baseH =
    sourceRatio > frameRatio ? naturalHeight : naturalWidth / frameRatio;

  const visW = baseW / zoom;
  const visH = baseH / zoom;
  const maxShiftX = Math.max(0, (naturalWidth - visW) / 2);
  const maxShiftY = Math.max(0, (naturalHeight - visH) / 2);
  const panX = Math.max(-1, Math.min(1, cropX)) * maxShiftX;
  const panY = Math.max(-1, Math.min(1, cropY)) * maxShiftY;

  return {
    x: (naturalWidth - visW) / 2 - panX,
    y: (naturalHeight - visH) / 2 - panY,
    width: visW,
    height: visH,
  };
}

function renderFilteredCanvas(
  image: HTMLImageElement,
  filterStr: string,
): HTMLCanvasElement {
  const maxDim = 1400;
  const scale = Math.min(1, maxDim / Math.max(image.naturalWidth, image.naturalHeight, 1));
  const cw = Math.max(1, Math.round(image.naturalWidth * scale));
  const ch = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = cw;
  canvas.height = ch;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.filter = filterStr;
    ctx.drawImage(image, 0, 0, cw, ch);
  }
  return canvas;
}

/**
 * Image body drawn at the local origin. Supports empty placeholder frames,
 * cover pan/zoom, flip, CSS-equivalent filters, border, and drop shadow.
 */
export function ImageNode({
  element,
  width,
  height,
  isLargestEmpty = false,
  listening = false,
}: ImageNodeProps) {
  const { image } = useHtmlImage(element.src);

  const filterStr = useMemo(
    () =>
      buildCssFilterString({
        brightness: element.brightness,
        contrast: element.contrast,
        saturation: element.saturation,
        grayscale: element.grayscale,
        blur: element.blur,
      }),
    [
      element.brightness,
      element.contrast,
      element.saturation,
      element.grayscale,
      element.blur,
    ],
  );

  const drawable = useMemo(() => {
    if (!image) return null;
    if (!hasNonDefaultFilters({ brightness: element.brightness, contrast: element.contrast, saturation: element.saturation, grayscale: element.grayscale, blur: element.blur })) {
      return image;
    }
    return renderFilteredCanvas(image, filterStr);
  }, [image, filterStr, element.brightness, element.contrast, element.saturation, element.grayscale, element.blur]);

  const crop = useMemo(() => {
    if (!image || !drawable) return null;
    const naturalWidth =
      drawable instanceof HTMLCanvasElement
        ? drawable.width
        : image.naturalWidth || 1;
    const naturalHeight =
      drawable instanceof HTMLCanvasElement
        ? drawable.height
        : image.naturalHeight || 1;
    const sourceRatio = naturalWidth / Math.max(1, naturalHeight);

    if (element.fit === "contain") {
      let drawWidth = width;
      let drawHeight = drawWidth / sourceRatio;
      if (drawHeight > height) {
        drawHeight = height;
        drawWidth = drawHeight * sourceRatio;
      }
      return {
        x: (width - drawWidth) / 2,
        y: (height - drawHeight) / 2,
        width: drawWidth,
        height: drawHeight,
      };
    }

    return {
      x: 0,
      y: 0,
      width,
      height,
      crop: computeCoverCrop(
        naturalWidth,
        naturalHeight,
        width,
        height,
        element.cropScale ?? 1,
        element.cropX ?? 0,
        element.cropY ?? 0,
      ),
    };
  }, [
    image,
    drawable,
    element.fit,
    element.cropScale,
    element.cropX,
    element.cropY,
    width,
    height,
  ]);

  const radius = Math.max(
    0,
    Math.min(element.radius, Math.min(width, height) / 2),
  );

  const clipFunc =
    radius > 0
      ? (context: Konva.Context) => {
          const r = Math.min(radius, width / 2, height / 2);
          context.beginPath();
          context.moveTo(r, 0);
          context.lineTo(width - r, 0);
          context.quadraticCurveTo(width, 0, width, r);
          context.lineTo(width, height - r);
          context.quadraticCurveTo(width, height, width - r, height);
          context.lineTo(r, height);
          context.quadraticCurveTo(0, height, 0, height - r);
          context.lineTo(0, r);
          context.quadraticCurveTo(0, 0, r, 0);
          context.closePath();
        }
      : undefined;

  const minEdge = Math.min(width, height);
  const plusSize = Math.max(4, Math.min(12, minEdge * 0.22));
  const cx = width / 2;
  const cy = height / 2;
  const strokeW = Math.max(0.7, minEdge * 0.025);
  const borderWidth = Math.max(0, element.borderWidth ?? 0);
  const hasBorder =
    borderWidth > 0 && element.borderColor && element.borderColor !== "transparent";

  return (
    <Group listening={listening}>
      {element.shadow && element.src ? (
        <Rect
          width={width}
          height={height}
          cornerRadius={radius}
          fill="#ffffff"
          shadowColor="rgba(18,32,86,0.34)"
          shadowBlur={4}
          shadowOffsetX={0}
          shadowOffsetY={1.8}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}

      <Group
        clipX={radius > 0 ? undefined : 0}
        clipY={radius > 0 ? undefined : 0}
        clipWidth={radius > 0 ? undefined : width}
        clipHeight={radius > 0 ? undefined : height}
        clipFunc={clipFunc}
        listening={listening}
      >
        {drawable && crop ? (
          <Group
            x={element.flipX ? width : 0}
            y={element.flipY ? height : 0}
            scaleX={element.flipX ? -1 : 1}
            scaleY={element.flipY ? -1 : 1}
            listening={listening}
          >
            <KonvaImage
              image={drawable}
              x={crop.x}
              y={crop.y}
              width={crop.width}
              height={crop.height}
              crop={"crop" in crop && crop.crop ? crop.crop : undefined}
              perfectDrawEnabled={false}
              listening={listening}
            />
          </Group>
        ) : !element.src ? (
          <Group listening={listening}>
            <Rect
              width={width}
              height={height}
              fill="#B5B7BF"
              listening={listening}
              perfectDrawEnabled={false}
            />
            {isLargestEmpty && minEdge >= 28 ? (
              <>
                <Text
                  x={width * 0.1}
                  y={cy - Math.min(9, minEdge * 0.16)}
                  width={width * 0.8}
                  text="drag here"
                  fontSize={Math.max(3.2, Math.min(6, minEdge * 0.085))}
                  fontFamily="Montserrat, sans-serif"
                  fontStyle="500"
                  fill="rgba(255,255,255,0.92)"
                  align="center"
                  listening={false}
                  perfectDrawEnabled={false}
                />
                <Rect
                  x={cx - 4.5}
                  y={cy + 2}
                  width={9}
                  height={7}
                  cornerRadius={1}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={0.7}
                  listening={false}
                  perfectDrawEnabled={false}
                />
                <Line
                  points={[cx - 1.5, cy + 5.5, cx + 1.5, cy + 5.5]}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={0.7}
                  listening={false}
                />
                <Line
                  points={[cx, cy + 4, cx, cy + 7]}
                  stroke="rgba(255,255,255,0.9)"
                  strokeWidth={0.7}
                  listening={false}
                />
              </>
            ) : (
              <>
                <Line
                  points={[cx - plusSize / 2, cy, cx + plusSize / 2, cy]}
                  stroke="rgba(255,255,255,0.92)"
                  strokeWidth={strokeW}
                  lineCap="round"
                  listening={false}
                  perfectDrawEnabled={false}
                />
                <Line
                  points={[cx, cy - plusSize / 2, cx, cy + plusSize / 2]}
                  stroke="rgba(255,255,255,0.92)"
                  strokeWidth={strokeW}
                  lineCap="round"
                  listening={false}
                  perfectDrawEnabled={false}
                />
              </>
            )}
          </Group>
        ) : (
          <Rect
            width={width}
            height={height}
            fill="#eceef8"
            listening={listening}
          />
        )}
      </Group>

      {hasBorder ? (
        <Rect
          width={width}
          height={height}
          cornerRadius={radius}
          stroke={element.borderColor}
          strokeWidth={borderWidth}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}
    </Group>
  );
}
