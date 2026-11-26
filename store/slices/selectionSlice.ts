import type { StateCreator } from "zustand";
import type { EditorStore, SelectionSlice, SelectionState } from "@/store/types";
import { getSpreadIndexForPage } from "@/lib/spreads";

export const EMPTY_SELECTION: SelectionState = {
  pageId: null,
  elementId: null,
  elementIds: [],
  spineSelected: false,
};

export const createSelectionSlice: StateCreator<
  EditorStore,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selection: EMPTY_SELECTION,

  selectElement: (pageId, elementId, options) => {
    const state = get();
    const pageIndex = state.project.pages.findIndex(
      (page) => page.id === pageId,
    );
    if (pageIndex < 0) return;
    const page = state.project.pages[pageIndex]!;
    if (page.isEndPaper || page.locked) return;
    const clicked = page.elements.find((el) => el.id === elementId);
    if (!clicked) return;

    const groupMembers = clicked.groupId
      ? page.elements
          .filter((el) => el.groupId === clicked.groupId)
          .map((el) => el.id)
      : [elementId];

    const spreadIndex = getSpreadIndexForPage(pageIndex);

    if (options?.additive && state.selection.pageId === pageId) {
      const currentSet = new Set(state.selection.elementIds);
      const alreadyAllSelected = groupMembers.every((id) => currentSet.has(id));
      if (alreadyAllSelected) {
        for (const id of groupMembers) currentSet.delete(id);
      } else {
        for (const id of groupMembers) currentSet.add(id);
      }
      const nextIds = Array.from(currentSet);
      set((current) => ({
        selection: {
          pageId,
          elementId: nextIds[nextIds.length - 1] ?? null,
          elementIds: nextIds,
          spineSelected: false,
        },
        ui: { ...current.ui, spreadIndex },
      }));
      return;
    }

    set((current) => ({
      selection: {
        pageId,
        elementId,
        elementIds: groupMembers,
        spineSelected: false,
      },
      ui: { ...current.ui, spreadIndex },
    }));
  },

  selectElements: (pageId, elementIds) => {
    const state = get();
    const pageIndex = state.project.pages.findIndex(
      (page) => page.id === pageId,
    );
    if (pageIndex < 0) return;
    const page = state.project.pages[pageIndex]!;
    if (page.isEndPaper || page.locked) return;
    const validIds = Array.from(
      new Set(
        elementIds.filter((id) => page.elements.some((el) => el.id === id)),
      ),
    );
    const spreadIndex = getSpreadIndexForPage(pageIndex);
    set((current) => ({
      selection: {
        pageId,
        elementId: validIds[validIds.length - 1] ?? null,
        elementIds: validIds,
        spineSelected: false,
      },
      ui: { ...current.ui, spreadIndex },
    }));
  },

  selectPage: (pageId) => {
    const state = get();
    const pageIndex = state.project.pages.findIndex(
      (page) => page.id === pageId,
    );
    if (pageIndex < 0) return;
    const page = state.project.pages[pageIndex]!;
    if (page.isEndPaper || page.locked) return;
    const spreadIndex = getSpreadIndexForPage(pageIndex);
    set((current) => ({
      selection: {
        pageId,
        elementId: null,
        elementIds: [],
        spineSelected: false,
      },
      ui: { ...current.ui, spreadIndex },
    }));
  },

  selectSpine: () => {
    set((current) => ({
      selection: {
        pageId: null,
        elementId: null,
        elementIds: [],
        spineSelected: true,
      },
      ui: { ...current.ui, spreadIndex: 0 },
    }));
  },

  clearSelection: () => {
    set({ selection: EMPTY_SELECTION });
  },
});
