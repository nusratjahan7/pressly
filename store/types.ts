import type { BindingType, Element, MediaAsset, PageSize, Project } from "@/types";
import type { LayoutDefinition } from "@/lib/layouts";
import type { PageTemplate } from "@/lib/templates";

export type SidebarTab =
  | "images"
  | "templates"
  | "layouts"
  | "backgrounds"
  | "stickers"
  | "setup";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface UiState {
  activeTab: SidebarTab;
  sidebarOpen: boolean;
  thumbnailsOpen: boolean;
  zoom: number;
  /** View centre in spread millimetres. */
  viewCenter: { x: number; y: number };
  spreadIndex: number;
  hydrated: boolean;
  saveState: SaveState;
  previewOpen: boolean;
  exportOpen: boolean;
  showSafeMargin: boolean;
  showBleed: boolean;
  pageSetupOpen: boolean;
  pageSetupMode: "setup" | "new";
  thumbnailView: "strip" | "grid";
  favoriteLayoutIds: string[];
  layoutAnimSeq: number;
  layoutAnimPageIds: string[];
}

export interface SelectionState {
  pageId: string | null;
  elementId: string | null;
  elementIds: string[];
  spineSelected?: boolean;
}

export interface HistoryState {
  past: Project[];
  future: Project[];
}

export interface PageSetupPatch {
  bleed?: number;
  safeMargin?: number;
  binding?: BindingType;
}

export interface CreateProjectOptions {
  name: string;
  pageSize: PageSize;
  /** Number of spreads; each spread contributes two pages. */
  spreads: number;
}

export interface ProjectSlice {
  project: Project;
  renameProject: (name: string) => void;
  setSpineText: (spineText: string) => void;
  /** Applies trim dimensions immediately, rescaling elements proportionally. */
  setPageSize: (pageSize: PageSize) => void;
  /** Applies non-geometric settings: bleed, safe margin and binding. */
  setPageSetup: (patch: PageSetupPatch) => void;
  /** Replaces the document with a blank project using these settings. */
  createProject: (options: CreateProjectOptions) => void;
  replaceProject: (project: Project) => void;
  addMediaAssets: (assets: MediaAsset[]) => void;
  removeMediaAsset: (assetId: string) => void;
  removeMediaAssets: (assetIds: string[]) => void;
}

export interface PagesSlice {
  addSpread: () => void;
  duplicateSpread: () => void;
  removeSpread: () => void;
  /** Moves a spread to a new position. The cover is pinned at index 0. */
  moveSpread: (fromIndex: number, toIndex: number) => void;
  goToSpread: (index: number) => void;
  nextSpread: () => void;
  prevSpread: () => void;
  setPageBackground: (
    pageId: string,
    backgroundId: string,
    options?: { commit?: boolean },
  ) => void;
  applyPageTemplate: (
    pageId: string,
    template: Pick<PageTemplate, "backgroundId" | "build">,
  ) => void;
  applyLayout: (
    pageId: string,
    layout: LayoutDefinition,
    options?: { gapMm?: number; marginMm?: number },
  ) => void;
  updatePageLayoutSpacing: (
    pageId: string,
    patch: { gapMm?: number; marginMm?: number },
    options?: { commit?: boolean },
  ) => void;
  autofillUnusedPhotos: () => number;
}

export interface ElementsSlice {
  addElement: (pageId: string, element: Element) => void;
  addElements: (pageId: string, elements: Element[]) => void;
  updateElement: (
    elementId: string,
    patch: Partial<Element>,
    options?: { commit?: boolean },
  ) => void;
  moveElements: (
    updates: Array<{ id: string; x: number; y: number }>,
    options?: { commit?: boolean },
  ) => void;
  transformElements: (
    updates: Array<{
      id: string;
      x: number;
      y: number;
      width: number;
      height: number;
      rotation: number;
    }>,
    options?: { commit?: boolean },
  ) => void;
  removeElement: (elementId: string) => void;
  removeElements: (elementIds: string[]) => void;
  setElementsLocked: (elementIds: string[], locked: boolean) => void;
  groupElements: (elementIds: string[]) => void;
  ungroupElements: (elementIds: string[]) => void;
  flipElements: (
    elementIds: string[],
    axis: "horizontal" | "vertical",
  ) => void;
  alignElements: (
    pageId: string,
    elementIds: string[],
    alignment: "left" | "center" | "right" | "top" | "middle" | "bottom",
  ) => void;
  distributeElements: (
    pageId: string,
    elementIds: string[],
    axis: "horizontal" | "vertical",
  ) => void;
  moveElementLayer: (
    elementId: string,
    direction: "forward" | "backward" | "front" | "back",
  ) => void;
  fillFramePhoto: (
    elementId: string,
    photo: { src: string; alt: string },
  ) => void;
  clearFramePhoto: (elementId: string) => void;
  swapFramePhotos: (sourceElementId: string, targetElementId: string) => void;
  resizeGutterFrames: (
    pageId: string,
    updates: Array<{ id: string; x?: number; y?: number; width?: number; height?: number }>,
    options?: { commit?: boolean },
  ) => void;
}

export interface SelectionSlice {
  selection: SelectionState;
  selectElement: (
    pageId: string,
    elementId: string,
    options?: { additive?: boolean },
  ) => void;
  selectElements: (pageId: string, elementIds: string[]) => void;
  selectPage: (pageId: string) => void;
  selectSpine: () => void;
  clearSelection: () => void;
}

export interface HistorySlice {
  history: HistoryState;
  pushHistory: () => void;
  undo: () => void;
  redo: () => void;
}

export interface UiSlice {
  ui: UiState;
  setActiveTab: (tab: SidebarTab) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setThumbnailsOpen: (open: boolean) => void;
  toggleThumbnails: () => void;
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  zoomTo: (zoom: number, center?: { x: number; y: number }) => void;
  resetZoom: () => void;
  panBy: (dx: number, dy: number) => void;
  setViewCenter: (center: { x: number; y: number }) => void;
  resetView: () => void;
  setHydrated: (hydrated: boolean) => void;
  setSaveState: (state: SaveState) => void;
  setPreviewOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
  setShowSafeMargin: (show: boolean) => void;
  setShowBleed: (show: boolean) => void;
  openPageSetup: (mode?: "setup" | "new") => void;
  closePageSetup: () => void;
  setThumbnailView: (view: "strip" | "grid") => void;
  toggleFavoriteLayout: (layoutId: string) => void;
  setFavoriteLayouts: (ids: string[]) => void;
}

export type EditorStore = ProjectSlice &
  PagesSlice &
  ElementsSlice &
  SelectionSlice &
  HistorySlice &
  UiSlice;
