"use client";

import { useEffect, useState } from "react";
import {
  Check,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  Layers as LayersIcon,
  Lock,
  Pencil,
  QrCode,
  Shapes,
  Sparkles,
  Trash2,
  Type,
  Unlock,
} from "lucide-react";
import type { Element, Page } from "@/types";
import { useEditorStore } from "@/store";
import { useCurrentSpread } from "@/store/selectors";
import { ELEMENT_TYPE_LABEL, getElementLabel } from "@/lib/elements";
import { getPageLabel } from "@/lib/spreads";
import { cn } from "@/lib/cn";

function LayerTypeBadge({ element }: { element: Element }) {
  if (element.type === "shape") {
    const color =
      element.fill !== "transparent"
        ? element.fill
        : element.stroke !== "transparent"
          ? element.stroke
          : "#5B65DC";
    return (
      <span
        className="flex size-5 shrink-0 items-center justify-center rounded border border-line bg-surface-muted"
        title={ELEMENT_TYPE_LABEL.shape}
      >
        <span
          className="size-2.5 rounded-[2px] border border-black/15"
          style={{ backgroundColor: color }}
        />
      </span>
    );
  }

  const Icon =
    element.type === "text"
      ? Type
      : element.type === "image"
        ? ImageIcon
        : element.type === "sticker"
          ? Sparkles
          : element.type === "qr"
            ? QrCode
            : Shapes;

  return (
    <span
      className="flex size-5 shrink-0 items-center justify-center rounded border border-line bg-surface-muted text-ink-muted"
      title={ELEMENT_TYPE_LABEL[element.type]}
    >
      <Icon className="size-3" aria-hidden="true" />
    </span>
  );
}

interface DropTarget {
  pageId: string;
  /** Top-down visual index in that page's descending list (0 = topmost). */
  topDownIndex: number;
}

