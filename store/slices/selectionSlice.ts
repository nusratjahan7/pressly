import type { StateCreator } from "zustand";
import type { EditorStore, SelectionSlice } from "@/store/types";
import { getSpreadIndexForPage } from "@/lib/spreads";

export const createSelectionSlice: StateCreator<
  EditorStore,
  [],
  [],
  SelectionSlice
> = (set, get) => ({
  selection: { pageId: null, elementId: null },

  selectElement: (pageId, elementId) => {
    const state = get();
    const pageIndex = state.project.pages.findIndex(
      (page) => page.id === pageId,
    );
    if (pageIndex < 0) return;
    const spreadIndex = getSpreadIndexForPage(pageIndex);
    set((current) => ({
      selection: { pageId, elementId },
      ui: { ...current.ui, spreadIndex },
    }));
  },

  selectPage: (pageId) => {
    const state = get();
    const pageIndex = state.project.pages.findIndex(
      (page) => page.id === pageId,
    );
    if (pageIndex < 0) return;
    const spreadIndex = getSpreadIndexForPage(pageIndex);
    set((current) => ({
      selection: { pageId, elementId: null },
      ui: { ...current.ui, spreadIndex },
    }));
  },

  clearSelection: () => {
    set({ selection: { pageId: null, elementId: null } });
  },
});
