import type { StateCreator } from "zustand";
import type { EditorStore, ElementsSlice } from "@/store/types";
import type { Element, ImageElement, MediaAsset } from "@/types";
import { nextZIndex } from "@/lib/elements";
import { createId } from "@/lib/id";
import { round } from "@/lib/units";
import { createPageElementsCommand } from "@/lib/history/commands";

function mergeMedia(
  existing: MediaAsset[] | undefined,
  items: Array<{ src: string; alt: string }>,
): MediaAsset[] {
  const next = [...(existing ?? [])];
  const seen = new Set(next.map((item) => item.src));
  for (const item of items) {
    if (!item.src || seen.has(item.src)) continue;
    seen.add(item.src);
    next.push({ id: createId(), src: item.src, alt: item.alt });
  }
  return next;
}

function isPageEditable(
  state: {
    project: {
      pages: Array<{ id: string; isEndPaper?: boolean; locked?: boolean }>;
    };
  },
  pageId: string,
) {
  const page = state.project.pages.find((candidate) => candidate.id === pageId);
  return Boolean(page && !page.isEndPaper && !page.locked);
}

function normalizeLayers(elements: Element[]) {
  return elements.map((element, index) => ({ ...element, zIndex: index }));
}

export const createElementsSlice: StateCreator<
  EditorStore,
  [],
  [],
  ElementsSlice
