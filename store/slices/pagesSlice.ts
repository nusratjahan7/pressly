import type { StateCreator } from "zustand";
import type { EditorStore, PagesSlice } from "@/store/types";
import type { Page } from "@/types";
import { createPage } from "@/lib/project";
import { createId } from "@/lib/id";
import { canAddSpread, getBinding } from "@/lib/binding";
import { useToastStore } from "@/store/toasts";
import {
  clampSpreadIndex,
  COVER_PAGE_COUNT,
  getEditablePageCount,
  getShortSpreadLabel,
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
    const state = get();
    const pages = state.project.pages;
    const editable = getEditablePageCount(pages);
    if (!canAddSpread(state.project.pageSize.binding, editable)) {
      useToastStore.getState().pushToast({
        message: `Page limit reached for ${getBinding(state.project.pageSize.binding).name}.`,
      });
      return;
    }

    // New content pages go immediately before the final spread so the inside
    // back end paper stays glued to the end of the book.
    const spreads = getSpreads(pages);
    const lastSpread = spreads[spreads.length - 1];
    const lastContentBoundary =
      lastSpread && !lastSpread.isCover && !lastSpread.isFirstContent
        ? lastSpread.pageIndices[0]!
        : pages[pages.length - 1]?.isEndPaper
          ? pages.length - 1
          : pages.length;
    const insertAt = Math.max(COVER_PAGE_COUNT + 1, lastContentBoundary);
    const newPages: Page[] = [createPage("paper"), createPage("paper")];

    get().pushHistory();
    const nextPages = [
      ...pages.slice(0, insertAt),
      ...newPages,
      ...pages.slice(insertAt),
    ];
    set((current) => ({
      project: { ...current.project, pages: nextPages },
      selection: { pageId: null, elementId: null },
      ui: {
        ...current.ui,
        spreadIndex: getSpreadIndexForPage(insertAt),
      },
    }));
  },

  duplicateSpread: () => {
    const state = get();
    const spreads = getSpreads(state.project.pages);
    const spread = spreads[state.ui.spreadIndex];
    // The cover, the first spread (end paper + page 1) and the final spread
    // (last page + end paper) are structural and cannot be duplicated.
    if (!spread || spread.isCover || spread.isFirstContent || spread.isLast) {
      return;
    }

    const editable = getEditablePageCount(state.project.pages);
    if (!canAddSpread(state.project.pageSize.binding, editable)) {
      useToastStore.getState().pushToast({
        message: `Page limit reached for ${getBinding(state.project.pageSize.binding).name}.`,
      });
      return;
    }

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
    if (!spread || spread.isCover || spread.isFirstContent || spread.isLast) {
      return;
    }

    const editable = getEditablePageCount(state.project.pages);
    if (!canAddSpread(state.project.pageSize.binding, editable)) {
      useToastStore.getState().pushToast({
        message: `Page limit reached for ${getBinding(state.project.pageSize.binding).name}.`,
      });
      return;
    }

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
        spreadIndex: clampSpreadIndex(current.ui.spreadIndex, nextPages),
      },
    }));

    const label = getShortSpreadLabel(spread, state.project.pages);
    useToastStore.getState().pushToast({
      message: `${label} removed`,
      action: { label: "Undo", onAct: () => get().undo() },
    });
  },

  moveSpread: (fromIndex, toIndex) => {
    const state = get();
    const spreads = getSpreads(state.project.pages);
    if (fromIndex === toIndex) return;

    const source = spreads[fromIndex];
    const target = spreads[toIndex];
    if (!source || !target) return;
    // Structural spreads stay put: cover, first spread and final spread.
    if (
      source.isCover ||
      source.isFirstContent ||
      source.isLast ||
      target.isCover ||
      target.isFirstContent ||
      target.isLast
    ) {
      return;
    }

    const pages = state.project.pages;
    const moving = source.pageIndices.map((index) => pages[index]!);
    const withoutMoving = pages.filter((_, index) => !source.pageIndices.includes(index));

    // Recompute the insertion point against the reduced array.
    let insertAt: number;
    if (toIndex < fromIndex) {
      insertAt = target.pageIndices[0]!;
    } else {
      insertAt = target.pageIndices[target.pageIndices.length - 1]! + 1;
    }
    const minInsert = COVER_PAGE_COUNT + 2;
    const maxInsert = Math.max(minInsert, withoutMoving.length - 2);
    insertAt = Math.max(minInsert, Math.min(insertAt, maxInsert));

    const nextPages = [
      ...withoutMoving.slice(0, insertAt),
      ...moving,
      ...withoutMoving.slice(insertAt),
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
    if (!page || page.isEndPaper || page.locked || page.backgroundId === backgroundId) {
      return;
    }
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
    if (!page || page.isEndPaper || page.locked) return;

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
