import type { PageSize, ShapeElement } from "@/types";
import { createShapeElement } from "@/lib/elements";

export interface LayoutContext {
  pageSize: PageSize;
}

export interface LayoutPreset {
  id: string;
  name: string;
  description: string;
  build: (context: LayoutContext) => ShapeElement[];
}

const FRAME_STROKE = "#C3C8F2";

function frame(
  x: number,
  y: number,
  width: number,
  height: number,
  zIndex: number,
) {
  return createShapeElement(
    { x, y, width, height, zIndex },
    {
      fill: "transparent",
      stroke: FRAME_STROKE,
      strokeWidth: 0.4,
      shape: "rectangle",
      radius: 0,
    },
  );
}

export const LAYOUT_PRESETS: LayoutPreset[] = [
  {
    id: "full-bleed",
    name: "Full bleed",
    description: "One frame, edge to edge.",
    build: ({ pageSize }) => [frame(0, 0, pageSize.w, pageSize.h, 0)],
  },
  {
    id: "classic",
    name: "Classic margins",
    description: "A single generous image area.",
    build: ({ pageSize }) => {
      const m = Math.min(pageSize.w, pageSize.h) * 0.09;
      return [frame(m, m, pageSize.w - m * 2, pageSize.h - m * 2, 0)];
    },
  },
  {
    id: "two-column",
    name: "Two column",
    description: "Balanced pair with an 8 mm gutter.",
    build: ({ pageSize }) => {
      const m = Math.min(pageSize.w, pageSize.h) * 0.09;
      const gutter = 8;
      const columnW = (pageSize.w - m * 2 - gutter) / 2;
      const top = m;
      const height = pageSize.h - m * 2;
      return [
        frame(m, top, columnW, height, 0),
        frame(m + columnW + gutter, top, columnW, height, 1),
      ];
    },
  },
  {
    id: "three-column",
    name: "Three column",
    description: "An editorial triptych.",
    build: ({ pageSize }) => {
      const m = Math.min(pageSize.w, pageSize.h) * 0.08;
      const gutter = 6;
      const columnW = (pageSize.w - m * 2 - gutter * 2) / 3;
      const height = pageSize.h - m * 2;
      return [0, 1, 2].map((index) =>
        frame(m + index * (columnW + gutter), m, columnW, height, index),
      );
    },
  },
  {
    id: "hero",
    name: "Hero + pair",
    description: "One dominant frame, two supporting.",
    build: ({ pageSize }) => {
      const m = Math.min(pageSize.w, pageSize.h) * 0.08;
      const gutter = 6;
      const heroW = (pageSize.w - m * 2 - gutter) * 0.62;
      const sideW = pageSize.w - m * 2 - gutter - heroW;
      const heroH = pageSize.h - m * 2;
      const sideH = (heroH - gutter) / 2;
      return [
        frame(m, m, heroW, heroH, 0),
        frame(m + heroW + gutter, m, sideW, sideH, 1),
        frame(m + heroW + gutter, m + sideH + gutter, sideW, sideH, 2),
      ];
    },
  },
  {
    id: "cinema",
    name: "Cinema strip",
    description: "A wide still above a row of three.",
    build: ({ pageSize }) => {
      const m = Math.min(pageSize.w, pageSize.h) * 0.08;
      const gutter = 6;
      const wideH = (pageSize.h - m * 2 - gutter) * 0.56;
      const smallW = (pageSize.w - m * 2 - gutter * 2) / 3;
      const smallH = pageSize.h - m * 2 - gutter - wideH;
      return [
        frame(m, m, pageSize.w - m * 2, wideH, 0),
        ...[0, 1, 2].map((index) =>
          frame(
            m + index * (smallW + gutter),
            m + wideH + gutter,
            smallW,
            smallH,
            index + 1,
          ),
        ),
      ];
    },
  },
];
