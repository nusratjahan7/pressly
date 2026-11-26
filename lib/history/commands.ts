import type {
  Element,
  MediaAsset,
  Page,
  PageBackground,
  PageLayoutMeta,
  PageSize,
  Project,
} from "@/types";
import type { SelectionState } from "@/store/types";
import { createId } from "@/lib/id";
import { clampSpreadIndex } from "@/lib/spreads";

export const HISTORY_LIMIT = 50;

export interface CommandDocumentState {
  project: Project;
  spreadIndex: number;
  selection: SelectionState;
}

export interface EditorCommand {
  readonly id: string;
  readonly type: string;
  readonly label: string;
  readonly timestamp: number;
  execute(state: CommandDocumentState): CommandDocumentState;
  undo(state: CommandDocumentState): CommandDocumentState;
}

export interface PageElementsPatch {
  pageId: string;
  beforeElements: Element[];
  afterElements: Element[];
  beforeLayoutMeta?: PageLayoutMeta;
  afterLayoutMeta?: PageLayoutMeta;
  updateLayoutMeta?: boolean;
}

export interface PageBackgroundChange {
  pageId: string;
  beforeBackgroundId: string;
  beforeBackground?: PageBackground;
  afterBackgroundId: string;
  afterBackground?: PageBackground;
}

function applySelectionSafe(
  pages: Page[],
  selection: SelectionState,
): SelectionState {
  if (!selection.pageId && !selection.elementId && !selection.spineSelected) {
    return selection;
  }
  if (selection.spineSelected) return selection;
  const page = pages.find((p) => p.id === selection.pageId);
  if (!page) {
    return { pageId: null, elementId: null, elementIds: [], spineSelected: false };
  }
  const existingIds = new Set(page.elements.map((el) => el.id));
  const elementIds = selection.elementIds.filter((id) => existingIds.has(id));
  const elementId =
    selection.elementId && existingIds.has(selection.elementId)
      ? selection.elementId
      : (elementIds[elementIds.length - 1] ?? null);
  return {
    pageId: elementIds.length > 0 || elementId ? page.id : selection.pageId,
    elementId,
    elementIds,
    spineSelected: false,
  };
}

/**
 * Concrete command for element additions, deletions, transforms, ordering,
 * styling, locking, grouping, and cross-page transfers on targeted pages.
 */
export function createPageElementsCommand(options: {
  type?: string;
  label: string;
  patches: PageElementsPatch[];
  beforeMedia?: MediaAsset[];
  afterMedia?: MediaAsset[];
  beforeSelection: SelectionState;
  afterSelection?: SelectionState;
}): EditorCommand {
  const {
    type = "elements",
    label,
    patches,
    beforeMedia,
    afterMedia,
    beforeSelection,
    afterSelection,
  } = options;

  const beforeMap = new Map(patches.map((p) => [p.pageId, p]));

  return {
    id: createId(),
    type,
    label,
    timestamp: Date.now(),
    execute(state) {
      const pages = state.project.pages.map((page) => {
        const patch = beforeMap.get(page.id);
        if (!patch) return page;
        return {
          ...page,
          elements: patch.afterElements,
          ...(patch.updateLayoutMeta
            ? { layoutMeta: patch.afterLayoutMeta }
            : {}),
        };
      });
      const nextSelection = afterSelection ?? state.selection;
      return {
        project: {
          ...state.project,
          ...(afterMedia !== undefined ? { mediaLibrary: afterMedia } : {}),
          pages,
        },
        spreadIndex: clampSpreadIndex(state.spreadIndex, pages),
        selection: applySelectionSafe(pages, nextSelection),
      };
    },
    undo(state) {
      const pages = state.project.pages.map((page) => {
        const patch = beforeMap.get(page.id);
        if (!patch) return page;
        return {
          ...page,
          elements: patch.beforeElements,
          ...(patch.updateLayoutMeta
            ? { layoutMeta: patch.beforeLayoutMeta }
            : {}),
        };
      });
      return {
        project: {
          ...state.project,
          ...(beforeMedia !== undefined ? { mediaLibrary: beforeMedia } : {}),
          pages,
        },
        spreadIndex: clampSpreadIndex(state.spreadIndex, pages),
        selection: applySelectionSafe(pages, beforeSelection),
      };
    },
  };
}

/**
 * Concrete command for single-page, spread-wide, or all-page background edits.
 */
export function createPageBackgroundCommand(options: {
  label: string;
  changes: PageBackgroundChange[];
}): EditorCommand {
  const { label, changes } = options;
  const changeMap = new Map(changes.map((c) => [c.pageId, c]));

  return {
    id: createId(),
    type: "page-background",
    label,
    timestamp: Date.now(),
    execute(state) {
      const pages = state.project.pages.map((page) => {
        const c = changeMap.get(page.id);
        if (!c) return page;
        return {
          ...page,
          backgroundId: c.afterBackgroundId,
          background: c.afterBackground,
        };
      });
      return {
        ...state,
        project: { ...state.project, pages },
      };
    },
    undo(state) {
      const pages = state.project.pages.map((page) => {
        const c = changeMap.get(page.id);
        if (!c) return page;
        return {
          ...page,
          backgroundId: c.beforeBackgroundId,
          background: c.beforeBackground,
        };
      });
      return {
        ...state,
        project: { ...state.project, pages },
      };
    },
  };
}

/**
 * Concrete command for structural spread & page operations
 * (add/duplicate/remove/move spread, apply layout, apply template, autofill).
 */