export function LayersList() {
  const project = useEditorStore((state) => state.project);
  const selection = useEditorStore((state) => state.selection);
  const selectElement = useEditorStore((state) => state.selectElement);
  const selectPage = useEditorStore((state) => state.selectPage);
  const updateElement = useEditorStore((state) => state.updateElement);
  const removeElement = useEditorStore((state) => state.removeElement);
  const reorderPageLayers = useEditorStore((state) => state.reorderPageLayers);
  const moveElementToPage = useEditorStore((state) => state.moveElementToPage);

  const { spread } = useCurrentSpread();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [dragging, setDragging] = useState<{
    elementId: string;
    pageId: string;
  } | null>(null);
  const [dropTarget, setDropTarget] = useState<DropTarget | null>(null);

  const selectedSet = new Set(
    selection.elementIds.length > 0
      ? selection.elementIds
      : selection.elementId
        ? [selection.elementId]
        : [],
  );

  useEffect(() => {
    setEditingId(null);
    setDragging(null);
    setDropTarget(null);
  }, [spread?.pageIndices.join(",")]);

  if (!spread) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-8 text-center">
        <LayersIcon className="mb-2 size-5 text-ink-subtle" />
        <p className="text-[11.5px] font-medium text-ink">No spread active</p>
      </div>
    );
  }

  const spreadPages = spread.pageIndices
    .map((idx) => ({
      page: project.pages[idx],
      pageIndex: idx,
    }))
    .filter((entry): entry is { page: Page; pageIndex: number } =>
      Boolean(entry.page),
    );

  const commitRename = (element: Element, fallbackIndex: number) => {
    const trimmed = draftName.trim().slice(0, 60);
    setEditingId(null);
    const current = getElementLabel(element, fallbackIndex);
    if (!trimmed || trimmed === current) return;
    updateElement(element.id, { name: trimmed });
  };

  const handleDropOnPage = (
    targetPage: Page,
    orderedTopDown: Element[],
    topDownInsertIdx: number,
  ) => {
    if (!dragging || targetPage.isEndPaper || targetPage.locked) {
      setDragging(null);
      setDropTarget(null);
      return;
    }

    const total = orderedTopDown.length;
    if (dragging.pageId === targetPage.id) {
      const currentTopIdx = orderedTopDown.findIndex(
        (el) => el.id === dragging.elementId,
      );
      if (currentTopIdx < 0) return;

      const without = orderedTopDown.filter((el) => el.id !== dragging.elementId);
      const movingEl = orderedTopDown[currentTopIdx]!;
      const adjustedTopIdx =
        topDownInsertIdx > currentTopIdx
          ? Math.max(0, topDownInsertIdx - 1)
          : Math.max(0, Math.min(without.length, topDownInsertIdx));

      without.splice(adjustedTopIdx, 0, movingEl);
      // Store expects bottom-to-top ordering.
      const bottomToTopIds = [...without].reverse().map((el) => el.id);
      reorderPageLayers(targetPage.id, bottomToTopIds);
    } else {
      // Top-down index 0 maps to top of bottom-to-top stack (index === total).
      const clampedTop = Math.max(0, Math.min(total, topDownInsertIdx));
      const bottomToTopIndex = total - clampedTop;
      moveElementToPage(dragging.elementId, targetPage.id, bottomToTopIndex);
    }

    setDragging(null);
    setDropTarget(null);
  };

  const totalSpreadLayers = spreadPages.reduce(
    (sum, { page }) => sum + (page.isEndPaper ? 0 : page.elements.length),
    0,
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
      {spreadPages.map(({ page, pageIndex }) => {
        const label = getPageLabel(pageIndex, project.pages);
        const isPageLocked = Boolean(page.isEndPaper || page.locked);
        // Visual stacking: highest zIndex at top.
        const orderedTopDown = [...page.elements].sort(
          (a, b) => b.zIndex - a.zIndex,
        );
        const isActivePage = selection.pageId === page.id;

        return (
          <section
            key={page.id}
            className="border-b border-line last:border-b-0"
            onDragOver={(event) => {
              if (!dragging || isPageLocked) return;
              event.preventDefault();
              if (orderedTopDown.length === 0) {
                setDropTarget({ pageId: page.id, topDownIndex: 0 });
              }
            }}
            onDrop={(event) => {
              if (!dragging || isPageLocked) return;
              event.preventDefault();
              const targetIdx =
                dropTarget?.pageId === page.id
                  ? dropTarget.topDownIndex
                  : orderedTopDown.length;
              handleDropOnPage(page, orderedTopDown, targetIdx);
            }}
          >
            <div
              onClick={() => {
                if (!isPageLocked) selectPage(page.id);
              }}
              className={cn(
                "flex items-center justify-between gap-2 px-3.5 py-2 text-left transition-colors",
                !isPageLocked && "cursor-pointer hover:bg-surface-muted/60",
                isActivePage && "bg-accent-soft/45",
              )}
            >
              <span className="truncate text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                {label}
              </span>
              <span className="shrink-0 text-[10px] tabular-nums text-ink-subtle">
                {page.isEndPaper
                  ? "End paper"
                  : page.locked
                    ? "Locked"
                    : `${orderedTopDown.length}`}
              </span>
            </div>

            {page.isEndPaper ? (
              <p className="px-3.5 pb-3 text-[10.5px] text-ink-subtle">
                Inside cover stock cannot hold layers.
              </p>
            ) : orderedTopDown.length === 0 ? (
              <div
                className={cn(
                  "mx-3 mb-3 rounded-field border border-dashed border-line px-3 py-3 text-center text-[10.5px] text-ink-subtle transition-colors",
                  dropTarget?.pageId === page.id &&
                    dragging &&
                    "border-accent bg-accent-soft/40 text-accent",
                )}
              >
                {dragging && !isPageLocked
                  ? "Drop layer here"
                  : "No layers on this page"}
              </div>
            ) : (
              <div className="flex flex-col pb-1.5">
                {orderedTopDown.map((element, topIdx) => {
                  const isSelected = selectedSet.has(element.id);
                  const isEditing = editingId === element.id;
                  const layerLabel = getElementLabel(element, element.zIndex);
                  const isDropBefore =
                    dropTarget?.pageId === page.id &&
                    dropTarget.topDownIndex === topIdx;
                  const isDropAfter =
                    dropTarget?.pageId === page.id &&
                    dropTarget.topDownIndex === topIdx + 1 &&
                    topIdx === orderedTopDown.length - 1;

                  return (
                    <div
                      key={element.id}
                      draggable={!isPageLocked && !isEditing}
                      onDragStart={(event) => {
                        if (isPageLocked || isEditing) return;
                        event.dataTransfer.effectAllowed = "move";
                        event.dataTransfer.setData("text/plain", element.id);
                        setDragging({ elementId: element.id, pageId: page.id });
                      }}
                      onDragOver={(event) => {
                        if (!dragging || isPageLocked) return;
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        const after = event.clientY > rect.top + rect.height / 2;
                        setDropTarget({
                          pageId: page.id,
                          topDownIndex: after ? topIdx + 1 : topIdx,
                        });
                      }}
                      onDrop={(event) => {
                        if (!dragging || isPageLocked) return;
                        event.preventDefault();
                        event.stopPropagation();
                        const rect = event.currentTarget.getBoundingClientRect();
                        const after = event.clientY > rect.top + rect.height / 2;
                        handleDropOnPage(
                          page,
                          orderedTopDown,
                          after ? topIdx + 1 : topIdx,
                        );
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropTarget(null);
                      }}
                      onClick={(event) => {
                        if (isEditing || isPageLocked) return;
                        selectElement(page.id, element.id, {
                          additive: event.shiftKey,
                        });
                      }}
                      className={cn(
                        "group relative flex h-9 cursor-pointer items-center gap-1.5 border-y border-transparent px-2 transition-colors",
                        isSelected
                          ? "bg-accent-soft/80 text-ink"
                          : "hover:bg-surface-muted/75",
                        element.hidden && "opacity-55",
                        dragging?.elementId === element.id && "opacity-40",
                      )}
                    >
                      {isDropBefore ? (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-2 top-0 h-0.5 rounded-full bg-accent"
                        />
                      ) : null}
                      {isDropAfter ? (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-2 bottom-0 h-0.5 rounded-full bg-accent"
                        />
                      ) : null}

                      <span
                        aria-hidden="true"
                        className={cn(
                          "flex size-4 shrink-0 cursor-grab items-center justify-center text-ink-subtle/70 opacity-60 group-hover:opacity-100",
                          isPageLocked && "cursor-default opacity-25",
                        )}
                      >
                        <GripVertical className="size-3" />
                      </span>

                      <LayerTypeBadge element={element} />

                      <div className="min-w-0 flex-1">
                        {isEditing ? (
                          <div
                            className="flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              autoFocus
                              value={draftName}
                              maxLength={60}
                              onChange={(e) => setDraftName(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.preventDefault();
                                  commitRename(element, element.zIndex);
                                } else if (e.key === "Escape") {
                                  e.preventDefault();
                                  setEditingId(null);
                                }
                              }}
                              onBlur={() => commitRename(element, element.zIndex)}
                              className="h-6 w-full rounded border border-accent bg-surface px-1.5 text-[11px] font-medium text-ink outline-none"
                            />
                            <button
                              type="button"
                              aria-label="Save layer name"
                              onMouseDown={(e) => {
                                e.preventDefault();
                                commitRename(element, element.zIndex);
                              }}
                              className="inline-flex size-5 shrink-0 items-center justify-center rounded bg-accent text-white"
                            >
                              <Check className="size-3" />
                            </button>
                          </div>
                        ) : (
                          <div
                            onDoubleClick={(event) => {
                              if (isPageLocked) return;
                              event.stopPropagation();
                              setEditingId(element.id);
                              setDraftName(layerLabel);
                            }}
                            className="flex items-center gap-1"
                            title={`${layerLabel} — Double-click to rename`}
                          >
                            <span
                              className={cn(
                                "truncate text-[11px] font-medium",
                                isSelected ? "text-ink" : "text-ink-muted",
                                element.hidden && "line-through",
                              )}
                            >
                              {layerLabel}
                            </span>
                            {element.groupId ? (
                              <span className="shrink-0 rounded bg-surface-muted px-1 py-px text-[8.5px] font-semibold uppercase tracking-wide text-ink-subtle">
                                Grp
                              </span>
                            ) : null}
                          </div>
                        )}
                      </div>

                      {!isEditing ? (
                        <div
                          className="flex shrink-0 items-center gap-0.5"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            disabled={isPageLocked}
                            aria-label="Rename layer"
                            title="Rename layer"
                            onClick={() => {
                              setEditingId(element.id);
                              setDraftName(layerLabel);
                            }}
                            className="inline-flex size-6 items-center justify-center rounded text-ink-subtle opacity-0 transition-opacity hover:bg-surface hover:text-ink group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none"
                          >
                            <Pencil className="size-3" />
                          </button>

                          <button
                            type="button"
                            disabled={isPageLocked}
                            aria-label={element.hidden ? "Show layer" : "Hide layer"}
                            title={element.hidden ? "Show layer" : "Hide layer"}
                            onClick={() =>
                              updateElement(element.id, {
                                hidden: !element.hidden,
                              })
                            }
                            className={cn(
                              "inline-flex size-6 items-center justify-center rounded transition-opacity hover:bg-surface hover:text-ink",
                              element.hidden
                                ? "text-accent opacity-100"
                                : "text-ink-subtle opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                            )}
                          >
                            {element.hidden ? (
                              <EyeOff className="size-3.5" />
                            ) : (
                              <Eye className="size-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isPageLocked}
                            aria-label={
                              element.locked ? "Unlock layer" : "Lock layer"
                            }
                            title={element.locked ? "Unlock layer" : "Lock layer"}
                            onClick={() =>
                              updateElement(element.id, {
                                locked: !element.locked,
                              })
                            }
                            className={cn(
                              "inline-flex size-6 items-center justify-center rounded transition-opacity hover:bg-surface hover:text-ink",
                              element.locked
                                ? "text-accent opacity-100"
                                : "text-ink-subtle opacity-0 group-hover:opacity-100 focus-visible:opacity-100",
                            )}
                          >
                            {element.locked ? (
                              <Lock className="size-3.5" />
                            ) : (
                              <Unlock className="size-3.5" />
                            )}
                          </button>

                          <button
                            type="button"
                            disabled={isPageLocked || element.locked}
                            aria-label="Delete layer"
                            title="Delete layer"
                            onClick={() => removeElement(element.id)}
                            className="inline-flex size-6 items-center justify-center rounded text-ink-subtle opacity-0 transition-opacity hover:bg-danger/10 hover:text-danger group-hover:opacity-100 focus-visible:opacity-100 disabled:pointer-events-none disabled:opacity-0"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}

      <div className="mt-auto border-t border-line px-3.5 py-2.5 text-[10px] leading-3.5 text-ink-subtle">
        {totalSpreadLayers} layer{totalSpreadLayers === 1 ? "" : "s"} on spread ·
        Drag handles to reorder, double-click to rename.
      </div>
    </div>
  );
}
