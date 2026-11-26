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
 * Text body drawn at the local origin. The enclosing frame owns position,
 * rotation and opacity.
 */
export function TextNode({ element, width, height, listening = false }: TextNodeProps) {
  const fontSize = Math.max(0.2, ptToMm(element.fontSize));
  const letterSpacing = ptToMm(element.letterSpacing);

  return (
    <Group listening={listening}>
      {element.text ? (
        <Text
          text={element.text}
          width={width}
          height={height}
          fontFamily={`${element.fontFamily}, Inter, sans-serif`}
          fontSize={fontSize}
          fontStyle={element.fontWeight >= 600 ? "bold" : "normal"}
          lineHeight={Math.max(0.8, element.lineHeight)}
          letterSpacing={letterSpacing}
          fill={element.color}
          align={element.align}
          wrap="word"
          verticalAlign="top"
          perfectDrawEnabled={false}
          listening={listening}
        />
      ) : (
        // Empty text boxes still need a hit target so they can be selected.
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