export function createSpreadCommand(options: {
  type?: string;
  label: string;
  beforePages: Page[];
  afterPages: Page[];
  beforeSpreadIndex: number;
  afterSpreadIndex: number;
  beforeSelection: SelectionState;
  afterSelection: SelectionState;
  beforeSpineText?: string;
  afterSpineText?: string;
  beforeMedia?: MediaAsset[];
  afterMedia?: MediaAsset[];
}): EditorCommand {
  const {
    type = "spread-op",
    label,
    beforePages,
    afterPages,
    beforeSpreadIndex,
    afterSpreadIndex,
    beforeSelection,
    afterSelection,
    beforeSpineText,
    afterSpineText,
    beforeMedia,
    afterMedia,
  } = options;

  return {
    id: createId(),
    type,
    label,
    timestamp: Date.now(),
    execute(state) {
      return {
        project: {
          ...state.project,
          pages: afterPages,
          ...(afterSpineText !== undefined ? { spineText: afterSpineText } : {}),
          ...(afterMedia !== undefined ? { mediaLibrary: afterMedia } : {}),
        },
        spreadIndex: clampSpreadIndex(afterSpreadIndex, afterPages),
        selection: applySelectionSafe(afterPages, afterSelection),
      };
    },
    undo(state) {
      return {
        project: {
          ...state.project,
          pages: beforePages,
          ...(beforeSpineText !== undefined ? { spineText: beforeSpineText } : {}),
          ...(beforeMedia !== undefined ? { mediaLibrary: beforeMedia } : {}),
        },
        spreadIndex: clampSpreadIndex(beforeSpreadIndex, beforePages),
        selection: applySelectionSafe(beforePages, beforeSelection),
      };
    },
  };
}

/**
 * Concrete command for document-level properties (name, spineText, pageSize,
 * pageSetup, media library removal).
 */
export function createProjectMetaCommand(options: {
  type?: string;
  label: string;
  before: Partial<
    Pick<Project, "name" | "spineText" | "pageSize" | "pages" | "mediaLibrary">
  >;
  after: Partial<
    Pick<Project, "name" | "spineText" | "pageSize" | "pages" | "mediaLibrary">
  >;
}): EditorCommand {
  const { type = "project-meta", label, before, after } = options;

  return {
    id: createId(),
    type,
    label,
    timestamp: Date.now(),
    execute(state) {
      const nextPages = after.pages ?? state.project.pages;
      return {
        project: {
          ...state.project,
          ...after,
          pages: nextPages,
        },
        spreadIndex: clampSpreadIndex(state.spreadIndex, nextPages),
        selection: applySelectionSafe(nextPages, state.selection),
      };
    },
    undo(state) {
      const prevPages = before.pages ?? state.project.pages;
      return {
        project: {
          ...state.project,
          ...before,
          pages: prevPages,
        },
        spreadIndex: clampSpreadIndex(state.spreadIndex, prevPages),
        selection: applySelectionSafe(prevPages, state.selection),
      };
    },
  };
}

/**
 * Captures minimal page/property diffs between a continuous-gesture baseline
 * (slider drag, stage drag, transform) and the finalized project state.
 * Returns null if no visual or structural property actually changed.
 */
export function createDiffCommand(
  label: string,
  before: CommandDocumentState,
  after: CommandDocumentState,
): EditorCommand | null {
  const bProj = before.project;
  const aProj = after.project;
  if (bProj === aProj) return null;

  const changedPageMap = new Map<string, { before: Page; after: Page }>();
  let structureChanged = bProj.pages.length !== aProj.pages.length;

  if (!structureChanged) {
    for (let i = 0; i < bProj.pages.length; i += 1) {
      const bp = bProj.pages[i]!;
      const ap = aProj.pages[i]!;
      if (bp.id !== ap.id) {
        structureChanged = true;
        break;
      }
      if (bp !== ap) {
        changedPageMap.set(bp.id, { before: bp, after: ap });
      }
    }
  }

  const metaChanged =
    bProj.name !== aProj.name ||
    bProj.spineText !== aProj.spineText ||
    bProj.pageSize !== aProj.pageSize ||
    bProj.mediaLibrary !== aProj.mediaLibrary;

  if (!structureChanged && changedPageMap.size === 0 && !metaChanged) {
    return null;
  }

  if (structureChanged) {
    return createSpreadCommand({
      type: "gesture-diff",
      label,
      beforePages: bProj.pages,
      afterPages: aProj.pages,
      beforeSpreadIndex: before.spreadIndex,
      afterSpreadIndex: after.spreadIndex,
      beforeSelection: before.selection,
      afterSelection: after.selection,
      beforeSpineText: bProj.spineText,
      afterSpineText: aProj.spineText,
      beforeMedia: bProj.mediaLibrary,
      afterMedia: aProj.mediaLibrary,
    });
  }

  return {
    id: createId(),
    type: "gesture-diff",
    label,
    timestamp: Date.now(),
    execute(state) {
      const pages = state.project.pages.map(
        (p) => changedPageMap.get(p.id)?.after ?? p,
      );
      return {
        project: {
          ...state.project,
          name: aProj.name,
          spineText: aProj.spineText,
          pageSize: aProj.pageSize,
          mediaLibrary: aProj.mediaLibrary,
          pages,
        },
        spreadIndex: clampSpreadIndex(after.spreadIndex, pages),
        selection: applySelectionSafe(pages, state.selection),
      };
    },
    undo(state) {
      const pages = state.project.pages.map(
        (p) => changedPageMap.get(p.id)?.before ?? p,
      );
      return {
        project: {
          ...state.project,
          name: bProj.name,
          spineText: bProj.spineText,
          pageSize: bProj.pageSize,
          mediaLibrary: bProj.mediaLibrary,
          pages,
        },
        spreadIndex: clampSpreadIndex(before.spreadIndex, pages),
        selection: applySelectionSafe(pages, before.selection),
      };
    },
  };
}
