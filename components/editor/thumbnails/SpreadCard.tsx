"use client";

import { forwardRef } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Lock } from "lucide-react";
import type { Page, PageSize } from "@/types";
import type { Spread } from "@/lib/spreads";
import { getBackground } from "@/lib/backgrounds";
import { getShortSpreadLabel } from "@/lib/spreads";
import { PageThumbnail } from "@/components/editor/thumbnails/PageThumbnail";
import { cn } from "@/lib/cn";

export type ThumbnailView = "strip" | "grid";

interface SpreadCardProps {
  spread: Spread;
  pages: Page[];
  pageSize: PageSize;
  spineWidth?: number;
  height: number;
  active: boolean;
  view: ThumbnailView;
  onOpen: () => void;
  sortable?: boolean;
  dragging?: boolean;
  overlay?: boolean;
}

/**
 * One spread in the strip or grid. Presentational only: drag wiring is applied
 * by `SortableSpreadCard`, so the same card can be reused as the drag overlay.
 */
export const SpreadCard = forwardRef<HTMLButtonElement, SpreadCardProps>(
  function SpreadCard(
    {
      spread,
      pages,
      pageSize,
      spineWidth = 0,
      height,
      active,
      view,
      onOpen,
      sortable = false,
      dragging = false,
      overlay = false,
    },
    ref,
  ) {
    const isCover = spread.isCover;
    const isFixed = spread.isCover || spread.isFirstContent || spread.isLast;
    const label = getShortSpreadLabel(spread, pages);

    // Labels use global page indices, so this spread's own pages are resolved
    // from the full array rather than passed in pre-sliced.
    const spreadPages = spread.pageIndices
      .map((index) => pages[index])
      .filter((page): page is Page => Boolean(page));

    const showFadedBlankHalf = !isCover && spreadPages.length === 1;
    const spineColor = spreadPages[0]
      ? getBackground(spreadPages[0].backgroundId).baseColor
      : "#122056";
    const spineThumbWidth =
      isCover && spineWidth > 0
        ? Math.max(2, Math.round((spineWidth / pageSize.h) * height))
        : 0;
    const thumbWidth = Math.round((pageSize.w / pageSize.h) * height);

    return (
      <button
        ref={ref}
        type="button"
        onClick={onOpen}
        aria-label={`Open ${isCover ? "cover" : label}`}
        aria-current={active ? "page" : undefined}
        className={cn(
          "group relative flex shrink-0 flex-col items-center gap-1.5 rounded-field px-1.5 py-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
          dragging && "opacity-40",
          overlay && "cursor-grabbing rounded-ui bg-surface p-2 shadow-panel ring-1 ring-line",
          view === "grid" && "w-full bg-surface",
        )}
      >
        <span
          className={cn(
            "relative flex overflow-hidden rounded-[2px] bg-surface shadow-sm transition-[box-shadow,transform] duration-150 ease-out-soft",
            view === "grid" && "w-full max-w-[220px]",
            active
              ? "ring-2 ring-accent ring-offset-2 ring-offset-surface"
              : "ring-1 ring-line group-hover:-translate-y-0.5 group-hover:shadow-paper",
          )}
        >
          {spreadPages.length > 0 ? (
            <>
              <PageThumbnail
                key={spreadPages[0]!.id}
                page={spreadPages[0]!}
                pageSize={pageSize}
                height={height}
                className={view === "grid" ? "!h-auto !min-w-0 !flex-1" : undefined}
              />
              {isCover && spineThumbWidth > 0 ? (
                <span
                  aria-hidden="true"
                  className="shrink-0 border-x border-white/20"
                  style={{
                    width: spineThumbWidth,
                    backgroundColor: spineColor,
                  }}
                />
              ) : isCover ? (
                <span
                  aria-hidden="true"
                  className="w-px shrink-0 bg-white/20"
                />
              ) : null}
              {spreadPages[1] ? (
                <PageThumbnail
                  key={spreadPages[1].id}
                  page={spreadPages[1]}
                  pageSize={pageSize}
                  height={height}
                  extraElements={
                    spreadPages[0] && !spreadPages[0].isEndPaper
                      ? spreadPages[0].elements
                          .filter((el) => Boolean(el.spanSpread))
                          .map((el) => ({ ...el, x: el.x - pageSize.w }))
                      : []
                  }
                  className={view === "grid" ? "!h-auto !min-w-0 !flex-1" : undefined}
                />
              ) : showFadedBlankHalf ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "block shrink-0 border-l border-dashed border-line-strong bg-[#262A3C]/20",
                    view === "grid" && "flex-1",
                  )}
                  style={
                    view === "grid"
                      ? { aspectRatio: `${pageSize.w} / ${pageSize.h}` }
                      : { width: thumbWidth, height }
                  }
                />
              ) : null}
            </>
          ) : (
            <span
              className="block bg-surface-muted"
              style={{ width: height * 0.707, height }}
            />
          )}

          {isCover ? (
            <span
              className="pointer-events-none absolute left-1 top-1 flex size-4 items-center justify-center rounded-[3px] bg-ink/70 text-white"
              aria-hidden="true"
            >
              <Lock className="size-2.5" />
            </span>
          ) : null}
        </span>

        <span
          className={cn(
            "flex max-w-[132px] items-center gap-1 truncate text-[9.5px] font-medium uppercase tracking-[0.1em] transition-colors duration-150",
            active ? "text-ink" : "text-ink-subtle group-hover:text-ink-muted",
          )}
        >
          {sortable && !isFixed ? (
            <GripVertical
              className="size-3 shrink-0 text-ink-subtle/60 opacity-0 transition-opacity group-hover:opacity-100"
              aria-hidden="true"
            />
          ) : null}
          {label}
        </span>
      </button>
    );
  },
);

interface SortableSpreadCardProps extends Omit<SpreadCardProps, "sortable" | "dragging"> {
  id: string;
}

export function SortableSpreadCard({ id, ...props }: SortableSpreadCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id,
      // Cover, first and last spreads are structural and stay in place.
      disabled:
        props.spread.isCover ||
        props.spread.isFirstContent ||
        props.spread.isLast,
    });

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        zIndex: isDragging ? 20 : undefined,
      }}
      className={cn(
        props.view === "grid" ? "w-full" : "shrink-0",
        isDragging && "relative",
      )}
      {...attributes}
      {...listeners}
    >
      <SpreadCard {...props} sortable dragging={isDragging} />
    </div>
  );
}
