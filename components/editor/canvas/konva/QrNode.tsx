"use client";

import { Group, Shape } from "react-konva";
import type Konva from "konva";
import type { QrElement } from "@/types";
import { getQrMatrix } from "@/lib/qr";

interface QrNodeProps {
  element: QrElement;
  listening?: boolean;
}

export function QrNode({ element, listening = false }: QrNodeProps) {
  const matrix = getQrMatrix(element.value, element.errorCorrection);

  return (
    <Group
      x={element.x}
      y={element.y}
      rotation={element.rotation}
      opacity={element.opacity}
      listening={listening}
    >
      <Shape
        width={element.width}
        height={element.height}
        fill={element.background}
        sceneFunc={(context: Konva.Context, shape: Konva.Shape) => {
          context.beginPath();
          context.rect(0, 0, element.width, element.height);
          context.closePath();
          context.fillStrokeShape(shape);

          if (!matrix) return;

          const count = matrix.length;
          const quietZone = 4;
          const total = count + quietZone * 2;
          const module = element.width / total;
          context.fillStyle = element.foreground;
          for (let row = 0; row < count; row += 1) {
            const line = matrix[row]!;
            for (let col = 0; col < count; col += 1) {
              if (line[col]) {
                context.fillRect(
                  (col + quietZone) * module,
                  (row + quietZone) * module,
                  module,
                  module,
                );
              }
            }
          }
        }}
        perfectDrawEnabled={false}
        listening={listening}
      />
    </Group>
  );
}
