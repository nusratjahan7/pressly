"use client";

import { Group, Shape } from "react-konva";
import type Konva from "konva";
import type { QrElement } from "@/types";
import { getQrMatrix } from "@/lib/qr";

interface QrNodeProps {
  element: QrElement;
  width: number;
  height: number;
  listening?: boolean;
}

/**
 * QR body drawn at the local origin, directly in millimetres. One node draws
 * every module, so a dense code costs nothing to resize.
 */
export function QrNode({ element, width, height, listening = false }: QrNodeProps) {
  const matrix = getQrMatrix(element.value, element.errorCorrection);

  return (
    <Group listening={listening}>
      <Shape
        width={width}
        height={height}
        fill={element.background}
        sceneFunc={(context: Konva.Context, shape: Konva.Shape) => {
          context.beginPath();
          context.rect(0, 0, width, height);
          context.closePath();
          context.fillStrokeShape(shape);

          if (!matrix) return;

          const count = matrix.length;
          const quietZone = 4;
          const total = count + quietZone * 2;
          const module = Math.min(width, height) / total;
          const offsetX = (width - module * total) / 2;
          const offsetY = (height - module * total) / 2;

          context.fillStyle = element.foreground;
          for (let row = 0; row < count; row += 1) {
            const line = matrix[row]!;
            for (let col = 0; col < count; col += 1) {
              if (line[col]) {
                context.fillRect(
                  offsetX + (col + quietZone) * module,
                  offsetY + (row + quietZone) * module,
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
