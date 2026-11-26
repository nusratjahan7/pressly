"use client";

import { useEffect, useMemo, useRef } from "react";
import type Konva from "konva";
import { Group, Image as KonvaImage, Rect } from "react-konva";
import type { ResolvedPageBackground } from "@/lib/backgrounds";
import { getGradientPoints } from "@/lib/shapes";
import { getPatternTile, getPatternTileScale } from "@/lib/konva/patternTiles";
import { useHtmlImage } from "@/components/editor/canvas/useHtmlImage";

interface BackgroundNodeProps {
  background: ResolvedPageBackground;
  width: number;
  height: number;
  scale: number;
  dpr?: number;
}

/**
 * Draws a page background using Konva primitives. Supports solid colours,
 * linear gradients, repeating pattern & paper texture tiles, uploaded images,
 * opacity over white paper stock, and blur.
 */
export function BackgroundNode({
  background,
  width,
  height,
  scale,
  dpr = 1,
}: BackgroundNodeProps) {
  const pattern = background.pdfPattern;
  const { image: bgImage } = useHtmlImage(background.imageSrc ?? "");
  const imgRef = useRef<Konva.Image>(null);

  const tile = useMemo(
    () => (pattern ? getPatternTile(pattern, scale, dpr) : null),
    [pattern, scale, dpr],
  );

  const tileScale = useMemo(
    () => (pattern && tile ? getPatternTileScale(pattern, tile) : 1),
    [pattern, tile],
  );

  const blurredCanvas = useMemo(() => {
    if (!bgImage || !background.blur || background.blur <= 0) return null;
    if (typeof document === "undefined") return null;
    const targetW = Math.min(720, Math.max(64, Math.round(width * scale * dpr)));
    const targetH = Math.min(960, Math.max(64, Math.round(height * scale * dpr)));
    const canvas = document.createElement("canvas");
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;

    const imgScale = Math.max(
      targetW / Math.max(1, bgImage.naturalWidth),
      targetH / Math.max(1, bgImage.naturalHeight),
    );
    const drawW = bgImage.naturalWidth * imgScale;
    const drawH = bgImage.naturalHeight * imgScale;
    ctx.filter = `blur(${Math.max(0.5, background.blur * (scale * dpr * 0.35))}px)`;
    ctx.drawImage(
      bgImage,
      (targetW - drawW) / 2,
      (targetH - drawH) / 2,
      drawW,
      drawH,
    );
    return canvas;
  }, [bgImage, background.blur, width, height, scale, dpr]);

  useEffect(() => {
    imgRef.current?.getLayer()?.batchDraw();
  }, [blurredCanvas, bgImage]);

  const gradPoints = useMemo(
    () =>
      background.gradient
        ? getGradientPoints(width, height, background.gradient.angle, false)
        : null,
    [background.gradient, width, height],
  );

  const coverCrop = useMemo(() => {
    if (!bgImage) return undefined;
    const natW = Math.max(1, bgImage.naturalWidth || 1);
    const natH = Math.max(1, bgImage.naturalHeight || 1);
    const ratio = Math.max(width / natW, height / natH);
    const viewW = width / ratio;
    const viewH = height / ratio;
    return {
      x: (natW - viewW) / 2,
      y: (natH - viewH) / 2,
      width: viewW,
      height: viewH,
    };
  }, [bgImage, width, height]);

  return (
    <Group clipX={0} clipY={0} clipWidth={width} clipHeight={height} listening={false}>
      <Rect
        x={0}
        y={0}
        width={width}
        height={height}
        fill="#FFFFFF"
        listening={false}
        perfectDrawEnabled={false}
      />

      <Group opacity={background.opacity} listening={false}>
        {background.gradient && gradPoints ? (
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fillPriority="linear-gradient"
            fillLinearGradientStartPoint={gradPoints.start}
            fillLinearGradientEndPoint={gradPoints.end}
            fillLinearGradientColorStops={[
              0,
              background.gradient.from,
              1,
              background.gradient.to,
            ]}
            listening={false}
            perfectDrawEnabled={false}
          />
        ) : (
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fill={background.baseColor}
            listening={false}
            perfectDrawEnabled={false}
          />
        )}

        {tile ? (
          <Rect
            x={0}
            y={0}
            width={width}
            height={height}
            fillPatternImage={tile as unknown as HTMLImageElement}
            fillPatternRepeat="repeat"
            fillPatternScaleX={tileScale}
            fillPatternScaleY={tileScale}
            listening={false}
            perfectDrawEnabled={false}
          />
        ) : null}

        {background.imageSrc && (blurredCanvas || bgImage) ? (
          blurredCanvas ? (
            <KonvaImage
              ref={imgRef}
              image={blurredCanvas as unknown as HTMLImageElement}
              x={0}
              y={0}
              width={width}
              height={height}
              listening={false}
              perfectDrawEnabled={false}
            />
          ) : (
            <KonvaImage
              ref={imgRef}
              image={bgImage!}
              x={0}
              y={0}
              width={width}
              height={height}
              crop={coverCrop}
              listening={false}
              perfectDrawEnabled={false}
            />
          )
        ) : null}
      </Group>
    </Group>
  );
}
