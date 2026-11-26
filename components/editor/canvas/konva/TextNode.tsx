"use client";

import { Group, Rect, Text } from "react-konva";
import type { TextElement } from "@/types";
import { ptToMm } from "@/lib/units";

interface TextNodeProps {
  element: TextElement;
  width: number;
  height: number;
  listening?: boolean;
}

/**
 * Text body drawn at the local origin. When `isPlaceholder` is set (or empty),
 * renders a dashed layout outline with placeholder text.
 */
export function TextNode({
  element,
  width,
  height,
  listening = false,
}: TextNodeProps) {
  const fontSize = Math.max(0.2, ptToMm(element.fontSize));
  const letterSpacing = ptToMm(element.letterSpacing);
  const showPlaceholder = Boolean(element.isPlaceholder || !element.text);

  return (
    <Group listening={listening}>
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

      {element.text ? (
        <Text
          text={element.text}
          width={width}
          height={height}
          fontFamily={`${element.fontFamily}, Montserrat, sans-serif`}
          fontSize={fontSize}
          fontStyle={element.fontWeight >= 600 ? "bold" : "normal"}
          lineHeight={Math.max(0.8, element.lineHeight)}
          letterSpacing={letterSpacing}
          fill={element.color}
          align={element.align}
          wrap="word"
          verticalAlign={showPlaceholder ? "middle" : "top"}
          perfectDrawEnabled={false}
          listening={listening}
        />
      ) : (
        <Rect
          width={width}
          height={height}
          fill="transparent"
          listening={listening}
        />
      )}
    </Group>
  );
}
