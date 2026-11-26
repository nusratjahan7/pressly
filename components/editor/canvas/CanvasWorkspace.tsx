"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store";
import { useCurrentSpread, useSpreads } from "@/store/selectors";
import { useElementSize } from "@/lib/useElementSize";
import { formatDimensions, formatNumber } from "@/lib/units";
import { getPageLabel, getSpreadLabel } from "@/lib/spreads";
import { SpreadView } from "@/components/editor/canvas/SpreadView";
import { EmptyState } from "@/components/editor/EmptyState";
import { Button } from "@/components/ui/button";

export function CanvasWorkspace() {
  const project = useEditorStore((state) => state.project);
  const zoom = useEditorStore((state) => state.ui.zoom);
  const spreadIndex = useEditorStore((state) => state.ui.spreadIndex);
  const selectedElementId = useEditorStore(
    (state) => state.selection.elementId,
  );
  const addSpread = useEditorStore((state) => state.addSpread);
  const { spread } = useCurrentSpread();
  const spreads = useSpreads();
  const { ref, size } = useElementSize<HTMLDivElement>();

  const items = useMemo(() => {
    if (!spread) return [];
    return spread.pageIndices
      .map((pageIndex) => {
        const page = project.pages[pageIndex];
        if (!page) return null;
        return {
          page,
          pageIndex,
          label: getPageLabel(pageIndex, project.pages),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [spread, project.pages]);

  const spreadLabel = spread
    ? getSpreadLabel(spread, project.pages)
    : "No spread";

  const fitScale = useMemo(() => {
    if (size.width === 0 || size.height === 0) return 0;
    const horizontalPadding = size.width < 640 ? 48 : 128;
    const verticalPadding = size.height < 560 ? 48 : 112;
    const availableWidth = Math.max(80, size.width - horizontalPadding);
    const availableHeight = Math.max(80, size.height - verticalPadding - 30);
    const spreadWidth = project.pageSize.w * Math.max(1, items.length);
    return Math.min(
      availableWidth / spreadWidth,
      availableHeight / project.pageSize.h,
    );
  }, [size, items.length, project.pageSize]);

  const scale = Math.max(0.01, fitScale * zoom);

  return (
    <section
      ref={ref}
      aria-label="Canvas workspace"
      className="dotted-canvas relative min-h-0 flex-1 overflow-auto overscroll-contain"
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

      <div className="flex min-h-full w-max min-w-full items-center justify-center p-6 sm:p-10">
        {items.length > 0 ? (
          <div
            className="transition-opacity duration-200"
            style={{
              opacity: size.width > 0 ? 1 : 0,
            }}
          >
            <SpreadView
              items={items}
              pageSize={project.pageSize}
              scale={scale}
              variant="edit"
              selectedElementId={selectedElementId}
              showLabels
            />
          </div>
        ) : (
          <EmptyState
            title="A blank issue"
            description="Add a spread to begin composing your publication."
            action={
              <Button variant="primary" size="sm" onClick={addSpread}>
                Add spread
              </Button>
            }
          />
        )}
      </div>

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