> = (set, get) => ({
  addElement: (pageId, element) => {
    const step = get();
    const page = step.project.pages.find((candidate) => candidate.id === pageId);
    if (!page || !isPageEditable(step, pageId)) return;

    const placed: Element = {
      ...element,
      zIndex: nextZIndex(page.elements),
    };
    const afterElements = [...page.elements, placed];
    const nextMedia =
      placed.type === "image" && placed.src
        ? mergeMedia(step.project.mediaLibrary, [
            { src: placed.src, alt: placed.alt },
          ])
        : undefined;

    step.executeCommand(
      createPageElementsCommand({
        type: "add-element",
        label: "Add element",
        patches: [
          {
            pageId,
            beforeElements: page.elements,
            afterElements,
          },
        ],
        beforeMedia: nextMedia ? step.project.mediaLibrary : undefined,
        afterMedia: nextMedia,
        beforeSelection: step.selection,
        afterSelection: {
          pageId,
          elementId: placed.id,
          elementIds: [placed.id],
          spineSelected: false,
        },
      }),
    );
  },

  addElements: (pageId, elements) => {
    if (elements.length === 0) return;
    const step = get();
    const page = step.project.pages.find((candidate) => candidate.id === pageId);
    if (!page || !isPageEditable(step, pageId)) return;

    let z = nextZIndex(page.elements);
    const placed = elements.map((element) => ({
      ...element,
      zIndex: z++,
    }));
    const newMedia = placed
      .filter((el): el is ImageElement => el.type === "image" && Boolean(el.src))
      .map((el) => ({ src: el.src, alt: el.alt }));
    const nextMedia =
      newMedia.length > 0
        ? mergeMedia(step.project.mediaLibrary, newMedia)
        : undefined;

    step.executeCommand(
      createPageElementsCommand({
        type: "add-elements",
        label: "Add elements",
        patches: [
          {
            pageId,
            beforeElements: page.elements,
            afterElements: [...page.elements, ...placed],
          },
        ],
        beforeMedia: nextMedia ? step.project.mediaLibrary : undefined,
        afterMedia: nextMedia,
        beforeSelection: step.selection,
        afterSelection: {
          pageId,
          elementId: null,
          elementIds: [],
          spineSelected: false,
        },
      }),
    );
  },

  updateElement: (elementId, patch, options) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((element) => element.id === elementId),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const existing = page.elements.find((element) => element.id === elementId);
    if (!existing) return;

    const nextElements = page.elements.map((element) =>
      element.id === elementId
        ? ({
            ...element,
            ...patch,
            id: element.id,
            type: element.type,
          } as Element)
        : element,
    );

    if (options?.commit !== false) {
      const label =
        "hidden" in patch
          ? patch.hidden
            ? "Hide layer"
            : "Show layer"
          : "locked" in patch
            ? patch.locked
              ? "Lock layer"
              : "Unlock layer"
            : "name" in patch
              ? "Rename layer"
              : "Edit element";

      state.executeCommand(
        createPageElementsCommand({
          type: "update-element",
          label,
          patches: [
            {
              pageId: page.id,
              beforeElements: page.elements,
              afterElements: nextElements,
            },
          ],
          beforeSelection: state.selection,
        }),
      );
      return;
    }

    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? { ...candidate, elements: nextElements }
            : candidate,
        ),
      },
    }));
  },

  moveElements: (updates, options) => {
    if (updates.length === 0) return;
    const map = new Map(updates.map((u) => [u.id, u]));
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => map.has(el.id)),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const nextElements = page.elements.map((el) => {
      const u = map.get(el.id);
      if (!u || el.locked) return el;
      return { ...el, x: round(u.x), y: round(u.y) };
    });

    if (options?.commit !== false) {
      state.executeCommand(
        createPageElementsCommand({
          type: "move-elements",
          label: "Move elements",
          patches: [
            {
              pageId: page.id,
              beforeElements: page.elements,
              afterElements: nextElements,
            },
          ],
          beforeSelection: state.selection,
        }),
      );
      return;
    }

    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? { ...candidate, elements: nextElements }
            : candidate,
        ),
      },
    }));
  },

  transformElements: (updates, options) => {
    if (updates.length === 0) return;
    const map = new Map(updates.map((u) => [u.id, u]));
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => map.has(el.id)),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const nextElements = page.elements.map((el) => {
      const u = map.get(el.id);
      if (!u || el.locked) return el;
      return {
        ...el,
        x: round(u.x),
        y: round(u.y),
        width: round(u.width),
        height: round(u.height),
        rotation: round(u.rotation),
      };
    });

    if (options?.commit !== false) {
      state.executeCommand(
        createPageElementsCommand({
          type: "transform-elements",
          label: "Transform elements",
          patches: [
            {
              pageId: page.id,
              beforeElements: page.elements,
              afterElements: nextElements,
            },
          ],
          beforeSelection: state.selection,
        }),
      );
      return;
    }

    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? { ...candidate, elements: nextElements }
            : candidate,
        ),
      },
    }));
  },

  removeElement: (elementId) => {
    get().removeElements([elementId]);
  },

  removeElements: (elementIds) => {
    if (elementIds.length === 0) return;
    const state = get();
    const idSet = new Set(elementIds);
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => idSet.has(el.id)),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const removable = new Set(
      page.elements
        .filter((el) => idSet.has(el.id) && !el.locked)
        .map((el) => el.id),
    );
    if (removable.size === 0) return;

    const nextElements = normalizeLayers(
      page.elements.filter((el) => !removable.has(el.id)),
    );
    const remainingIds = state.selection.elementIds.filter(
      (id) => !removable.has(id),
    );
    const nextSelection =
      remainingIds.length > 0
        ? {
            pageId: page.id,
            elementId: remainingIds[remainingIds.length - 1]!,
            elementIds: remainingIds,
            spineSelected: false,
          }
        : {
            pageId: null,
            elementId: null,
            elementIds: [],
            spineSelected: false,
          };

    state.executeCommand(
      createPageElementsCommand({
        type: "remove-elements",
        label: removable.size > 1 ? "Delete layers" : "Delete layer",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeSelection: state.selection,
        afterSelection: nextSelection,
      }),
    );
  },

  setElementsLocked: (elementIds, locked) => {
    if (elementIds.length === 0) return;
    const idSet = new Set(elementIds);
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => idSet.has(el.id)),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const nextElements = page.elements.map((el) =>
      idSet.has(el.id) ? { ...el, locked } : el,
    );

    state.executeCommand(
      createPageElementsCommand({
        type: "lock-elements",
        label: locked ? "Lock layers" : "Unlock layers",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeSelection: state.selection,
      }),
    );
  },

  groupElements: (elementIds) => {
    const idSet = new Set(elementIds);
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => idSet.has(el.id)),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const targets = page.elements.filter((el) => idSet.has(el.id) && !el.locked);
    if (targets.length < 2) return;

    const groupId = createId();
    const targetIds = new Set(targets.map((t) => t.id));
    const nextElements = page.elements.map((el) =>
      targetIds.has(el.id) ? { ...el, groupId } : el,
    );

    state.executeCommand(
      createPageElementsCommand({
        type: "group-elements",
        label: "Group layers",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeSelection: state.selection,
      }),
    );
  },

  ungroupElements: (elementIds) => {
    const idSet = new Set(elementIds);
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => idSet.has(el.id)),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const groupIds = new Set(
      page.elements
        .filter((el) => idSet.has(el.id) && el.groupId)
        .map((el) => el.groupId!),
    );
    if (groupIds.size === 0) return;

    const nextElements = page.elements.map((el) =>
      idSet.has(el.id) || (el.groupId && groupIds.has(el.groupId))
        ? { ...el, groupId: undefined }
        : el,
    );

    state.executeCommand(
      createPageElementsCommand({
        type: "ungroup-elements",
        label: "Ungroup layers",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeSelection: state.selection,
      }),
    );
  },

  flipElements: (elementIds, axis) => {
    const idSet = new Set(elementIds);
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => idSet.has(el.id)),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const targets = page.elements.filter((el) => idSet.has(el.id) && !el.locked);
    if (targets.length === 0) return;

    const minX = Math.min(...targets.map((el) => el.x));
    const maxX = Math.max(...targets.map((el) => el.x + el.width));
    const minY = Math.min(...targets.map((el) => el.y));
    const maxY = Math.max(...targets.map((el) => el.y + el.height));

    const nextElements = page.elements.map((el) => {
      if (!idSet.has(el.id) || el.locked) return el;
      if (axis === "horizontal") {
        const nextX =
          targets.length > 1
            ? round(maxX - (el.x - minX) - el.width)
            : el.x;
        return { ...el, x: nextX, flipX: !el.flipX };
      }
      const nextY =
        targets.length > 1
          ? round(maxY - (el.y - minY) - el.height)
          : el.y;
      return { ...el, y: nextY, flipY: !el.flipY };
    });

    state.executeCommand(
      createPageElementsCommand({
        type: "flip-elements",
        label: axis === "horizontal" ? "Flip horizontal" : "Flip vertical",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeSelection: state.selection,
      }),
    );
  },

  alignElements: (pageId, elementIds, alignment) => {
    const state = get();
    const page = state.project.pages.find((candidate) => candidate.id === pageId);
    if (!page || !isPageEditable(state, page.id)) return;

    const idSet = new Set(elementIds);
    const targets = page.elements.filter((el) => idSet.has(el.id) && !el.locked);
    if (targets.length === 0) return;

    const refMinX =
      targets.length === 1 ? 0 : Math.min(...targets.map((el) => el.x));
    const refMaxX =
      targets.length === 1
        ? state.project.pageSize.w
        : Math.max(...targets.map((el) => el.x + el.width));
    const refMinY =
      targets.length === 1 ? 0 : Math.min(...targets.map((el) => el.y));
    const refMaxY =
      targets.length === 1
        ? state.project.pageSize.h
        : Math.max(...targets.map((el) => el.y + el.height));

    const nextElements = page.elements.map((el) => {
      if (!idSet.has(el.id) || el.locked) return el;
      switch (alignment) {
        case "left":
          return { ...el, x: round(refMinX) };
        case "center":
          return { ...el, x: round((refMinX + refMaxX - el.width) / 2) };
        case "right":
          return { ...el, x: round(refMaxX - el.width) };
        case "top":
          return { ...el, y: round(refMinY) };
        case "middle":
          return { ...el, y: round((refMinY + refMaxY - el.height) / 2) };
        case "bottom":
          return { ...el, y: round(refMaxY - el.height) };
      }
    });

    state.executeCommand(
      createPageElementsCommand({
        type: "align-elements",
        label: `Align ${alignment}`,
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeSelection: state.selection,
      }),
    );
  },

  distributeElements: (pageId, elementIds, axis) => {
    const state = get();
    const page = state.project.pages.find((candidate) => candidate.id === pageId);
    if (!page || !isPageEditable(state, page.id)) return;

    const idSet = new Set(elementIds);
    const targets = page.elements.filter((el) => idSet.has(el.id) && !el.locked);
    if (targets.length < 3) return;

    const sorted = [...targets].sort((a, b) =>
      axis === "horizontal" ? a.x - b.x : a.y - b.y,
    );
    const first = sorted[0]!;
    const last = sorted[sorted.length - 1]!;
    const nextPos = new Map<string, number>();

    if (axis === "horizontal") {
      const span = last.x + last.width - first.x;
      const occupied = sorted.reduce((sum, el) => sum + el.width, 0);
      const gap = (span - occupied) / (sorted.length - 1);
      let cursor = first.x;
      for (const el of sorted) {
        nextPos.set(el.id, round(cursor));
        cursor += el.width + gap;
      }
    } else {
      const span = last.y + last.height - first.y;
      const occupied = sorted.reduce((sum, el) => sum + el.height, 0);
      const gap = (span - occupied) / (sorted.length - 1);
      let cursor = first.y;
      for (const el of sorted) {
        nextPos.set(el.id, round(cursor));
        cursor += el.height + gap;
      }
    }

    const nextElements = page.elements.map((el) => {
      const val = nextPos.get(el.id);
      if (val === undefined) return el;
      return axis === "horizontal" ? { ...el, x: val } : { ...el, y: val };
    });

    state.executeCommand(
      createPageElementsCommand({
        type: "distribute-elements",
        label:
          axis === "horizontal"
            ? "Distribute horizontally"
            : "Distribute vertically",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeSelection: state.selection,
      }),
    );
  },

  moveElementLayer: (elementId, direction) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((element) => element.id === elementId),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const ordered = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
    const index = ordered.findIndex((element) => element.id === elementId);
    if (index < 0) return;

    let target = index;
    if (direction === "forward") target = Math.min(ordered.length - 1, index + 1);
    if (direction === "backward") target = Math.max(0, index - 1);
    if (direction === "front") target = ordered.length - 1;
    if (direction === "back") target = 0;
    if (target === index) return;

    const [moved] = ordered.splice(index, 1);
    ordered.splice(target, 0, moved);
    const layerMap = new Map(ordered.map((element, layer) => [element.id, layer]));
    const nextElements = page.elements.map((element) => ({
      ...element,
      zIndex: layerMap.get(element.id) ?? element.zIndex,
    }));

    state.executeCommand(
      createPageElementsCommand({
        type: "reorder-layer",
        label: "Reorder layer",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeSelection: state.selection,
      }),
    );
  },

  reorderPageLayers: (pageId, orderedElementIdsBottomToTop) => {
    const state = get();
    const page = state.project.pages.find((candidate) => candidate.id === pageId);
    if (!page || !isPageEditable(state, page.id)) return;

    const rankMap = new Map(
      orderedElementIdsBottomToTop.map((id, idx) => [id, idx]),
    );
    let fallback = orderedElementIdsBottomToTop.length;
    const sorted = [...page.elements].sort((a, b) => {
      const ra = rankMap.get(a.id) ?? fallback++;
      const rb = rankMap.get(b.id) ?? fallback++;
      return ra - rb;
    });
    const changed = sorted.some((el, idx) => el.zIndex !== idx);
    if (!changed) return;

    const nextElements = normalizeLayers(sorted);
    state.executeCommand(
      createPageElementsCommand({
        type: "reorder-layers",
        label: "Reorder layers",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeSelection: state.selection,
      }),
    );
  },

  moveElementToPage: (elementId, targetPageId, targetIndexBottomToTop) => {
    const state = get();
    const sourcePage = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => el.id === elementId),
    );
    const targetPage = state.project.pages.find(
      (candidate) => candidate.id === targetPageId,
    );
    if (
      !sourcePage ||
      !targetPage ||
      !isPageEditable(state, sourcePage.id) ||
      !isPageEditable(state, targetPage.id)
    ) {
      return;
    }

    const moving = sourcePage.elements.find((el) => el.id === elementId);
    if (!moving) return;

    if (sourcePage.id === targetPage.id) {
      const ordered = [...sourcePage.elements]
        .filter((el) => el.id !== elementId)
        .sort((a, b) => a.zIndex - b.zIndex);
      const insertAt = Math.max(
        0,
        Math.min(ordered.length, targetIndexBottomToTop ?? ordered.length),
      );
      ordered.splice(insertAt, 0, moving);
      state.reorderPageLayers(
        sourcePage.id,
        ordered.map((el) => el.id),
      );
      return;
    }

    const nextSourceElements = normalizeLayers(
      sourcePage.elements
        .filter((el) => el.id !== elementId)
        .sort((a, b) => a.zIndex - b.zIndex),
    );
    const targetOrdered = [...targetPage.elements].sort(
      (a, b) => a.zIndex - b.zIndex,
    );
    const insertAt = Math.max(
      0,
      Math.min(targetOrdered.length, targetIndexBottomToTop ?? targetOrdered.length),
    );
    targetOrdered.splice(insertAt, 0, { ...moving, groupId: undefined });
    const nextTargetElements = normalizeLayers(targetOrdered);

    state.executeCommand(
      createPageElementsCommand({
        type: "move-element-page",
        label: "Move layer to page",
        patches: [
          {
            pageId: sourcePage.id,
            beforeElements: sourcePage.elements,
            afterElements: nextSourceElements,
          },
          {
            pageId: targetPage.id,
            beforeElements: targetPage.elements,
            afterElements: nextTargetElements,
          },
        ],
        beforeSelection: state.selection,
        afterSelection: {
          pageId: targetPage.id,
          elementId,
          elementIds: [elementId],
          spineSelected: false,
        },
      }),
    );
  },

  fillFramePhoto: (elementId, photo) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => el.id === elementId),
    );
    if (!page || !isPageEditable(state, page.id)) return;
    const target = page.elements.find((el) => el.id === elementId);
    if (!target || target.type !== "image") return;

    const nextMedia = mergeMedia(state.project.mediaLibrary, [photo]);
    const nextElements = page.elements.map((el) =>
      el.id === elementId && el.type === "image"
        ? {
            ...el,
            src: photo.src,
            alt: photo.alt,
            fit: "cover" as const,
            cropScale: 1,
            cropX: 0,
            cropY: 0,
          }
        : el,
    );

    state.executeCommand(
      createPageElementsCommand({
        type: "fill-frame-photo",
        label: "Place photo",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeMedia: state.project.mediaLibrary,
        afterMedia: nextMedia,
        beforeSelection: state.selection,
        afterSelection: {
          pageId: page.id,
          elementId,
          elementIds: [elementId],
          spineSelected: false,
        },
      }),
    );
  },

  clearFramePhoto: (elementId) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => el.id === elementId),
    );
    if (!page || !isPageEditable(state, page.id)) return;
    const target = page.elements.find((el) => el.id === elementId);
    if (!target || target.type !== "image" || !target.src) return;

    const nextMedia = mergeMedia(state.project.mediaLibrary, [
      { src: target.src, alt: target.alt },
    ]);
    const nextElements = page.elements.map((el) =>
      el.id === elementId && el.type === "image"
        ? {
            ...el,
            src: "",
            alt: "",
            cropScale: 1,
            cropX: 0,
            cropY: 0,
          }
        : el,
    );

    state.executeCommand(
      createPageElementsCommand({
        type: "clear-frame-photo",
        label: "Clear photo",
        patches: [
          {
            pageId: page.id,
            beforeElements: page.elements,
            afterElements: nextElements,
          },
        ],
        beforeMedia: state.project.mediaLibrary,
        afterMedia: nextMedia,
        beforeSelection: state.selection,
      }),
    );
  },

  swapFramePhotos: (sourceElementId, targetElementId) => {
    if (sourceElementId === targetElementId) return;
    const state = get();
    const sourcePage = state.project.pages.find((p) =>
      p.elements.some((el) => el.id === sourceElementId),
    );
    const targetPage = state.project.pages.find((p) =>
      p.elements.some((el) => el.id === targetElementId),
    );
    if (
      !sourcePage ||
      !targetPage ||
      !isPageEditable(state, sourcePage.id) ||
      !isPageEditable(state, targetPage.id)
    ) {
      return;
    }

    const source = sourcePage.elements.find((el) => el.id === sourceElementId);
    const target = targetPage.elements.find((el) => el.id === targetElementId);
    if (!source || !target || source.type !== "image" || target.type !== "image") {
      return;
    }

    const sourcePayload = {
      src: source.src,
      alt: source.alt,
      fit: source.fit,
      cropScale: source.cropScale ?? 1,
      cropX: source.cropX ?? 0,
      cropY: source.cropY ?? 0,
    };
    const targetPayload = {
      src: target.src,
      alt: target.alt,
      fit: target.fit,
      cropScale: target.cropScale ?? 1,
      cropX: target.cropX ?? 0,
      cropY: target.cropY ?? 0,
    };

    const swapOnPage = (elements: Element[]) =>
      elements.map((el) => {
        if (el.id === sourceElementId && el.type === "image") {
          return { ...el, ...targetPayload };
        }
        if (el.id === targetElementId && el.type === "image") {
          return { ...el, ...sourcePayload };
        }
        return el;
      });

    const patches =
      sourcePage.id === targetPage.id
        ? [
            {
              pageId: sourcePage.id,
              beforeElements: sourcePage.elements,
              afterElements: swapOnPage(sourcePage.elements),
            },
          ]
        : [
            {
              pageId: sourcePage.id,
              beforeElements: sourcePage.elements,
              afterElements: swapOnPage(sourcePage.elements),
            },
            {
              pageId: targetPage.id,
              beforeElements: targetPage.elements,
              afterElements: swapOnPage(targetPage.elements),
            },
          ];

    state.executeCommand(
      createPageElementsCommand({
        type: "swap-photos",
        label: "Swap photos",
        patches,
        beforeSelection: state.selection,
        afterSelection: {
          pageId: targetPage.id,
          elementId: targetElementId,
          elementIds: [targetElementId],
          spineSelected: false,
        },
      }),
    );
  },

  resizeGutterFrames: (pageId, updates, options) => {
    if (updates.length === 0) return;
    const state = get();
    const page = state.project.pages.find((candidate) => candidate.id === pageId);
    if (!page || !isPageEditable(state, pageId)) return;

    const map = new Map(updates.map((u) => [u.id, u]));
    const nextElements = page.elements.map((el) => {
      const patch = map.get(el.id);
      if (!patch) return el;
      return {
        ...el,
        x: patch.x ?? el.x,
        y: patch.y ?? el.y,
        width: patch.width ?? el.width,
        height: patch.height ?? el.height,
      };
    });

    if (options?.commit !== false) {
      state.executeCommand(
        createPageElementsCommand({
          type: "resize-gutter",
          label: "Resize grid gutter",
          patches: [
            {
              pageId,
              beforeElements: page.elements,
              afterElements: nextElements,
            },
          ],
          beforeSelection: state.selection,
        }),
      );
      return;
    }

    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === pageId
            ? { ...candidate, elements: nextElements }
            : candidate,
        ),
      },
    }));
  },
});
