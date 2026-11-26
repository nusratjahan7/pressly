"use client";

import { useState } from "react";
import { Group, Rect, Text } from "react-konva";
import type { Element, Page, PageSize } from "@/types";
import { resolvePageBackground } from "@/lib/backgrounds";
import {
  findLayoutGutters,
  getLargestEmptyFrameId,
  type LayoutGutter,
} from "@/lib/layouts";
import { getSafeMarginInset } from "@/lib/konva/geometry";
import { useEditorStore } from "@/store";
import { BackgroundNode } from "@/components/editor/canvas/konva/BackgroundNode";
import { ElementFrame } from "@/components/editor/canvas/konva/ElementFrame";
import { ptToMm, round } from "@/lib/units";

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
  selectedElementIds?: string[];
  swapTargetElementId?: string | null;
  croppingElementId?: string | null;
  dropHighlight?: boolean;
  animSeq?: number;
  onSelectPage?: (pageId: string) => void;
  onDoubleClickEmptyPage?: (pageId: string, localX: number, localY: number) => void;
  onOpenPhotoPicker?: (elementId: string, pageId: string) => void;
  onDoubleClickFrame?: (element: Element, pageId: string) => void;
  onContextMenuFrame?: (
    element: Element,
    pageId: string,
    clientX: number,
    clientY: number,
  ) => void;
  onFrameDragMove?: (elementId: string, pointerX: number, pointerY: number) => void;
  onFrameDragEndSwap?: (
    elementId: string,
    pointerX: number,
    pointerY: number,
  ) => boolean;
}

/**
 * One page of the spread. Renders background, layout/freeform frames,
 * interactive gutters between adjacent frames, and print guides.
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
  selectedElementIds = [],
  swapTargetElementId = null,
  croppingElementId = null,
  dropHighlight = false,
  animSeq = 0,
  onSelectPage,
  onDoubleClickEmptyPage,
  onOpenPhotoPicker,
  onDoubleClickFrame,
  onContextMenuFrame,
  onFrameDragMove,
  onFrameDragEndSwap,
}: PageNodeProps) {
  const background = resolvePageBackground(page);
  const inset = getSafeMarginInset(pageSize);
  const isEndPaper = Boolean(page.isEndPaper);
  const isLocked = Boolean(page.locked || isEndPaper);

  const visibleElements = page.elements.filter((el) => !el.hidden);
  const ordered = [...visibleElements]
    .filter((el) => !el.spanSpread)
    .sort((a, b) => a.zIndex - b.zIndex);
  const largestEmptyId = getLargestEmptyFrameId(visibleElements);
  const gutters = isLocked ? [] : findLayoutGutters(visibleElements);

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
          onDblClick={(event) => {
            if (!onDoubleClickEmptyPage) return;
            event.cancelBubble = true;
            const localPos = event.target.getRelativePointerPosition();
            if (localPos) {
              onDoubleClickEmptyPage(page.id, localPos.x, localPos.y);
            }
          }}
          onDblTap={(event) => {
            if (!onDoubleClickEmptyPage) return;
            event.cancelBubble = true;
            const localPos = event.target.getRelativePointerPosition();
            if (localPos) {
              onDoubleClickEmptyPage(page.id, localPos.x, localPos.y);
            }
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
                selected={
                  selectedElementIds.length > 0
                    ? selectedElementIds.includes(element.id)
                    : selectedElementId === element.id
                }
                decorative={isLocked}
                isLargestEmpty={element.id === largestEmptyId}
                isSwapTarget={element.id === swapTargetElementId}
                isCropping={element.id === croppingElementId}
                animSeq={animSeq}
                onOpenPhotoPicker={onOpenPhotoPicker}
                onDoubleClickFrame={onDoubleClickFrame}
                onContextMenuFrame={onContextMenuFrame}
                onFrameDragMove={onFrameDragMove}
                onFrameDragEndSwap={onFrameDragEndSwap}
              />
            ))
          : null}

        {gutters.map((gutter) => (
          <GutterHandle
            key={gutter.id}
            gutter={gutter}
            page={page}
            scale={scale}
          />
        ))}

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

      {dropHighlight ? (
        <Rect
          x={0}
          y={0}
          width={pageSize.w}
          height={pageSize.h}
          stroke="#5b65dc"
          strokeWidth={Math.max(0.4, 2 / scale)}
          fill="rgba(91,101,220,0.08)"
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
 * Draggable gutter handle between adjacent frames that resizes neighbors live.
 */
function GutterHandle({
  gutter,
  page,
  scale,
}: {
  gutter: LayoutGutter;
  page: Page;
  scale: number;
}) {
  const resizeGutterFrames = useEditorStore(
    (state) => state.resizeGutterFrames,
  );
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const [hovered, setHovered] = useState(false);

  const isVertical = gutter.axis === "vertical";
  const hitThickness = Math.max(gutter.gap, 4 / Math.max(scale, 0.01));
  const x = isVertical ? gutter.pos - hitThickness / 2 : gutter.start;
  const y = isVertical ? gutter.start : gutter.pos - hitThickness / 2;
  const width = isVertical ? hitThickness : gutter.end - gutter.start;
  const height = isVertical ? gutter.end - gutter.start : hitThickness;

  return (
    <Rect
      x={x}
      y={y}
      width={width}
      height={height}
      fill={hovered ? "rgba(91,101,220,0.35)" : "transparent"}
      draggable
      listening
      perfectDrawEnabled={false}
      onMouseEnter={(event) => {
        setHovered(true);
        const stage = event.target.getStage();
        if (stage) {
          stage.container().style.cursor = isVertical
            ? "col-resize"
            : "row-resize";
        }
      }}
      onMouseLeave={(event) => {
        setHovered(false);
        const stage = event.target.getStage();
        if (stage) stage.container().style.cursor = "";
      }}
      onDragStart={(event) => {
        event.cancelBubble = true;
        pushHistory();
      }}
      onDragMove={(event) => {
        event.cancelBubble = true;
        const node = event.target;
        const rawDelta = isVertical ? node.x() - x : node.y() - y;
        const delta = Math.max(
          gutter.minDelta,
          Math.min(gutter.maxDelta, rawDelta),
        );
        // Lock the handle onto the axis while dragging.
        node.position({
          x: isVertical ? x + delta : x,
          y: isVertical ? y : y + delta,
        });

        const updates: Array<{
          id: string;
          x?: number;
          y?: number;
          width?: number;
          height?: number;
        }> = [];
        for (const id of gutter.beforeIds) {
          const el = page.elements.find((candidate) => candidate.id === id);
          if (!el) continue;
          if (isVertical) {
            updates.push({ id, width: round(el.width + delta, 2) });
          } else {
            updates.push({ id, height: round(el.height + delta, 2) });
          }
        }
        for (const id of gutter.afterIds) {
          const el = page.elements.find((candidate) => candidate.id === id);
          if (!el) continue;
          if (isVertical) {
            updates.push({
              id,
              x: round(el.x + delta, 2),
              width: round(el.width - delta, 2),
            });
          } else {
            updates.push({
              id,
              y: round(el.y + delta, 2),
              height: round(el.height - delta, 2),
            });
          }
        }
        if (updates.length > 0) {
          resizeGutterFrames(page.id, updates, { commit: false });
        }
      }}
      onDragEnd={(event) => {
        event.cancelBubble = true;
        event.target.position({ x, y });
      }}
    />
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
        fontFamily="Montserrat, sans-serif"
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
