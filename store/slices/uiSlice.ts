import type { StateCreator } from "zustand";
import type { EditorStore, UiSlice } from "@/store/types";
import { clamp, round } from "@/lib/units";
import { getSpreadLayout } from "@/lib/konva/geometry";
import { createSeedProject } from "@/lib/project";

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 3;
const ZOOM_STEP = 0.1;

export const ZOOM_LIMITS = { min: MIN_ZOOM, max: MAX_ZOOM };

function clampZoom(zoom: number) {
  return clamp(round(zoom, 3), MIN_ZOOM, MAX_ZOOM);
}

/** Pans the view centre by a delta expressed in spread millimetres. */
function panCenterBy(
  center: { x: number; y: number },
  dxMm: number,
  dyMm: number,
) {
  return {
    x: round(center.x - dxMm, 2),
    y: round(center.y - dyMm, 2),
  };
}

export const createUiSlice: StateCreator<EditorStore, [], [], UiSlice> = (
  set,
  get,
) => ({
  ui: {
    activeTab: "images",
    sidebarOpen:
      typeof window === "undefined"
        ? true
        : !window.matchMedia("(max-width: 1023px)").matches,
    thumbnailsOpen: true,
    zoom: 1,
    viewCenter: { x: 0, y: 0 },
    spreadIndex: 0,
    hydrated: false,
    saveState: "idle",
    previewOpen: false,
    exportOpen: false,
    showSafeMargin: true,
    showBleed: false,
    pageSetupOpen: false,
    pageSetupMode: "setup",
    thumbnailView: "strip",
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
    set((state) => ({ ui: { ...state.ui, zoom: clampZoom(zoom) } })),

  zoomIn: () =>
    set((state) => ({
      ui: { ...state.ui, zoom: clampZoom(state.ui.zoom + ZOOM_STEP) },
    })),

  zoomOut: () =>
    set((state) => ({
      ui: { ...state.ui, zoom: clampZoom(state.ui.zoom - ZOOM_STEP) },
    })),

  zoomTo: (zoom, center) =>
    set((state) => ({
      ui: {
        ...state.ui,
        zoom: clampZoom(zoom),
        viewCenter: center ?? state.ui.viewCenter,
      },
    })),

  resetZoom: () => set((state) => ({ ui: { ...state.ui, zoom: 1 } })),

  panBy: (dxMm, dyMm) =>
    set((state) => ({
      ui: {
        ...state.ui,
        viewCenter: panCenterBy(state.ui.viewCenter, dxMm, dyMm),
      },
    })),

  setViewCenter: (center) =>
    set((state) => ({
      ui: {
        ...state.ui,
        viewCenter: { x: round(center.x, 2), y: round(center.y, 2) },
      },
    })),

  resetView: () => {
    const project = get().project;
    const layout = getSpreadLayout(project.pageSize, 2);
    set((state) => ({
      ui: {
        ...state.ui,
        zoom: 1,
        viewCenter: { x: layout.spreadWidth / 2, y: layout.spreadHeight / 2 },
      },
    }));
  },

  setHydrated: (hydrated) =>
    set((state) => ({ ui: { ...state.ui, hydrated } })),

  setSaveState: (saveState) =>
    set((state) => ({ ui: { ...state.ui, saveState } })),

  setPreviewOpen: (open) =>
    set((state) => ({ ui: { ...state.ui, previewOpen: open } })),

  setExportOpen: (open) =>
    set((state) => ({ ui: { ...state.ui, exportOpen: open } })),

  setShowSafeMargin: (show) =>
    set((state) => ({ ui: { ...state.ui, showSafeMargin: show } })),

  setShowBleed: (show) =>
    set((state) => ({ ui: { ...state.ui, showBleed: show } })),

  openPageSetup: (mode = "setup") =>
    set((state) => ({
      ui: { ...state.ui, pageSetupOpen: true, pageSetupMode: mode },
    })),

  closePageSetup: () =>
    set((state) => ({ ui: { ...state.ui, pageSetupOpen: false } })),

  setThumbnailView: (view) =>
    set((state) => ({ ui: { ...state.ui, thumbnailView: view } })),
});

export function getDefaultViewCenterForProject() {
  const project = createSeedProject();
  const layout = getSpreadLayout(project.pageSize, 2);
  return { x: layout.spreadWidth / 2, y: layout.spreadHeight / 2 };
}
