"use client";

import { useCallback, useMemo, useState } from "react";
import { Group, Layer, Line, Rect, Stage, Text } from "react-konva";
import type { Element, Page, PageSize } from "@/types";
import { getBackground } from "@/lib/backgrounds";
import { getLargestEmptyFrameId } from "@/lib/layouts";
import { getPageOffsetX, getSpreadLayout } from "@/lib/konva/geometry";
import { useEditorStore } from "@/store";
import { ptToMm } from "@/lib/units";
import { ElementFrame } from "@/components/editor/canvas/konva/ElementFrame";
import { PageNode } from "@/components/editor/canvas/konva/PageNode";
import { SelectionTransformer } from "@/components/editor/canvas/konva/SelectionTransformer";

export interface SpreadStageProps {
  width: number;
  height: number;
  /** Container-relative offset of the spread's top-left corner, in px. */
  panX: number;
  panY: number;
  /** Device pixels per millimetre. */
  scale: number;
  pageSize: PageSize;
  pages: Page[];
  pageLabels?: string[];
  spineText?: string;
  isCover?: boolean;
  spineWidth?: number;
  spineSelected?: boolean;
  showSafeMargin: boolean;
  showBleed: boolean;
  selectedElementId: string | null;
  selectedElementIds?: string[];
  croppingElementId?: string | null;
  dropHighlightPageId?: string | null;
  animSeq?: number;
  animPageIds?: string[];
  onSelectPage?: (pageId: string) => void;
  onDoubleClickEmptyPage?: (pageId: string, localX: number, localY: number) => void;
  onSelectSpine?: () => void;
  onEditSpine?: () => void;
  onClearSelection: () => void;
  onOpenPhotoPicker?: (elementId: string, pageId: string) => void;
  onDoubleClickFrame?: (element: Element, pageId: string) => void;
  onContextMenuFrame?: (
    element: Element,
    pageId: string,
    clientX: number,
    clientY: number,
  ) => void;
}

/**
 * The editing surface: pages, spine (on cover) or fold shadow, and an
 * unclipped overlay layer that hosts the selection transformer.
 */
