"use client";

import { Group, Rect, Text } from "react-konva";
import type { Page, PageSize } from "@/types";
import { getBackground } from "@/lib/backgrounds";
import { getSafeMarginInset } from "@/lib/konva/geometry";
import { BackgroundNode } from "@/components/editor/canvas/konva/BackgroundNode";
import { ElementFrame } from "@/components/editor/canvas/konva/ElementFrame";
import { ptToMm } from "@/lib/units";

export const END_PAPER_FILL = "#262A3C";
export const END_PAPER_TEXT = "This page can not be edited";
export const END_PAPER_TEXT_COLOR = "rgba(238, 240, 254, 0.62)";

interface PageNodeProps {
  page: Page;
  pageSize: PageSize;
  /** Page offset within the spread, in millimetres. */
  x: number;
  scale: number;
  dpr: number;
  showSafeMargin: boolean;
  showBleed: boolean;
  selectedElementId?: string | null;
  onSelectPage?: (pageId: string) => void;
}

/**
 * One page of the spread. Elements stay clipped to the trim so nothing can
 * bleed across the spine unless it is explicitly a spread-spanning element.
 */
export function PageNode({
  page,
  pageSize,
  x,
  scale,
  dpr,
  showSafeMargin,
  showBleed,
  selectedElementId = null,
  onSelectPage,
}: PageNodeProps) {
  const background = getBackground(page.backgroundId);
  const inset = getSafeMarginInset(pageSize);
  const isEndPaper = Boolean(page.isEndPaper);
  const isLocked = Boolean(page.locked || isEndPaper);

  const ordered = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <Group x={x} y={0}>
      {isEndPaper ? (
        <Rect
          x={0}
          y={0}
          width={pageSize.w}
          height={pageSize.h}
          fill={END_PAPER_FILL}
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : (
        <BackgroundNode
          background={background}
          width={pageSize.w}
          height={pageSize.h}
          scale={scale}
          dpr={dpr}
        />
      )}

      {!isLocked && onSelectPage ? (
        <Rect
          x={0}
          y={0}
          width={pageSize.w}
          height={pageSize.h}
          fill="transparent"
          listening
          perfectDrawEnabled={false}
          onPointerDown={(event) => {
            event.cancelBubble = true;
            onSelectPage(page.id);
          }}
        />
      ) : null}

      <Group
        clipX={0}
        clipY={0}
        clipWidth={pageSize.w}
        clipHeight={pageSize.h}
      >
        {!isEndPaper
          ? ordered.map((element) => (
              <ElementFrame
                key={element.id}
                element={element}
                pageId={page.id}
                pageOffsetX={0}
                pageWidth={pageSize.w}
                pageHeight={pageSize.h}
                selected={selectedElementId === element.id}
                decorative={isLocked}
              />
            ))
          : null}

        {isLocked ? <LockedOverlay page={page} pageSize={pageSize} /> : null}
      </Group>

      {!isEndPaper && showBleed && pageSize.bleed > 0 ? (
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

      {!isEndPaper && showSafeMargin ? (
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
        stroke={isEndPaper ? "rgba(255,255,255,0.08)" : "rgba(18,32,86,0.14)"}
        strokeWidth={Math.max(0.03, 1 / scale)}
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}

/**
 * Non-interactive overlay for pages that cannot hold content: the end papers
 * and any page marked locked.
 */
function LockedOverlay({
  page,
  pageSize,
}: {
  page: Page;
  pageSize: PageSize;
}) {
  const isEndPaper = Boolean(page.isEndPaper);
  const message = isEndPaper ? END_PAPER_TEXT : "This page is locked";

  return (
    <Group listening={false}>
      {!isEndPaper ? (
        <Rect
          width={pageSize.w}
          height={pageSize.h}
          fill="rgba(18,32,86,0.08)"
          listening={false}
          perfectDrawEnabled={false}
        />
      ) : null}
      <Text
        x={pageSize.w * 0.1}
        y={pageSize.h / 2 - 4}
        width={pageSize.w * 0.8}
        text={message}
        fontSize={Math.max(2.6, ptToMm(9.5))}
        fontFamily="Inter, sans-serif"
        fill={isEndPaper ? END_PAPER_TEXT_COLOR : "#565E8E"}
        opacity={isEndPaper ? 1 : 0.85}
        align="center"
        wrap="word"
        listening={false}
        perfectDrawEnabled={false}
      />
    </Group>
  );
}
