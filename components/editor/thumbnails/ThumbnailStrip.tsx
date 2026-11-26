"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import {
  AlertTriangle,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Copy,
  Grid2x2,
  LayoutList,
  Plus,
  Trash2,
} from "lucide-react";
import { useEditorStore } from "@/store";
import { useCurrentSpread } from "@/store/selectors";
import { getEditablePageCount, getShortSpreadLabel } from "@/lib/spreads";
import { canAddSpread, getBinding, getCoverDisplaySpineWidth, validatePageCount } from "@/lib/binding";
import { ZoomControl } from "@/components/editor/toolbar/ZoomControl";
import { IconButton } from "@/components/ui/icon-button";
import { SpreadCard, SortableSpreadCard } from "@/components/editor/thumbnails/SpreadCard";
import { cn } from "@/lib/cn";

const THUMBNAIL_HEIGHT = 80;
const GRID_THUMBNAIL_HEIGHT = 104;

export function ThumbnailStrip() {
  const project = useEditorStore((state) => state.project);
  const open = useEditorStore((state) => state.ui.thumbnailsOpen);
  const view = useEditorStore((state) => state.ui.thumbnailView);
  const setThumbnailsOpen = useEditorStore((state) => state.setThumbnailsOpen);
  const setThumbnailView = useEditorStore((state) => state.setThumbnailView);
  const goToSpread = useEditorStore((state) => state.goToSpread);
  const prevSpread = useEditorStore((state) => state.prevSpread);
  const nextSpread = useEditorStore((state) => state.nextSpread);
  const addSpread = useEditorStore((state) => state.addSpread);
  const duplicateSpread = useEditorStore((state) => state.duplicateSpread);
  const removeSpread = useEditorStore((state) => state.removeSpread);
  const moveSpread = useEditorStore((state) => state.moveSpread);

  const { spreads, spreadIndex } = useCurrentSpread();
  const refs = useRef<Map<number, HTMLButtonElement | null>>(new Map());
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    }),
  );

  // Binding rules apply to *editable* pages; cover and end papers are excluded.
  const pageCount = getEditablePageCount(project.pages);
  const limits = validatePageCount(project.pageSize.binding, pageCount);
  const bindingName = getBinding(project.pageSize.binding).name;
  const spineWidth = getCoverDisplaySpineWidth(project.pageSize.binding, pageCount);
  const canAdd = canAddSpread(project.pageSize.binding, pageCount);

  const ids = useMemo(() => spreads.map((spread) => `spread-${spread.index}`), [spreads]);

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

  useEffect(() => {
    if (!open || view !== "strip") return;
    const node = refs.current.get(spreadIndex);
    node?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "center",
    });
  }, [spreadIndex, open, view]);

  const current = spreads[spreadIndex];
  // Structural spreads (cover, first spread carrying the inside-front end
  // paper, and the final spread carrying the inside-back end paper) are fixed.
  const isStructural = Boolean(
    current && (current.isCover || current.isFirstContent || current.isLast),
  );
  const canRemove = Boolean(current && !isStructural);
  const canDuplicate = Boolean(current && !isStructural && canAdd);
  const canPrev = spreadIndex > 0;
  const canNext = spreadIndex < spreads.length - 1;
  const thumbnailHeight =
    view === "grid" ? GRID_THUMBNAIL_HEIGHT : THUMBNAIL_HEIGHT;

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const from = ids.indexOf(String(active.id));
    const to = ids.indexOf(String(over.id));
    const targetSpread = spreads[to];
    if (
      from < 0 ||
      to < 0 ||
      !targetSpread ||
      targetSpread.isCover ||
      targetSpread.isFirstContent ||
      targetSpread.isLast
    ) {
      return;
    }
    moveSpread(from, to);
  };
  const activeSpread = activeId ? spreadItems[ids.indexOf(activeId)] : null;

  const renderCard = (
    item: (typeof spreadItems)[number],
    sortable: boolean,
  ) => {
    const active = item.spread.index === spreadIndex;
    const shared = {
      spread: item.spread,
      // Labels resolve global page indices, so pass the complete array.
      pages: project.pages,
      pageSize: project.pageSize,
      spineWidth: item.spread.isCover ? spineWidth : 0,
      height: thumbnailHeight,
      active,
      view,
      onOpen: () => goToSpread(item.spread.index),
    };

    if (!sortable) {
      return (
        <SpreadCard
          key={item.spread.index}
          {...shared}
          ref={(node) => {
            refs.current.set(item.spread.index, node);
          }}
        />
      );
    }

    return (
      <SortableSpreadCard
        key={item.spread.index}
        id={`spread-${item.spread.index}`}
        {...shared}
      />
    );
  };

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
          <span className="text-ink">Spread {spreadIndex + 1}</span>{" "}
          <span className="text-ink-subtle">of {spreads.length}</span>
          {current ? (
            <span className="hidden sm:inline">
              {" "}
              <span aria-hidden="true" className="px-1 text-line-strong">
                ·
              </span>{" "}
              {getShortSpreadLabel(current, project.pages)}
            </span>
          ) : null}
          <span className="text-ink-subtle"> · {pageCount} pages</span>
        </div>

        {limits.level !== "ok" ? (
          <span
            role="status"
            className={cn(
              "hidden items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium md:inline-flex",
              limits.level === "error"
                ? "bg-danger-soft text-danger"
                : "bg-accent-soft text-accent",
            )}
          >
            <AlertTriangle className="size-3" aria-hidden="true" />
            {limits.level === "error" ? "Page count invalid" : "Partial signature"}
          </span>
        ) : null}

        <div className="ml-auto flex shrink-0 items-center gap-1">
          <div
            role="group"
            aria-label="Thumbnail view"
            className="inline-flex h-7 items-center gap-0.5 rounded-field border border-line bg-surface-muted/60 p-0.5"
          >
            <button
              type="button"
              aria-pressed={view === "strip"}
              aria-label="One page view"
              onClick={() => setThumbnailView("strip")}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[6px] px-1.5 text-[10px] font-medium transition-colors",
                view === "strip"
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-subtle hover:text-ink-muted",
              )}
            >
              <LayoutList className="size-3" aria-hidden="true" />
              <span className="hidden lg:inline">Spreads</span>
            </button>
            <button
              type="button"
              aria-pressed={view === "grid"}
              aria-label="All pages view"
              onClick={() => setThumbnailView("grid")}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-[6px] px-1.5 text-[10px] font-medium transition-colors",
                view === "grid"
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-subtle hover:text-ink-muted",
              )}
            >
              <Grid2x2 className="size-3" aria-hidden="true" />
              <span className="hidden lg:inline">All pages</span>
            </button>
          </div>

          <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-line sm:block" />

          <IconButton
            icon={Plus}
            label="Add pages"
            tooltip={canAdd ? "Add pages (2)" : "Page limit reached"}
            size="sm"
            variant="secondary"
            onClick={addSpread}
            disabled={!canAdd}
          />
          <IconButton
            icon={Copy}
            label="Duplicate spread"
            tooltip="Duplicate spread"
            size="sm"
            onClick={duplicateSpread}
            disabled={!canDuplicate}
          />
          <IconButton
            icon={Trash2}
            label="Remove spread"
            tooltip={
              current?.isCover
                ? "The cover spread can’t be removed"
                : isStructural
                  ? "This spread holds an end paper and is fixed"
                  : "Remove spread"
            }
            size="sm"
            variant="danger-ghost"
            onClick={removeSpread}
            disabled={!canRemove}
          />
          <span aria-hidden="true" className="mx-1 hidden h-5 w-px bg-line md:block" />
          <div className="hidden md:block">
            <ZoomControl />
          </div>
          <span aria-hidden="true" className="mx-0.5 hidden h-5 w-px bg-line sm:block" />
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
              {open ? "Hide" : "Show"} thumbnails
            </span>
          </button>
        </div>
      </div>

      {open ? (
        <>
          {limits.level !== "ok" && limits.message ? (
            <div
              role="alert"
              className={cn(
                "flex items-center gap-2 border-b px-3 py-1.5 text-[10.5px] font-medium",
                limits.level === "error"
                  ? "border-danger/20 bg-danger-soft text-danger"
                  : "border-accent/20 bg-accent-soft text-accent",
              )}
            >
              <AlertTriangle className="size-3 shrink-0" aria-hidden="true" />
              <span className="flex-1">{limits.message}</span>
              <span className="hidden shrink-0 font-mono text-[10px] opacity-70 sm:inline">
                {pageCount} pages · {bindingName}
              </span>
            </div>
          ) : null}
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={() => setActiveId(null)}
          >
          <SortableContext
            items={ids}
            strategy={view === "grid" ? rectSortingStrategy : horizontalListSortingStrategy}
          >
            <div
              id="page-thumbnails-region"
              className={cn(
                view === "grid"
                  ? "grid max-h-[46dvh] grid-cols-2 gap-2 overflow-y-auto px-3 py-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-7"
                  : "flex items-center gap-1 overflow-x-auto overflow-y-hidden px-3 py-2.5",
              )}
            >
              {spreadItems.map((item) => renderCard(item, true))}

              <button
                type="button"
                onClick={addSpread}
                disabled={!canAdd}
                className={cn(
                  "group flex shrink-0 flex-col items-center justify-center gap-1.5 rounded-field px-1.5 py-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-40",
                  view === "grid" && "w-full",
                )}
                aria-label="Add pages"
                style={{ height: thumbnailHeight + 30 }}
              >
                <span
                  className="flex items-center justify-center rounded-[2px] border border-dashed border-line-strong bg-surface-muted/40 text-ink-subtle transition-colors duration-150 group-hover:border-accent group-hover:text-accent"
                  style={{
                    width:
                      view === "grid"
                        ? "100%"
                        : (project.pageSize.w * 2 * thumbnailHeight) / project.pageSize.h,
                    height: thumbnailHeight,
                  }}
                >
                  <Plus className="size-4" aria-hidden="true" />
                </span>
                <span className="text-[9.5px] font-medium uppercase tracking-[0.1em] text-ink-subtle transition-colors group-hover:text-ink-muted">
                  Add pages
                </span>
              </button>
            </div>
          </SortableContext>

          <DragOverlay>
            {activeSpread ? (
              <SpreadCard
                spread={activeSpread.spread}
                pages={project.pages}
                pageSize={project.pageSize}
                spineWidth={activeSpread.spread.isCover ? spineWidth : 0}
                height={thumbnailHeight}
                active={false}
                view={view}
                onOpen={() => {}}
                overlay
              />
            ) : null}
          </DragOverlay>
        </DndContext>
        </>
      ) : null}
    </section>
  );
}
