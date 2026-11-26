import type { StateCreator } from "zustand";
import type { EditorStore, ElementsSlice } from "@/store/types";
import type { Element } from "@/types";
import { nextZIndex } from "@/lib/elements";

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
    const page = get().project.pages.find((candidate) => candidate.id === pageId);
    if (!page) return;

    const placed: Element = {
      ...element,
      zIndex: nextZIndex(page.elements),
    };

    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        pages: state.project.pages.map((candidate) =>
          candidate.id === pageId
            ? { ...candidate, elements: [...candidate.elements, placed] }
            : candidate,
        ),
      },
      selection: { pageId, elementId: placed.id },
    }));
  },

  addElements: (pageId, elements) => {
    if (elements.length === 0) return;
    const page = get().project.pages.find((candidate) => candidate.id === pageId);
    if (!page) return;

    let z = nextZIndex(page.elements);
    const placed = elements.map((element) => ({
      ...element,
      zIndex: z++,
    }));

    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        pages: state.project.pages.map((candidate) =>
          candidate.id === pageId
            ? { ...candidate, elements: [...candidate.elements, ...placed] }
            : candidate,
        ),
      },
      selection: { pageId, elementId: null },
    }));
  },

  updateElement: (elementId, patch, options) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((element) => element.id === elementId),
    );
    if (!page) return;

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

  removeElement: (elementId) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((element) => element.id === elementId),
    );
    if (!page) return;

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === page.id
            ? {
                ...candidate,
                elements: normalizeLayers(
                  candidate.elements.filter(
                    (element) => element.id !== elementId,
                  ),
                ),
              }
            : candidate,
        ),
      },
      selection:
        current.selection.elementId === elementId
          ? { pageId: null, elementId: null }
          : current.selection,
    }));
  },

  moveElementLayer: (elementId, direction) => {
    const state = get();
    const page = state.project.pages.find((candidate) =>
      candidate.elements.some((element) => element.id === elementId),
    );
    if (!page) return;

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
});
