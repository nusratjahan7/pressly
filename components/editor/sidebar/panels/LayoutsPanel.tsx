"use client";

import { useMemo, useRef, useState } from "react";
import { Heart } from "lucide-react";
import { useEditorStore } from "@/store";
import { useActivePage, useCurrentSpread } from "@/store/selectors";
import { getPageLabel } from "@/lib/spreads";
import {
  DEFAULT_FRAME_GAP_MM,
  LAYOUTS,
  type LayoutDefinition,
  type LayoutScope,
} from "@/lib/layouts";
import { useElementSize } from "@/lib/useElementSize";
import { LayoutWireframe } from "@/components/editor/sidebar/panels/LayoutWireframe";
import { PageContext } from "@/components/editor/sidebar/PanelSection";
import { EmptyState } from "@/components/editor/EmptyState";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/cn";

type PhotoFilter = "all" | "1" | "2" | "3" | "4" | "5" | "6+";

const CARD_HEIGHT = 112;
const ROW_GAP = 16;
const ROW_STRIDE = CARD_HEIGHT + ROW_GAP;
const OVERSCAN_ROWS = 2;

const PHOTO_CHIPS: { value: PhotoFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "1", label: "1" },
  { value: "2", label: "2" },
  { value: "3", label: "3" },
  { value: "4", label: "4" },
  { value: "5", label: "5" },
  { value: "6+", label: "6+" },
];

