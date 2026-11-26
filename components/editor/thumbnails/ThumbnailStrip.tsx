"use client";

import { useEffect, useMemo, useRef } from "react";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Plus,
  Trash2,
} from "lucide-react";
import { useEditorStore } from "@/store";
import { useSpreads } from "@/store/selectors";
import { getShortSpreadLabel } from "@/lib/spreads";
import { PageView } from "@/components/editor/canvas/PageView";
import { ZoomControl } from "@/components/editor/toolbar/ZoomControl";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

const THUMBNAIL_HEIGHT = 80;

export function ThumbnailStrip() {
  const project = useEditorStore((state) => state.project);
  const spreadIndex = useEditorStore((state) => state.ui.spreadIndex);
  const open = useEditorStore((state) => state.ui.thumbnailsOpen);
  const setThumbnailsOpen = useEditorStore(
    (state) => state.setThumbnailsOpen,
  );
  const goToSpread = useEditorStore((state) => state.goToSpread);
  const prevSpread = useEditorStore((state) => state.prevSpread);
  const nextSpread = useEditorStore((state) => state.nextSpread);
  const addSpread = useEditorStore((state) => state.addSpread);
  const duplicateSpread = useEditorStore((state) => state.duplicateSpread);
  const removeSpread = useEditorStore((state) => state.removeSpread);

  const spreads = useSpreads();
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const scale = THUMBNAIL_HEIGHT / project.pageSize.h;

  useEffect(() => {
    if (!open) return;
    const node = refs.current[spreadIndex];
    node?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [spreadIndex, open]);

  const spreadItems = useMemo(
    () =>
      spreads.map((spread) => ({
        spread,
        pages: spread.pageIndices
          .map((index) => project.pages[index])
          .filter((page): page is NonNullable<typeof page> => Boolean(page)),
      })),
    [spreads, project.pages],
  );

  const current = spreads[spreadIndex];
  const canRemove = Boolean(
    current && !current.isCover && project.pages.length > 2,
  );
  const canPrev = spreadIndex > 0;
  const canNext = spreadIndex < spreads.length - 1;

  return (
    <section
      aria-label="Page thumbnails"
      className="relative z-40 shrink-0 border-t border-line bg-surface"
    >
      <div className="flex h-10 items-center gap-1.5 border-b border-line px-2.5">
        <div className="flex shrink-0 items-center">
          <IconButton
            icon={ChevronLeft}
            label="Previous spread"
            tooltip="Previous spread"
            shortcut="PgUp"
            size="sm"
            onClick={prevSpread}
            disabled={!canPrev}
          />
          <IconButton
            icon={ChevronRight}
            label="Next spread"
            tooltip="Next spread"
            shortcut="PgDn"
            size="sm"
            onClick={nextSpread}
            disabled={!canNext}
          />
        </div>
        <div className="hidden min-w-0 truncate text-[10.5px] font-medium text-ink-muted sm:block">
          <span className="text-ink">
            Spread {spreadIndex + 1}
          </span>{" "}
          <span className="text-ink-subtle">of {spreads.length}</span>
          {current ? (
            <span className="hidden sm:inline">
              {" "}
              <span aria-hidden="true" className="px-1 text-line-strong">
                ·
              </span>{" "}
              {getShortSpreadLabel(current)}
            </span>
          ) : null}
        </div>

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <IconButton
            icon={Plus}
            label="Add spread"
            tooltip="Add spread"
            size="sm"
            variant="secondary"
            onClick={addSpread}
          />
          <IconButton
            icon={Copy}
            label="Duplicate spread"
            tooltip="Duplicate spread"
            size="sm"
            onClick={duplicateSpread}
          />
          <IconButton
            icon={Trash2}
            label="Remove spread"
            tooltip={
              current?.isCover
                ? "The cover spread can’t be removed"
                : "Remove spread"
            }
            size="sm"
            variant="danger-ghost"
            onClick={removeSpread}
            disabled={!canRemove}
          />
          <span
            aria-hidden="true"
            className="mx-1 hidden h-5 w-px bg-line sm:block"
          />
          <div>
            <ZoomControl />
          </div>
          <span
            aria-hidden="true"
            className="mx-0.5 hidden h-5 w-px bg-line md:block"
          />
          <button
            type="button"
            onClick={() => setThumbnailsOpen(!open)}
            aria-expanded={open}
            aria-controls="page-thumbnails-region"
            aria-label={open ? "Hide page thumbnails" : "Show page thumbnails"}
            className="inline-flex h-7 items-center gap-1.5 rounded-field px-1.5 text-[10.5px] font-medium text-ink-muted transition-colors duration-150 hover:bg-surface-muted hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {open ? (
              <ChevronDown className="size-3.5" aria-hidden="true" />
            ) : (
              <ChevronUp className="size-3.5" aria-hidden="true" />
            )}
            <span className="hidden md:inline">
              {open ? "Hide page thumbnails" : "Show page thumbnails"}
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <div
          id="page-thumbnails-region"
          className="flex items-center gap-1 overflow-x-auto overflow-y-hidden px-3 py-2.5"
        >
          {spreadItems.map(({ spread, pages }) => {
            const active = spread.index === spreadIndex;
            return (
              <button
                key={spread.index}
                ref={(node) => {
                  refs.current[spread.index] = node;
                }}
                type="button"
                onClick={() => goToSpread(spread.index)}
                aria-label={`Open ${getShortSpreadLabel(spread)}`}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group flex shrink-0 flex-col items-center gap-1.5 rounded-field px-1.5 py-1 text-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
                )}
              >
                <span
                  className={cn(
                    "flex overflow-hidden rounded-[2px] bg-surface shadow-sm transition-[box-shadow,transform] duration-150 ease-out-soft",
                    active
                      ? "ring-2 ring-accent ring-offset-2 ring-offset-surface"
                      : "ring-1 ring-line group-hover:-translate-y-0.5 group-hover:shadow-paper",
                  )}
                >
                  {pages.map((page) => (
                    <PageView
                      key={page.id}
                      page={page}
                      pageSize={project.pageSize}
                      scale={scale}
                      decorative
                    />
                  ))}
                </span>
                <span
                  className={cn(
                    "max-w-[132px] truncate text-[9.5px] font-medium uppercase tracking-[0.1em] transition-colors duration-150",
                    active
                      ? "text-ink"
                      : "text-ink-subtle group-hover:text-ink-muted",
                  )}
                >
                  {getShortSpreadLabel(spread)}
                </span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={addSpread}
            className="group flex shrink-0 flex-col items-center gap-1.5 rounded-field px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
            aria-label="Add spread"
            style={{ height: THUMBNAIL_HEIGHT + 30 }}
          >
            <span
              className="flex items-center justify-center rounded-[2px] border border-dashed border-line-strong bg-surface-muted/40 text-ink-subtle transition-colors duration-150 group-hover:border-accent group-hover:text-accent"
              style={{
                width: (project.pageSize.w * 2 * THUMBNAIL_HEIGHT) / project.pageSize.h,
                height: THUMBNAIL_HEIGHT,
              }}
            >
              <Plus className="size-4" aria-hidden="true" />
            </span>
            <span className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-subtle transition-colors group-hover:text-ink-muted">
              Add
            </span>
          </button>
        </div>
      ) : null}
    </section>
  );
}
