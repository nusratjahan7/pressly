"use client";

import { Group, Rect } from "react-konva";
import type { Element, Page, PageSize } from "@/types";
import { getBackground } from "@/lib/backgrounds";
import { getSafeMarginInset } from "@/lib/konva/geometry";
import { BackgroundNode } from "@/components/editor/canvas/konva/BackgroundNode";
import { ElementNode } from "@/components/editor/canvas/konva/ElementNode";

interface PageNodeProps {
  page: Page;
  pageSize: PageSize;
  x: number;
  scale: number;
  dpr: number;
  showSafeMargin: boolean;
  showBleed: boolean;
  decorative?: boolean;
}


export function PageNode({
  page,
  pageSize,
  x,
  scale,
  dpr,
  showSafeMargin,
  showBleed,
  decorative = false,
}: PageNodeProps) {
  const background = getBackground(page.backgroundId);
  const inset = getSafeMarginInset(pageSize);

  const ordered = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Group x={x} y={0}>
      <BackgroundNode
        background={background}
        width={pageSize.w}
        height={pageSize.h}
        scale={scale}
        dpr={dpr}
      />

      <Group
        clipX={0}
        clipY={0}
        clipWidth={pageSize.w}
        clipHeight={pageSize.h}
      >
        {ordered.map((element: Element) => (
          <ElementNode
            key={element.id}
            element={element}
            decorative={decorative}
          />
        ))}
      </Group>

      {showBleed && pageSize.bleed > 0 ? (
        <Rect
          x={-pageSize.bleed}
          y={-pageSize.bleed}
          width={pageSize.w + pageSize.bleed * 2}
          height={pageSize.h + pageSize.bleed * 2}
          stroke="#e2764d"
          strokeWidth={Math.max(0.05, 1 / scale)}
          dash={[4 / scale, 3 / scale]}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}

      {showSafeMargin ? (
        <Rect
          x={inset}
          y={inset}
          width={pageSize.w - inset * 2}
          height={pageSize.h - inset * 2}
          stroke="#5b65dc"
          opacity={0.55}
          strokeWidth={Math.max(0.05, 1 / scale)}
          dash={[3 / scale, 3 / scale]}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}

      <Rect
        x={0}
        y={0}
        width={pageSize.w}
        height={pageSize.h}
        stroke="rgba(18,32,86,0.14)"
        strokeWidth={Math.max(0.03, 1 / scale)}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}
