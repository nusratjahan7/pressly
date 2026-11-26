import type { StateCreator } from "zustand";
import type { Element, PageSize } from "@/types";
import type { EditorStore, ProjectSlice } from "@/store/types";
import { createSeedProject } from "@/lib/project";
import { clamp, round } from "@/lib/units";

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

  setPageSize: (pageSize) => {
    const current = get().project.pageSize;
    const next: PageSize = {
      w: clamp(round(pageSize.w, 2), 20, 1000),
      h: clamp(round(pageSize.h, 2), 20, 1000),
      unit: "mm",
      bleed: clamp(round(pageSize.bleed, 2), 0, 25),
    };

    if (
      Math.abs(current.w - next.w) < 0.001 &&
      Math.abs(current.h - next.h) < 0.001 &&
      Math.abs(current.bleed - next.bleed) < 0.001
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

  replaceProject: (project) => {
    set({ project });
  },
});
