import type { StateCreator } from "zustand";
import type { EditorStore, UiSlice } from "@/store/types";
import { clamp, round } from "@/lib/units";

const MIN_ZOOM = 0.4;
const MAX_ZOOM = 2.5;

export const createUiSlice: StateCreator<EditorStore, [], [], UiSlice> = (
  set,
) => ({
  ui: {
    activeTab: "images",
    sidebarOpen:
      typeof window === "undefined"
        ? true
        : !window.matchMedia("(max-width: 1023px)").matches,
    thumbnailsOpen: true,
    zoom: 1,
    spreadIndex: 0,
    hydrated: false,
    saveState: "idle",
    previewOpen: false,
    exportOpen: false,
  },

  setActiveTab: (tab) =>
    set((state) => ({ ui: { ...state.ui, activeTab: tab } })),

  setSidebarOpen: (open) =>
    set((state) => ({ ui: { ...state.ui, sidebarOpen: open } })),

  toggleSidebar: () =>
    set((state) => ({ ui: { ...state.ui, sidebarOpen: !state.ui.sidebarOpen } })),

  setThumbnailsOpen: (open) =>
    set((state) => ({ ui: { ...state.ui, thumbnailsOpen: open } })),

  toggleThumbnails: () =>
    set((state) => ({
      ui: { ...state.ui, thumbnailsOpen: !state.ui.thumbnailsOpen },
    })),

  setZoom: (zoom) =>
    set((state) => ({
      ui: {
        ...state.ui,
        zoom: clamp(round(zoom, 2), MIN_ZOOM, MAX_ZOOM),
      },
    })),

  zoomIn: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        zoom: clamp(round(state.ui.zoom + 0.1, 2), MIN_ZOOM, MAX_ZOOM),
      },
    })),

  zoomOut: () =>
    set((state) => ({
      ui: {
        ...state.ui,
        zoom: clamp(round(state.ui.zoom - 0.1, 2), MIN_ZOOM, MAX_ZOOM),
      },
    })),

  resetZoom: () =>
    set((state) => ({ ui: { ...state.ui, zoom: 1 } })),

  setHydrated: (hydrated) =>
    set((state) => ({ ui: { ...state.ui, hydrated } })),

  setSaveState: (saveState) =>
    set((state) => ({ ui: { ...state.ui, saveState } })),

  setPreviewOpen: (open) =>
    set((state) => ({ ui: { ...state.ui, previewOpen: open } })),

  setExportOpen: (open) =>
    set((state) => ({ ui: { ...state.ui, exportOpen: open } })),
});
