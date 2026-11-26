"use client";

import { Group, Rect, Text } from "react-konva";
import type { TextElement } from "@/types";
import { ptToMm } from "@/lib/units";

interface TextNodeProps {
  element: TextElement;
  listening?: boolean;
}

export function TextNode({ element, listening = false }: TextNodeProps) {
  const fontSize = Math.max(0.2, ptToMm(element.fontSize));
  const letterSpacing = ptToMm(element.letterSpacing);

  return (
    <Group
      x={element.x}
      y={element.y}
      width={element.width}
      height={element.height}
      rotation={element.rotation}
      opacity={element.opacity}
      listening={listening}
    >
      {element.text ? (
        <Text
          text={element.text}
          width={element.width}
          height={element.height}
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
          width={element.width}
          height={element.height}
          fill="transparent"
          listening={listening}
        />
      )}
    </Group>
  );
}
