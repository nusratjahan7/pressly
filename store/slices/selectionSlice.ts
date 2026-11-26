import type { StateCreator } from "zustand";
import type { EditorStore, SelectionSlice } from "@/store/types";
import { getSpreadIndexForPage } from "@/lib/spreads";

export const createSelectionSlice: StateCreator<
  EditorStore,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selection: { pageId: null, elementId: null, spineSelected: false },

  selectElement: (pageId, elementId) => {
    const state = get();
    const pageIndex = state.project.pages.findIndex(
      (page) => page.id === pageId,
    );
    if (pageIndex < 0) return;
    const page = state.project.pages[pageIndex]!;
    if (page.isEndPaper || page.locked) return;
    const spreadIndex = getSpreadIndexForPage(pageIndex);
    set((current) => ({
      selection: { pageId, elementId, spineSelected: false },
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
      selection: { pageId, elementId: null, spineSelected: false },
      ui: { ...current.ui, spreadIndex },
    }));
  },

  selectSpine: () => {
    set((current) => ({
      selection: { pageId: null, elementId: null, spineSelected: true },
      ui: { ...current.ui, spreadIndex: 0 },
    }));
  },

  clearSelection: () => {
    set({ selection: { pageId: null, elementId: null, spineSelected: false } });
  },
});
