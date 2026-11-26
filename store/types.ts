import type { Element, PageSize, Project } from "@/types";
import type { PageTemplate } from "@/lib/templates";

export type SidebarTab =
  | "images"
  | "templates"
  | "layouts"
  | "backgrounds"
  | "stickers";

export type SaveState = "idle" | "saving" | "saved" | "error";

export interface UiState {
  activeTab: SidebarTab;
  sidebarOpen: boolean;
  thumbnailsOpen: boolean;
  zoom: number;
  spreadIndex: number;
  hydrated: boolean;
  saveState: SaveState;
  previewOpen: boolean;
  exportOpen: boolean;
}

export interface SelectionState {
  pageId: string | null;
  elementId: string | null;
}

export interface HistoryState {
  past: Project[];
  future: Project[];
}

export interface ProjectSlice {
  project: Project;
  renameProject: (name: string) => void;
  setPageSize: (pageSize: PageSize) => void;
  replaceProject: (project: Project) => void;
}

export interface PagesSlice {
  addSpread: () => void;
  duplicateSpread: () => void;
  removeSpread: () => void;
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
}

export interface ElementsSlice {
  addElement: (pageId: string, element: Element) => void;
  addElements: (pageId: string, elements: Element[]) => void;
  updateElement: (
    elementId: string,
    patch: Partial<Element>,
    options?: { commit?: boolean },
  ) => void;
  removeElement: (elementId: string) => void;
  moveElementLayer: (
    elementId: string,
    direction: "forward" | "backward" | "front" | "back",
  ) => void;
}

export interface SelectionSlice {
  selection: SelectionState;
  selectElement: (pageId: string, elementId: string) => void;
  selectPage: (pageId: string) => void;
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
  resetZoom: () => void;
  setHydrated: (hydrated: boolean) => void;
  setSaveState: (state: SaveState) => void;
  setPreviewOpen: (open: boolean) => void;
  setExportOpen: (open: boolean) => void;
}

export type EditorStore = ProjectSlice &
  PagesSlice &
  ElementsSlice &
  SelectionSlice &
  HistorySlice &
  UiSlice;