export function SpreadStage({
  width,
  height,
  panX,
  panY,
  scale,
  pageSize,
  pages,
  pageLabels = [],
  spineText = "",
  isCover = false,
  spineWidth = 0,
  spineSelected = false,
  showSafeMargin,
  showBleed,
  selectedElementId,
  selectedElementIds = [],
  croppingElementId = null,
  dropHighlightPageId = null,
  animSeq = 0,
  animPageIds = [],
  onSelectPage,
  onDoubleClickEmptyPage,
  onSelectSpine,
  onEditSpine,
  onClearSelection,
  onOpenPhotoPicker,
  onDoubleClickFrame,
  onContextMenuFrame,
}: SpreadStageProps) {
  const swapFramePhotos = useEditorStore((state) => state.swapFramePhotos);
  const [swapTargetId, setSwapTargetId] = useState<string | null>(null);

  const displayPageCount = isCover ? pages.length : Math.max(2, pages.length);
  const effectiveSpine = isCover ? spineWidth : 0;

  const layout = useMemo(
    () => getSpreadLayout(pageSize, displayPageCount, effectiveSpine),
    [pageSize, displayPageCount, effectiveSpine],
  );

  const dpr =
    typeof window === "undefined"
      ? 1
      : Math.min(2, window.devicePixelRatio || 1);

  const findImageTargetAtPointer = useCallback(
    (sourceId: string, stageX: number, stageY: number): string | null => {
      const mmX = (stageX - panX) / Math.max(scale, 0.0001);
      const mmY = (stageY - panY) / Math.max(scale, 0.0001);

      for (let index = 0; index < pages.length; index += 1) {
        const page = pages[index]!;
        if (page.isEndPaper || page.locked) continue;
        const offsetX = getPageOffsetX(index, layout);
        for (const el of page.elements) {
          if (el.id === sourceId || el.type !== "image") continue;
          const left = offsetX + el.x;
          const top = el.y;
          if (
            mmX >= left &&
            mmX <= left + el.width &&
            mmY >= top &&
            mmY <= top + el.height
          ) {
            return el.id;
          }
        }
      }
      return null;
    },
    [pages, layout, panX, panY, scale],
  );

  const handleFrameDragMove = useCallback(
    (sourceId: string, pointerX: number, pointerY: number) => {
      const hit = findImageTargetAtPointer(sourceId, pointerX, pointerY);
      setSwapTargetId((prev) => (prev === hit ? prev : hit));
    },
    [findImageTargetAtPointer],
  );

  const handleFrameDragEndSwap = useCallback(
    (sourceId: string, pointerX: number, pointerY: number) => {
      const hit = findImageTargetAtPointer(sourceId, pointerX, pointerY);
      setSwapTargetId(null);
      if (hit) {
        swapFramePhotos(sourceId, hit);
        return true;
      }
      return false;
    },
    [findImageTargetAtPointer, swapFramePhotos],
  );

  const spanningItems = useMemo(
    () =>
      pages.flatMap((page, index) => {
        if (page.isEndPaper) return [];
        const pageOffsetX = getPageOffsetX(index, layout);
        return page.elements
          .filter((el) => Boolean(el.spanSpread))
          .sort((a, b) => a.zIndex - b.zIndex)
          .map((element) => ({ element, page, pageOffsetX }));
      }),
    [pages, layout],
  );

  const spreadLargestEmptyId = useMemo(
    () =>
      getLargestEmptyFrameId(
        pages.flatMap((p) => (p.isEndPaper ? [] : p.elements)),
      ),
    [pages],
  );

  // Locate selected elements so the transformer can attach across 1 or more nodes.
  const selected = useMemo((): {
    elements: Element[];
    pageOffsetX: number;
  } | null => {
    const ids =
      selectedElementIds.length > 0
        ? selectedElementIds
        : selectedElementId
          ? [selectedElementId]
          : [];
    if (ids.length === 0) return null;
    const idSet = new Set(ids);
    for (let index = 0; index < pages.length; index += 1) {
      const page = pages[index]!;
      const matched = page.elements.filter((candidate) => idSet.has(candidate.id));
      if (matched.length > 0) {
        return { elements: matched, pageOffsetX: getPageOffsetX(index, layout) };
      }
    }
    return null;
  }, [selectedElementId, selectedElementIds, pages, layout]);

  if (pages.length === 0 || width === 0 || height === 0) return null;

  const spine = layout.spineX;
  const hairline = Math.max(0.03, 0.6 / Math.max(scale, 0.0001));
  const spineBackground = pages[0] ? getBackground(pages[0].backgroundId) : null;
  const spineColor = spineBackground?.baseColor ?? "#122056";
  const spineTextColor =
    spineBackground?.tone === "dark"
      ? "rgba(255,255,255,0.68)"
      : "rgba(18,32,86,0.62)";
  const spineCreaseColor =
    spineBackground?.tone === "dark"
      ? "rgba(255,255,255,0.18)"
      : "rgba(18,32,86,0.16)";
  const showFadedBlankHalf = !isCover && pages.length === 1;
  const resolvedSpineText = spineText;
  const captionFontSize = Math.max(2.6, ptToMm(8.5));

  return (
    <Stage
      width={width}
      height={height}
      pixelRatio={dpr}
      listening
      onPointerDown={(event) => {
        const stage = event.target.getStage();
        if (stage && event.target === stage) onClearSelection();
      }}
    >
      <Layer>
        <Group x={panX} y={panY} scaleX={scale} scaleY={scale}>
          <Rect
            x={0.6}
            y={1.2}
            width={layout.spreadWidth}
            height={layout.spreadHeight}
            fill="rgba(18,32,86,0.10)"
            listening={false}
            perfectDrawEnabled={false}
          />

          {pages.map((page, index) => (
            <PageNode
              key={page.id}
              page={page}
              pageSize={pageSize}
              x={getPageOffsetX(index, layout)}
              scale={scale}
              dpr={dpr}
              showSafeMargin={showSafeMargin}
              showBleed={isCover ? false : showBleed}
              selectedElementId={selectedElementId}
              selectedElementIds={selectedElementIds}
              swapTargetElementId={swapTargetId}
              croppingElementId={croppingElementId}
              dropHighlight={dropHighlightPageId === page.id}
              animSeq={animPageIds.includes(page.id) ? animSeq : 0}
              onSelectPage={onSelectPage}
              onDoubleClickEmptyPage={onDoubleClickEmptyPage}
              onOpenPhotoPicker={onOpenPhotoPicker}
              onDoubleClickFrame={onDoubleClickFrame}
              onContextMenuFrame={onContextMenuFrame}
              onFrameDragMove={handleFrameDragMove}
              onFrameDragEndSwap={handleFrameDragEndSwap}
            />
          ))}

          {spanningItems.length > 0 ? (
            <Group
              clipX={0}
              clipY={0}
              clipWidth={layout.spreadWidth}
              clipHeight={layout.spreadHeight}
            >
              {spanningItems.map(({ element, page, pageOffsetX }) => (
                <ElementFrame
                  key={element.id}
                  element={element}
                  pageId={page.id}
                  pageOffsetX={pageOffsetX}
                  pageWidth={layout.spreadWidth}
                  pageHeight={layout.spreadHeight}
                  selected={
                    selectedElementIds.length > 0
                      ? selectedElementIds.includes(element.id)
                      : selectedElementId === element.id
                  }
                  decorative={Boolean(page.locked)}
                  isLargestEmpty={element.id === spreadLargestEmptyId}
                  isSwapTarget={element.id === swapTargetId}
                  isCropping={element.id === croppingElementId}
                  animSeq={animPageIds.includes(page.id) ? animSeq : 0}
                  onOpenPhotoPicker={onOpenPhotoPicker}
                  onDoubleClickFrame={onDoubleClickFrame}
                  onContextMenuFrame={onContextMenuFrame}
                  onFrameDragMove={handleFrameDragMove}
                  onFrameDragEndSwap={handleFrameDragEndSwap}
                />
              ))}
            </Group>
          ) : null}

          {showFadedBlankHalf ? (
            <Group x={layout.pageWidth} y={0} listening={false}>
              <Rect
                x={0}
                y={0}
                width={layout.pageWidth}
                height={layout.pageHeight}
                fill="rgba(38,42,60,0.18)"
                listening={false}
                perfectDrawEnabled={false}
              />
              <Rect
                x={0}
                y={0}
                width={layout.pageWidth}
                height={layout.pageHeight}
                stroke="rgba(18,32,86,0.10)"
                strokeWidth={Math.max(0.03, 1 / scale)}
                dash={[2, 2]}
                listening={false}
                perfectDrawEnabled={false}
              />
            </Group>
          ) : null}

          {isCover && layout.spineWidth > 0 && spine !== null ? (
            <Group
              listening={Boolean(onSelectSpine || onEditSpine)}
              onPointerDown={(event) => {
                event.cancelBubble = true;
                onSelectSpine?.();
              }}
              onDblClick={(event) => {
                event.cancelBubble = true;
                onEditSpine?.();
              }}
              onDblTap={(event) => {
                event.cancelBubble = true;
                onEditSpine?.();
              }}
            >
              <Rect
                x={spine}
                y={0}
                width={layout.spineWidth}
                height={layout.spreadHeight}
                fill={spineColor}
                listening
                perfectDrawEnabled={false}
              />
              <Rect
                x={spine}
                y={0}
                width={layout.spineWidth}
                height={layout.spreadHeight}
                fillLinearGradientStartPoint={{ x: 0, y: 0 }}
                fillLinearGradientEndPoint={{ x: layout.spineWidth, y: 0 }}
                fillLinearGradientColorStops={[
                  0,
                  "rgba(0,0,0,0.22)",
                  0.18,
                  "rgba(0,0,0,0.05)",
                  0.5,
                  "rgba(255,255,255,0.08)",
                  0.82,
                  "rgba(0,0,0,0.05)",
                  1,
                  "rgba(0,0,0,0.22)",
                ]}
                listening={false}
                perfectDrawEnabled={false}
              />
              <Line
                points={[spine, 0, spine, layout.spreadHeight]}
                stroke={spineCreaseColor}
                strokeWidth={hairline}
                listening={false}
                perfectDrawEnabled={false}
              />
              <Line
                points={[
                  spine + layout.spineWidth,
                  0,
                  spine + layout.spineWidth,
                  layout.spreadHeight,
                ]}
                stroke={spineCreaseColor}
                strokeWidth={hairline}
                listening={false}
                perfectDrawEnabled={false}
              />
              {layout.spineWidth >= 3.5 && resolvedSpineText ? (
                (() => {
                  const spineFontSize = Math.min(layout.spineWidth * 0.52, ptToMm(7.5));
                  return (
                    <Text
                      x={spine + (layout.spineWidth - spineFontSize) / 2}
                      y={layout.spreadHeight * 0.85}
                      width={layout.spreadHeight * 0.7}
                      rotation={-90}
                      text={resolvedSpineText}
                      fontSize={spineFontSize}
                      fontFamily="Montserrat, sans-serif"
                      fontStyle="600"
                      letterSpacing={0.5}
                      fill={spineTextColor}
                      align="center"
                      ellipsis
                      wrap="none"
                      listening={false}
                      perfectDrawEnabled={false}
                    />
                  );
                })()
              ) : null}
              {spineSelected ? (
                <Rect
                  x={spine}
                  y={0}
                  width={layout.spineWidth}
                  height={layout.spreadHeight}
                  stroke="#5b65dc"
                  strokeWidth={Math.max(0.15, 1.5 / Math.max(scale, 0.0001))}
                  listening={false}
                  perfectDrawEnabled={false}
                />
              ) : null}
            </Group>
          ) : spine !== null ? (
            <>
              <Rect
                x={spine - 1.6}
                y={0}
                width={3.2}
                height={layout.spreadHeight}
                fillLinearGradientStartPoint={{ x: -1.6, y: 0 }}
                fillLinearGradientEndPoint={{ x: 1.6, y: 0 }}
                fillLinearGradientColorStops={[
                  0,
                  "rgba(18,32,86,0)",
                  0.5,
                  "rgba(18,32,86,0.16)",
                  1,
                  "rgba(18,32,86,0)",
                ]}
                listening={false}
                perfectDrawEnabled={false}
              />
              <Line
                points={[spine, 0, spine, layout.spreadHeight]}
                stroke="rgba(18,32,86,0.10)"
                strokeWidth={hairline}
                listening={false}
                perfectDrawEnabled={false}
              />
            </>
          ) : null}

          {isCover && showBleed && pageSize.bleed > 0 ? (
            <Rect
              x={-pageSize.bleed}
              y={-pageSize.bleed}
              width={layout.spreadWidth + pageSize.bleed * 2}
              height={layout.spreadHeight + pageSize.bleed * 2}
              stroke="#e2764d"
              strokeWidth={Math.max(0.05, 1 / scale)}
              dash={[4 / scale, 3 / scale]}
              listening={false}
              perfectDrawEnabled={false}
            />
          ) : null}

          {pageLabels.map((label, index) => (
            <Text
              key={`caption-${index}`}
              x={getPageOffsetX(index, layout)}
              y={layout.spreadHeight + 5}
              width={layout.pageWidth}
              text={label}
              fontSize={captionFontSize}
              fontFamily="Montserrat, sans-serif"
              fill="#565E8E"
              opacity={0.78}
              align="center"
              listening={false}
              perfectDrawEnabled={false}
            />
          ))}
        </Group>
      </Layer>

      {/* Overlay layer: outside the clipping groups, so handles stay visible. */}
      <Layer>
        <Group x={panX} y={panY} scaleX={scale} scaleY={scale}>
          <SelectionTransformer
            elements={croppingElementId ? [] : (selected?.elements ?? [])}
            pageOffsetX={selected?.pageOffsetX ?? 0}
            pageWidth={
              selected?.elements.some((el) => el.spanSpread)
                ? layout.spreadWidth
                : layout.pageWidth
            }
            pageHeight={layout.pageHeight}
            scale={scale}
          />
        </Group>
      </Layer>
    </Stage>
  );
}
