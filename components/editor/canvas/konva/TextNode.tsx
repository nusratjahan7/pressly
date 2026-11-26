"use client";

import { useEffect, useRef, useState } from "react";
import type Konva from "konva";
import { Group, Rect, Text, TextPath } from "react-konva";
import type { TextElement } from "@/types";
import { ensureGoogleFontLoaded, subscribeFontLoads } from "@/lib/fonts";
import { buildCurvedTextPath, DEFAULT_CURVE_ARC } from "@/lib/textCurve";
import { ptToMm } from "@/lib/units";

interface TextNodeProps {
  element: TextElement;
  width: number;
  height: number;
  listening?: boolean;
}

/**
 * Estimates whether text overflows a fixed-height box.
 */
function textOverflowsFixedBox(
  text: string,
  width: number,
  height: number,
  fontSizeMm: number,
  lineHeight: number,
): boolean {
  if (!text) return false;
  const approxCharW = Math.max(0.5, fontSizeMm * 0.56);
  const charsPerLine = Math.max(1, Math.floor(width / approxCharW));
  let totalLines = 0;
  for (const para of text.split("\n")) {
    totalLines += Math.max(1, Math.ceil(para.length / charsPerLine));
  }
  const requiredHeight = totalLines * fontSizeMm * Math.max(0.8, lineHeight);
  return requiredHeight > height + 0.8;
}

/**
 * Text body drawn at the local origin. Supports webfont loading, italic,
 * underline, uppercase, highlight fill, shadow, outline, curved TextPath,
 * and fixed-box clipping with overflow indicator.
 */
export function TextNode({
  element,
  width,
  height,
  listening = false,
}: TextNodeProps) {
  const [fontTick, setFontTick] = useState(0);
  const groupRef = useRef<Konva.Group>(null);

  useEffect(() => {
    ensureGoogleFontLoaded(
      element.fontFamily,
      element.fontWeight,
      element.fontStyle === "italic",
    );
    return subscribeFontLoads(() => {
      setFontTick((n) => n + 1);
      groupRef.current?.getLayer()?.batchDraw();
    });
  }, [element.fontFamily, element.fontWeight, element.fontStyle]);

  const fontSize = Math.max(0.2, ptToMm(element.fontSize));
  const letterSpacing = ptToMm(element.letterSpacing);
  const showPlaceholder = Boolean(element.isPlaceholder || !element.text);
  const displayText =
    element.textTransform === "uppercase"
      ? element.text.toUpperCase()
      : element.text;
  const fontStyleStr = `${element.fontStyle === "italic" ? "italic " : ""}${element.fontWeight}`;
  const fontFamilyStr = `"${element.fontFamily}", "Montserrat", sans-serif`;
  const hasHighlight =
    Boolean(element.textHighlight) && element.textHighlight !== "transparent";
  const isFixed = element.boxMode === "fixed";
  const overflows =
    isFixed &&
    !element.curvedText &&
    textOverflowsFixedBox(
      displayText,
      width,
      height,
      fontSize,
      element.lineHeight,
    );

  const curveArc = element.curveRadius ?? DEFAULT_CURVE_ARC;
  const { d: pathData } = buildCurvedTextPath(width, height, curveArc);

  return (
    <Group
      ref={groupRef}
      clipX={isFixed ? 0 : undefined}
      clipY={isFixed ? 0 : undefined}
      clipWidth={isFixed ? width : undefined}
      clipHeight={isFixed ? height : undefined}
      listening={listening}
    >
      {hasHighlight ? (
        <Rect
          width={width}
          height={height}
          fill={element.textHighlight}
          cornerRadius={1}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}

      {showPlaceholder ? (
        <Rect
          width={width}
          height={height}
          stroke="rgba(18,32,86,0.32)"
          strokeWidth={0.45}
          dash={[2, 1.5]}
          fill="rgba(255,255,255,0.001)"
          listening={listening}
          perfectDrawEnabled={false}
        />
      ) : null}

      {displayText ? (
        element.curvedText ? (
          <TextPath
            key={`tp-${fontTick}`}
            data={pathData}
            text={displayText}
            fontFamily={fontFamilyStr}
            fontSize={fontSize}
            fontStyle={fontStyleStr}
            letterSpacing={letterSpacing}
            fill={element.color}
            align={element.align}
            textDecoration={
              element.textDecoration === "underline" ? "underline" : ""
            }
            stroke={element.textOutline ? (element.textOutlineColor ?? "#5B65DC") : undefined}
            strokeWidth={element.textOutline ? Math.max(0.35, fontSize * 0.12) : 0}
            fillAfterStrokeEnabled
            shadowColor={element.textShadow ? "rgba(18,32,86,0.48)" : undefined}
            shadowBlur={element.textShadow ? Math.max(1.2, fontSize * 0.22) : 0}
            shadowOffsetX={element.textShadow ? Math.max(0.4, fontSize * 0.08) : 0}
            shadowOffsetY={element.textShadow ? Math.max(0.6, fontSize * 0.12) : 0}
            listening={listening}
          />
        ) : (
          <Text
            key={`tx-${fontTick}`}
            text={displayText}
            width={width}
            height={height}
            fontFamily={fontFamilyStr}
            fontSize={fontSize}
            fontStyle={fontStyleStr}
            textDecoration={
              element.textDecoration === "underline" ? "underline" : ""
            }
            lineHeight={Math.max(0.8, element.lineHeight)}
            letterSpacing={letterSpacing}
            fill={element.color}
            align={element.align}
            wrap="word"
            verticalAlign={showPlaceholder ? "middle" : "top"}
            stroke={element.textOutline ? (element.textOutlineColor ?? "#5B65DC") : undefined}
            strokeWidth={element.textOutline ? Math.max(0.35, fontSize * 0.12) : 0}
            fillAfterStrokeEnabled
            shadowColor={element.textShadow ? "rgba(18,32,86,0.48)" : undefined}
            shadowBlur={element.textShadow ? Math.max(1.2, fontSize * 0.22) : 0}
            shadowOffsetX={element.textShadow ? Math.max(0.4, fontSize * 0.08) : 0}
            shadowOffsetY={element.textShadow ? Math.max(0.6, fontSize * 0.12) : 0}
            perfectDrawEnabled={false}
            listening={listening}
          />
        )
      ) : (
        <Rect
          width={width}
          height={height}
          fill="transparent"
          listening={listening}
        />
      )}

      {overflows ? (
        <Group x={Math.max(0, width - 5.2)} y={Math.max(0, height - 5.2)} listening={false}>
          <Rect
            width={4.6}
            height={4.6}
            cornerRadius={1}
            fill="#C0392B"
            listening={false}
          />
          <Text
            width={4.6}
            height={4.6}
            text="+"
            fontSize={3.6}
            fontStyle="bold"
            fill="#FFFFFF"
            align="center"
            verticalAlign="middle"
            listening={false}
          />
        </Group>
      ) : null}
    </Group>
  );
}
