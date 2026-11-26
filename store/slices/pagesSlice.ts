import type { StateCreator } from "zustand";
import type { EditorStore, PagesSlice } from "@/store/types";
import type { Page } from "@/types";
import { createPage } from "@/lib/project";
import { createId } from "@/lib/id";
import {
  clampSpreadIndex,
  getSpreadIndexForPage,
  getSpreads,
} from "@/lib/spreads";

export const createPagesSlice: StateCreator<
  EditorStore,
  [],
  [],
  PagesSlice
> = (set, get) => ({
  addSpread: () => {
    const pages = get().project.pages;
    const spreads = getSpreads(pages);
    const lastSpread = spreads[spreads.length - 1];
    const insertAt =
      spreads.length > 1 && lastSpread
        ? lastSpread.pageIndices[0]
        : pages.length;
    const newPages: Page[] = [createPage("paper"), createPage("paper")];

    get().pushHistory();
    const nextPages = [
      ...pages.slice(0, insertAt),
      ...newPages,
      ...pages.slice(insertAt),
    ];
    set((state) => ({
      project: { ...state.project, pages: nextPages },
      selection: { pageId: null, elementId: null },
      ui: {
        ...state.ui,
        spreadIndex: getSpreadIndexForPage(insertAt),
      },
    }));
  },

  duplicateSpread: () => {
    const state = get();
    const spreads = getSpreads(state.project.pages);
    const spread = spreads[state.ui.spreadIndex];
    if (!spread) return;

    const sourcePages = spread.pageIndices
      .map((index) => state.project.pages[index])
      .filter((page): page is Page => Boolean(page));

    const clones: Page[] = sourcePages.map((page) => ({
      ...page,
      id: createId(),
      elements: page.elements.map((element) => ({
        ...structuredClone(element),
        id: createId(),
      })),
    }));

    const insertAt = spread.pageIndices[spread.pageIndices.length - 1] + 1;
    const nextPages = [
      ...state.project.pages.slice(0, insertAt),
      ...clones,
      ...state.project.pages.slice(insertAt),
    ];

    get().pushHistory();
    set((current) => ({
      project: { ...current.project, pages: nextPages },
      selection: { pageId: null, elementId: null },
      ui: {
        ...current.ui,
        spreadIndex: getSpreadIndexForPage(insertAt),
      },
    }));
  },

  removeSpread: () => {
    const state = get();
    const spreads = getSpreads(state.project.pages);
    const spread = spreads[state.ui.spreadIndex];
    if (!spread || spread.isCover || state.project.pages.length <= 2) return;

    get().pushHistory();
    const removeSet = new Set(spread.pageIndices);
    const nextPages = state.project.pages.filter(
      (_, index) => !removeSet.has(index),
    );

    set((current) => ({
      project: { ...current.project, pages: nextPages },
      selection: { pageId: null, elementId: null },
      ui: {
        ...current.ui,
        spreadIndex: clampSpreadIndex(
          current.ui.spreadIndex,
          nextPages,
        ),
      },
    }));
  },

  goToSpread: (index) => {
    const state = get();
    const next = clampSpreadIndex(index, state.project.pages);
    if (next === state.ui.spreadIndex) return;
    set((current) => ({
      ui: { ...current.ui, spreadIndex: next },
      selection: { pageId: null, elementId: null },
    }));
  },

  nextSpread: () => {
    get().goToSpread(get().ui.spreadIndex + 1);
  },

  prevSpread: () => {
    get().goToSpread(get().ui.spreadIndex - 1);
  },

  setPageBackground: (pageId, backgroundId, options) => {
    const page = get().project.pages.find((candidate) => candidate.id === pageId);
    if (!page || page.backgroundId === backgroundId) return;
    if (options?.commit !== false) get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        pages: state.project.pages.map((candidate) =>
          candidate.id === pageId
            ? { ...candidate, backgroundId }
            : candidate,
        ),
      },
    }));
  },

  applyPageTemplate: (pageId, template) => {
    const state = get();
    const page = state.project.pages.find((candidate) => candidate.id === pageId);
    if (!page) return;

    const elements = template.build({
      projectName: state.project.name,
      pageSize: state.project.pageSize,
    });

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === pageId
            ? {
                ...candidate,
                backgroundId: template.backgroundId,
                elements,
              }
            : candidate,
        ),
      },
      selection: { pageId, elementId: null },
    }));
  },
});