export function LayoutsPanel() {
  const project = useEditorStore((state) => state.project);
  const favoriteLayoutIds = useEditorStore((state) => state.ui.favoriteLayoutIds);
  const toggleFavoriteLayout = useEditorStore((state) => state.toggleFavoriteLayout);
  const applyLayout = useEditorStore((state) => state.applyLayout);
  const updatePageLayoutSpacing = useEditorStore(
    (state) => state.updatePageLayoutSpacing,
  );
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const { page, pageIndex } = useActivePage();
  const { spread } = useCurrentSpread();

  const [scope, setScope] = useState<LayoutScope>("page");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [photoFilter, setPhotoFilter] = useState<PhotoFilter>("all");
  const [withTextOnly, setWithTextOnly] = useState(false);
  const [scrollTop, setScrollTop] = useState(0);

  const { ref: scrollContainerRef, size: viewportSize } =
    useElementSize<HTMLDivElement>();
  const cardRefs = useRef<Map<number, HTMLButtonElement | null>>(new Map());

  const favoriteSet = useMemo(
    () => new Set(favoriteLayoutIds),
    [favoriteLayoutIds],
  );

  const canUseSpreadScope = useMemo(() => {
    if (!spread || spread.pageIndices.length < 2) return false;
    return spread.pageIndices.every((idx) => {
      const p = project.pages[idx];
      return p && !p.isEndPaper && !p.locked;
    });
  }, [spread, project.pages]);

  const filteredLayouts = useMemo(() => {
    return LAYOUTS.filter((layout) => {
      if (layout.scope !== scope) return false;
      if (favoritesOnly && !favoriteSet.has(layout.id)) return false;
      if (withTextOnly && !layout.hasText) return false;
      if (photoFilter !== "all") {
        if (photoFilter === "6+") {
          if (layout.photoCount < 6) return false;
        } else if (layout.photoCount !== Number(photoFilter)) {
          return false;
        }
      }
      return true;
    });
  }, [scope, favoritesOnly, favoriteSet, withTextOnly, photoFilter]);

  const totalRows = Math.ceil(filteredLayouts.length / 2);
  const totalHeight = Math.max(0, totalRows * ROW_STRIDE - (totalRows > 0 ? ROW_GAP : 0));
  const viewportHeight = viewportSize.height || 480;
  const startRow = Math.max(0, Math.floor(scrollTop / ROW_STRIDE) - OVERSCAN_ROWS);
  const endRow = Math.min(
    totalRows,
    Math.ceil((scrollTop + viewportHeight) / ROW_STRIDE) + OVERSCAN_ROWS,
  );

  const visibleRows = useMemo(() => {
    const rows: Array<{ rowIndex: number; items: LayoutDefinition[] }> = [];
    for (let r = startRow; r < endRow; r += 1) {
      const slice = filteredLayouts.slice(r * 2, r * 2 + 2);
      if (slice.length > 0) rows.push({ rowIndex: r, items: slice });
    }
    return rows;
  }, [filteredLayouts, startRow, endRow]);

  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";
  const pageEditable = Boolean(page && !page.isEndPaper && !page.locked);

  const handleCardKeyDown = (
    event: React.KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    let nextIndex = -1;
    if (event.key === "ArrowRight") nextIndex = index + 1;
    else if (event.key === "ArrowLeft") nextIndex = index - 1;
    else if (event.key === "ArrowDown") nextIndex = index + 2;
    else if (event.key === "ArrowUp") nextIndex = index - 2;

    if (nextIndex >= 0 && nextIndex < filteredLayouts.length) {
      event.preventDefault();
      const targetRow = Math.floor(nextIndex / 2);
      const container = (event.currentTarget.closest("[data-layouts-scroll]") as HTMLElement | null);
      if (container) {
        const top = targetRow * ROW_STRIDE;
        const bottom = top + CARD_HEIGHT;
        if (top < container.scrollTop) {
          container.scrollTop = top;
        } else if (bottom > container.scrollTop + container.clientHeight) {
          container.scrollTop = bottom - container.clientHeight;
        }
      }
      requestAnimationFrame(() => {
        cardRefs.current.get(nextIndex)?.focus();
      });
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex shrink-0 flex-col gap-3 border-b border-line px-4 pb-3 pt-4">
        <PageContext
          label={pageLabel}
          suffix={
            scope === "spread" && canUseSpreadScope ? "Full spread" : undefined
          }
        />

        {/* Scope switch: Single page vs Spread */}
        <div
          role="group"
          aria-label="Layout scope"
          className="grid grid-cols-2 gap-1 rounded-field border border-line bg-surface-muted/60 p-0.5"
        >
          <button
            type="button"
            aria-pressed={scope === "page"}
            onClick={() => {
              setScope("page");
              setScrollTop(0);
            }}
            className={cn(
              "h-6 rounded-[6px] text-[10.5px] font-medium transition-colors",
              scope === "page"
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-subtle hover:text-ink-muted",
            )}
          >
            Single page
          </button>
          <button
            type="button"
            aria-pressed={scope === "spread"}
            onClick={() => {
              setScope("spread");
              setScrollTop(0);
            }}
            className={cn(
              "h-6 rounded-[6px] text-[10.5px] font-medium transition-colors",
              scope === "spread"
                ? "bg-surface text-ink shadow-sm"
                : "text-ink-subtle hover:text-ink-muted",
            )}
          >
            Spread
          </button>
        </div>

        {/* Filter chips: Favorites, With text, Photo counts */}
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Layout filters">
          <button
            type="button"
            aria-pressed={favoritesOnly}
            onClick={() => setFavoritesOnly((prev) => !prev)}
            className={cn(
              "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10.5px] font-medium transition-colors",
              favoritesOnly
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-surface text-ink-muted hover:border-line-strong",
            )}
          >
            <Heart
              className={cn("size-3", favoritesOnly && "fill-current")}
              aria-hidden="true"
            />
            Favorites
            {favoriteLayoutIds.length > 0 ? (
              <span className="opacity-75">({favoriteLayoutIds.length})</span>
            ) : null}
          </button>

          <button
            type="button"
            aria-pressed={withTextOnly}
            onClick={() => setWithTextOnly((prev) => !prev)}
            className={cn(
              "inline-flex h-6 items-center rounded-full border px-2 text-[10.5px] font-medium transition-colors",
              withTextOnly
                ? "border-accent bg-accent text-accent-ink"
                : "border-line bg-surface text-ink-muted hover:border-line-strong",
            )}
          >
            With text
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-1" role="group" aria-label="Photo count filter">
          {PHOTO_CHIPS.map((chip) => {
            const active = photoFilter === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                aria-pressed={active}
                onClick={() => setPhotoFilter(chip.value)}
                className={cn(
                  "inline-flex h-6 min-w-7 items-center justify-center rounded-full border px-2 text-[10.5px] font-medium transition-colors",
                  active
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-ink-muted hover:border-line-strong",
                )}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {/* Layout spacing controls when a layout is applied */}
        {pageEditable && page?.layoutMeta ? (
          <div className="flex flex-col gap-2 rounded-field border border-line bg-surface-muted/50 px-2.5 py-2">
            <Slider
              label="Frame gap"
              value={page.layoutMeta.gapMm}
              min={0}
              max={12}
              step={0.5}
              formatValue={(v) => `${v} mm`}
              onStart={pushHistory}
              onValueChange={(v) =>
                updatePageLayoutSpacing(page.id, { gapMm: v }, { commit: false })
              }
            />
            <Slider
              label="Outer margin"
              value={page.layoutMeta.marginMm}
              min={0}
              max={25}
              step={0.5}
              formatValue={(v) => `${v} mm`}
              onStart={pushHistory}
              onValueChange={(v) =>
                updatePageLayoutSpacing(
                  page.id,
                  { marginMm: v },
                  { commit: false },
                )
              }
            />
          </div>
        ) : null}
      </div>

      {!page || !pageEditable ? (
        <div className="p-4">
          <EmptyState
            title={page ? "Page is locked" : "No page selected"}
            description="Select an editable page to apply a layout."
            compact
          />
        </div>
      ) : filteredLayouts.length === 0 ? (
        <div className="p-4">
          <EmptyState
            title="No matching layouts"
            description={
              favoritesOnly
                ? "Tap the heart on any layout card to save favorites here."
                : "Try clearing one of the active filters."
            }
            compact
          />
        </div>
      ) : (
        <div
          ref={scrollContainerRef}
          data-layouts-scroll
          onScroll={(event) => setScrollTop(event.currentTarget.scrollTop)}
          className="min-h-0 flex-1 overflow-y-auto px-4 py-4"
        >
          <div className="relative w-full" style={{ height: totalHeight }}>
            {visibleRows.map(({ rowIndex, items }) => (
              <div
                key={rowIndex}
                className="absolute inset-x-0 grid grid-cols-2 gap-4"
                style={{ top: rowIndex * ROW_STRIDE, height: CARD_HEIGHT }}
              >
                {items.map((layout, colIndex) => {
                  const flatIndex = rowIndex * 2 + colIndex;
                  const isFavorite = favoriteSet.has(layout.id);
                  const isActive = page.layoutMeta?.layoutId === layout.id;
                  return (
                    <div
                      key={layout.id}
                      className={cn(
                        "group relative flex h-full flex-col items-center justify-center rounded-[8px] border bg-white transition-[transform,border-color,box-shadow] duration-150 ease-out-soft hover:-translate-y-0.5 hover:border-accent hover:shadow-sm",
                        isActive
                          ? "border-accent ring-2 ring-accent/20"
                          : "border-[#E3E5F2]",
                      )}
                    >
                      <button
                        ref={(node) => {
                          if (node) cardRefs.current.set(flatIndex, node);
                          else cardRefs.current.delete(flatIndex);
                        }}
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            "application/x-pressly-layout",
                            layout.id,
                          );
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() =>
                          applyLayout(page.id, layout, {
                            gapMm:
                              page.layoutMeta?.gapMm ?? DEFAULT_FRAME_GAP_MM,
                            marginMm:
                              page.layoutMeta?.marginMm ??
                              project.pageSize.safeMargin,
                          })
                        }
                        onKeyDown={(event) =>
                          handleCardKeyDown(event, flatIndex)
                        }
                        aria-label={`Apply ${layout.name} layout (${layout.photoCount} ${layout.photoCount === 1 ? "photo" : "photos"}${layout.hasText ? ", with text" : ""}) to ${pageLabel}`}
                        className="flex h-full w-full items-center justify-center rounded-[8px] p-2.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
                      >
                        <LayoutWireframe
                          layout={layout}
                          pageSize={project.pageSize}
                          maxWidth={layout.scope === "spread" ? 104 : 82}
                          maxHeight={86}
                        />
                      </button>

                      <button
                        type="button"
                        aria-pressed={isFavorite}
                        aria-label={
                          isFavorite
                            ? `Remove ${layout.name} from favorites`
                            : `Favorite ${layout.name}`
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleFavoriteLayout(layout.id);
                        }}
                        className={cn(
                          "absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                          isFavorite
                            ? "bg-[#1e2238]/12 text-[#1e2238]"
                            : "bg-[#1e2238]/10 text-white hover:bg-[#1e2238]/20",
                        )}
                      >
                        <Heart
                          className={cn(
                            "size-3.5",
                            isFavorite && "fill-current",
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
