import type { StateCreator } from "zustand";
import type { Element, Page, PageSize, Project } from "@/types";
import type { EditorStore, ProjectSlice } from "@/store/types";
import { createSeedProject } from "@/lib/project";
import { createId } from "@/lib/id";
import { createCoverPage, createEndPaper, createPage } from "@/lib/project";
import { clamp, round } from "@/lib/units";

export const MIN_TRIM_MM = 20;
export const MAX_TRIM_MM = 1000;
export const DEFAULT_BLEED_MM = 3;
export const DEFAULT_SAFE_MARGIN_MM = 5;

function normalizePageSize(pageSize: PageSize): PageSize {
  return {
    w: clamp(round(pageSize.w, 2), MIN_TRIM_MM, MAX_TRIM_MM),
    h: clamp(round(pageSize.h, 2), MIN_TRIM_MM, MAX_TRIM_MM),
    unit: "mm",
    bleed: clamp(round(pageSize.bleed, 2), 0, 25),
    safeMargin: clamp(round(pageSize.safeMargin, 2), 0, 50),
    binding: pageSize.binding,
  };
}

function scaleElement(element: Element, rx: number, ry: number): Element {
  const geometry = {
    x: round(element.x * rx),
    y: round(element.y * ry),
    width: round(element.width * rx),
    height: round(element.height * ry),
  };
  const ratio = Math.min(rx, ry);

  switch (element.type) {
    case "text":
      return {
        ...element,
        ...geometry,
        fontSize: round(element.fontSize * ratio, 2),
        letterSpacing: round(element.letterSpacing * ratio, 2),
      };
    case "shape":
      return {
        ...element,
        ...geometry,
        strokeWidth: round(element.strokeWidth * ratio, 2),
        radius: round(element.radius * ratio, 2),
      };
    case "image":
      return {
        ...element,
        ...geometry,
        radius: round(element.radius * ratio, 2),
      };
    default:
      return { ...element, ...geometry };
  }
}

/**
 * Pure preview of a trim change: the pages that *would* result, without
 * touching the store. The setup dialog uses this so its confirmation preview
 * can show real rescaled content before anything is committed.
 */
export function previewPageSizeChange(
  project: Project,
  next: PageSize,
): { pages: Page[]; rx: number; ry: number } {
  const current = project.pageSize;
  const rx = next.w / current.w;
  const ry = next.h / current.h;
  return {
    rx,
    ry,
    pages: project.pages.map((page) => ({
      ...page,
      elements: page.elements.map((element) => scaleElement(element, rx, ry)),
    })),
  };
}

export const createProjectSlice: StateCreator<
  EditorStore,
  [],
  [],
  ProjectSlice
> = (set, get) => ({
  project: createSeedProject(),

  renameProject: (name) => {
    const trimmed = name.trim().replace(/\s+/g, " ").slice(0, 80);
    if (!trimmed || trimmed === get().project.name) return;
    get().pushHistory();
    set((state) => ({
      project: { ...state.project, name: trimmed },
    }));
  },

  setSpineText: (spineText) => {
    const normalized = spineText.replace(/[\r\n]+/g, " ").slice(0, 80);
    if (normalized === (get().project.spineText ?? get().project.name)) return;
    get().pushHistory();
    set((state) => ({
      project: { ...state.project, spineText: normalized },
    }));
  },

  setPageSize: (pageSize) => {
    const current = get().project.pageSize;
    const next = normalizePageSize({ ...current, ...pageSize });

    if (
      Math.abs(current.w - next.w) < 0.001 &&
      Math.abs(current.h - next.h) < 0.001 &&
      Math.abs(current.bleed - next.bleed) < 0.001 &&
      Math.abs(current.safeMargin - next.safeMargin) < 0.001 &&
      current.binding === next.binding
    ) {
      return;
    }

    const rx = next.w / current.w;
    const ry = next.h / current.h;

    get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        pageSize: next,
        pages: state.project.pages.map((page) => ({
          ...page,
          elements: page.elements.map((element) =>
            scaleElement(element, rx, ry),
          ),
        })),
      },
    }));
  },

  setPageSetup: (patch) => {
    const current = get().project.pageSize;
    const next = normalizePageSize({
      ...current,
      bleed: patch.bleed ?? current.bleed,
      safeMargin: patch.safeMargin ?? current.safeMargin,
      binding: patch.binding ?? current.binding,
    });

    if (
      Math.abs(current.bleed - next.bleed) < 0.001 &&
      Math.abs(current.safeMargin - next.safeMargin) < 0.001 &&
      current.binding === next.binding
    ) {
      return;
    }

    // Bleed and margins are print furniture, not geometry, so nothing rescales.
    get().pushHistory();
    set((state) => ({
      project: { ...state.project, pageSize: next },
    }));
  },

  createProject: ({ name, pageSize, spreads }) => {
    const next = normalizePageSize(pageSize);
    const spreadCount = clamp(Math.round(spreads), 1, 200);

    // Build a real book: cover spread, first spread with the inside-front end
    // paper, then content pages, ending with the inside-back end paper.
    const contentPages = spreadCount * 2;
    const pages: Page[] = [
      createCoverPage("back"),
      createCoverPage("front", "ivory"),
      createEndPaper(),
    ];
    for (let index = 0; index < contentPages; index += 1) {
      pages.push(createPage("paper"));
    }
    pages.push(createEndPaper());

    get().pushHistory();
    set((state) => ({
      project: {
        id: createId(),
        name: name.trim() || "Untitled Issue",
        pageSize: next,
        pages,
      },
      selection: { pageId: null, elementId: null },
      ui: {
        ...state.ui,
        spreadIndex: 0,
        viewCenter: { x: next.w, y: next.h / 2 },
      },
    }));
  },

  replaceProject: (project) => {
    set({ project });
  },
});
