"use client";

import { useEffect, useMemo, useRef } from "react";
import dynamic from "next/dynamic";
import { useEditorStore } from "@/store";
import { useCurrentSpread, useSpreads } from "@/store/selectors";
import { useElementSize } from "@/lib/useElementSize";
import { formatDimensions, formatNumber } from "@/lib/units";
import { getSpreadLabel } from "@/lib/spreads";
import { getFitScale, getSpreadLayout } from "@/lib/konva/geometry";
import { useStagePanZoom } from "@/components/editor/canvas/konva/useStagePanZoom";
import { EmptyState } from "@/components/editor/EmptyState";
import { Button } from "@/components/ui/button";

// Konva touches `window` at import time, so the stage must never run on the server.
const SpreadStage = dynamic(
  () =>
    import("@/components/editor/canvas/konva/SpreadStage").then(
      (module) => module.SpreadStage,
    ),
  { ssr: false },
);

export function CanvasWorkspace() {
  const project = useEditorStore((state) => state.project);
  const spreadIndex = useEditorStore((state) => state.ui.spreadIndex);
  const showSafeMargin = useEditorStore((state) => state.ui.showSafeMargin);
  const showBleed = useEditorStore((state) => state.ui.showBleed);
  const setViewCenter = useEditorStore((state) => state.setViewCenter);
  const addSpread = useEditorStore((state) => state.addSpread);
  const { spread } = useCurrentSpread();
  const spreads = useSpreads();
  const { ref, size, element } = useElementSize<HTMLDivElement>();

  const pages = useMemo(
    () =>
      spread?.pageIndices
        .map((pageIndex) => project.pages[pageIndex])
        .filter((page): page is NonNullable<typeof page> => Boolean(page)) ?? [],
    [spread, project.pages],
  );

  const layout = useMemo(
    () => getSpreadLayout(project.pageSize, pages.length),
    [project.pageSize, pages.length],
  );

  const fitScale = useMemo(
    () => getFitScale(layout, size.width, size.height),
    [layout, size.width, size.height],
  );

  // Recentre only when the spread itself changes, not on every container resize
  // (which would fight a pan the user just made).
  const centredFor = useRef<string | null>(null);
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    const key = `${spreadIndex}:${layout.spreadWidth}x${layout.spreadHeight}`;
    if (centredFor.current === key) return;
    centredFor.current = key;
    setViewCenter({
      x: layout.spreadWidth / 2,
      y: layout.spreadHeight / 2,
    });
  }, [
    size.width,
    size.height,
    spreadIndex,
    layout.spreadWidth,
    layout.spreadHeight,
    setViewCenter,
  ]);

  const { transform, cursor, handlers } = useStagePanZoom({
    container: element,
    layout,
    fitScale,
    containerWidth: size.width,
    containerHeight: size.height,
  });

  const spreadLabel = spread
    ? getSpreadLabel(spread, project.pages)
    : "No spread";

  const ready = pages.length > 0 && size.width > 0 && size.height > 0;

  return (
    <section
      ref={ref}
      aria-label="Canvas workspace"
      className="dotted-canvas relative min-h-0 flex-1 overflow-hidden overscroll-contain"
      style={{ cursor }}
      {...handlers}
    >
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-line bg-surface/85 px-3 py-1.5 text-[11px] shadow-sm backdrop-blur">
        <span className="truncate font-semibold text-ink">{spreadLabel}</span>
        <span aria-hidden="true" className="size-1 shrink-0 rounded-full bg-line-strong" />
        <span className="whitespace-nowrap text-ink-muted">
          {formatDimensions(project.pageSize.w, project.pageSize.h)}
        </span>
        <span
          aria-hidden="true"
          className="hidden size-1 rounded-full bg-line-strong md:inline-block"
        />
        <span className="hidden text-ink-subtle md:inline">
          Bleed {formatNumber(project.pageSize.bleed, 1)} mm
        </span>
      </div>

      {ready ? (
        <SpreadStage
          width={size.width}
          height={size.height}
          panX={transform.panX}
          panY={transform.panY}
          scale={transform.scale}
          pageSize={project.pageSize}
          pages={pages}
          showSafeMargin={showSafeMargin}
          showBleed={showBleed}
        />
      ) : pages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <EmptyState
            title="A blank issue"
            description="Add a spread to begin composing your publication."
            action={
              <Button variant="primary" size="sm" onClick={addSpread}>
                Add spread
              </Button>
            }
          />
        </div>
      ) : null}

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 right-5 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle lg:flex"
      >
        <span>
          {String(spreadIndex + 1)} / {spreads.length}
        </span>
      </div>
    </section>
  );
}
