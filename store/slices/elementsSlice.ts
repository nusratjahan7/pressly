import type { StateCreator } from "zustand";
import type { EditorStore, ElementsSlice } from "@/store/types";
import type { Element, ImageElement, MediaAsset } from "@/types";
import { nextZIndex } from "@/lib/elements";
import { createId } from "@/lib/id";
import { round } from "@/lib/units";

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
  state: { project: { pages: Array<{ id: string; isEndPaper?: boolean; locked?: boolean }> } },
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

    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        mediaLibrary:
          placed.type === "image" && placed.src
            ? mergeMedia(state.project.mediaLibrary, [
                { src: placed.src, alt: placed.alt },
              ])
            : state.project.mediaLibrary,
        pages: state.project.pages.map((candidate) =>
          candidate.id === pageId
            ? { ...candidate, elements: [...candidate.elements, placed] }
            : candidate,
        ),
      },
      selection: {
        pageId,
        elementId: placed.id,
        elementIds: [placed.id],
        spineSelected: false,
      },
    }));
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

    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        mediaLibrary:
          newMedia.length > 0
            ? mergeMedia(state.project.mediaLibrary, newMedia)
            : state.project.mediaLibrary,
        pages: state.project.pages.map((candidate) =>
          candidate.id === pageId
            ? { ...candidate, elements: [...candidate.elements, ...placed] }
            : candidate,
        ),
      },
      selection: {
        pageId,
        elementId: null,
        elementIds: [],
        spineSelected: false,
      },
    }));
  },

  updateElement: (elementId, patch, options) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((element) => element.id === elementId),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    const existing = page.elements.find((element) => element.id === elementId);
    if (!existing) return;

    if (options?.commit !== false) get().pushHistory();

    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) => {
          if (candidate.id !== page.id) return candidate;
          return {
            ...candidate,
            elements: candidate.elements.map((element) =>
              element.id === elementId
                ? ({
                    ...element,
                    ...patch,
                    id: element.id,
                    type: element.type,
                  } as Element)
                : element,
            ),
          };
        }),
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

    if (options?.commit !== false) get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) => {
                  const u = map.get(el.id);
                  if (!u || el.locked) return el;
                  return { ...el, x: round(u.x), y: round(u.y) };
                }),
              }
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

    if (options?.commit !== false) get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) => {
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
                }),
              }
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

    get().pushHistory();
    set((current) => {
      const remainingIds = current.selection.elementIds.filter(
        (id) => !removable.has(id),
      );
      return {
        project: {
          ...current.project,
          pages: current.project.pages.map((candidate) =>
            candidate.id === page.id
              ? {
                  ...candidate,
                  elements: normalizeLayers(
                    candidate.elements.filter((el) => !removable.has(el.id)),
                  ),
                }
              : candidate,
          ),
        },
        selection:
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
              },
      };
    });
  },

  setElementsLocked: (elementIds, locked) => {
    if (elementIds.length === 0) return;
    const idSet = new Set(elementIds);
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => idSet.has(el.id)),
    );
    if (!page || !isPageEditable(state, page.id)) return;

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) =>
                  idSet.has(el.id) ? { ...el, locked } : el,
                ),
              }
            : candidate,
        ),
      },
    }));
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
    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) =>
                  targetIds.has(el.id) ? { ...el, groupId } : el,
                ),
              }
            : candidate,
        ),
      },
    }));
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

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) =>
                  idSet.has(el.id) || (el.groupId && groupIds.has(el.groupId))
                    ? { ...el, groupId: undefined }
                    : el,
                ),
              }
            : candidate,
        ),
      },
    }));
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

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) => {
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
                }),
              }
            : candidate,
        ),
      },
    }));
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

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) => {
                  if (!idSet.has(el.id) || el.locked) return el;
                  switch (alignment) {
                    case "left":
                      return { ...el, x: round(refMinX) };
                    case "center":
                      return {
                        ...el,
                        x: round((refMinX + refMaxX - el.width) / 2),
                      };
                    case "right":
                      return { ...el, x: round(refMaxX - el.width) };
                    case "top":
                      return { ...el, y: round(refMinY) };
                    case "middle":
                      return {
                        ...el,
                        y: round((refMinY + refMaxY - el.height) / 2),
                      };
                    case "bottom":
                      return { ...el, y: round(refMaxY - el.height) };
                  }
                }),
              }
            : candidate,
        ),
      },
    }));
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

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) => {
                  const val = nextPos.get(el.id);
                  if (val === undefined) return el;
                  return axis === "horizontal" ? { ...el, x: val } : { ...el, y: val };
                }),
              }
            : candidate,
        ),
      },
    }));
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

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((element) => ({
                  ...element,
                  zIndex: layerMap.get(element.id) ?? element.zIndex,
                })),
              }
            : candidate,
        ),
      },
    }));
  },

  fillFramePhoto: (elementId, photo) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => el.id === elementId),
    );
    if (!page || !isPageEditable(state, page.id)) return;
    const target = page.elements.find((el) => el.id === elementId);
    if (!target || target.type !== "image") return;

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        mediaLibrary: mergeMedia(current.project.mediaLibrary, [photo]),
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) =>
                  el.id === elementId && el.type === "image"
                    ? {
                        ...el,
                        src: photo.src,
                        alt: photo.alt,
                        fit: "cover",
                        cropScale: 1,
                        cropX: 0,
                        cropY: 0,
                      }
                    : el,
                ),
              }
            : candidate,
        ),
      },
      selection: {
        pageId: page.id,
        elementId,
        elementIds: [elementId],
        spineSelected: false,
      },
    }));
  },

  clearFramePhoto: (elementId) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((el) => el.id === elementId),
    );
    if (!page || !isPageEditable(state, page.id)) return;
    const target = page.elements.find((el) => el.id === elementId);
    if (!target || target.type !== "image" || !target.src) return;

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        mediaLibrary: mergeMedia(current.project.mediaLibrary, [
          { src: target.src, alt: target.alt },
        ]),
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: candidate.elements.map((el) =>
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
                ),
              }
            : candidate,
        ),
      },
    }));
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

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) => {
          if (candidate.id !== sourcePage.id && candidate.id !== targetPage.id) {
            return candidate;
          }
          return {
            ...candidate,
            elements: candidate.elements.map((el) => {
              if (el.id === sourceElementId && el.type === "image") {
                return { ...el, ...targetPayload };
              }
              if (el.id === targetElementId && el.type === "image") {
                return { ...el, ...sourcePayload };
              }
              return el;
            }),
          };
        }),
      },
      selection: {
        pageId: targetPage.id,
        elementId: targetElementId,
        elementIds: [targetElementId],
        spineSelected: false,
      },
    }));
  },

  resizeGutterFrames: (pageId, updates, options) => {
    if (updates.length === 0) return;
    const state = get();
    if (!isPageEditable(state, pageId)) return;

    if (options?.commit !== false) get().pushHistory();
    const map = new Map(updates.map((u) => [u.id, u]));

    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) => {
          if (candidate.id !== pageId) return candidate;
          return {
            ...candidate,
            elements: candidate.elements.map((el) => {
              const patch = map.get(el.id);
              if (!patch) return el;
              return {
                ...el,
                x: patch.x ?? el.x,
                y: patch.y ?? el.y,
                width: patch.width ?? el.width,
                height: patch.height ?? el.height,
              };
            }),
          };
        }),
      },
    }));
  },
});
