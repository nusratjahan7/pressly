"use client";

import { useMemo } from "react";
import { useEditorStore } from "@/store";
import { getSpreads } from "@/lib/spreads";
import type { Element, Page } from "@/types";

export function useSpreads() {
  const pages = useEditorStore((state) => state.project.pages);
  return useMemo(() => getSpreads(pages), [pages]);
}

export function useCurrentSpread() {
  const spreads = useSpreads();
  const rawSpreadIndex = useEditorStore((state) => state.ui.spreadIndex);
  const spreadIndex = Math.min(
    Math.max(rawSpreadIndex, 0),
    Math.max(0, spreads.length - 1),
  );
  return {
    spreads,
    spread: spreads[spreadIndex] ?? spreads[0],
    spreadIndex,
  };
}

export function useSelectedElement(): {
  element: Element;
  page: Page;
  pageIndex: number;
} | null {
  const project = useEditorStore((state) => state.project);
  const elementId = useEditorStore((state) => state.selection.elementId);
  const elementIds = useEditorStore((state) => state.selection.elementIds);

  return useMemo(() => {
    if (elementIds.length > 1) return null;
    const targetId = elementIds[0] ?? elementId;
    if (!targetId) return null;
    for (let pageIndex = 0; pageIndex < project.pages.length; pageIndex += 1) {
      const page = project.pages[pageIndex]!;
      const element = page.elements.find((candidate) => candidate.id === targetId);
      if (element) return { element, page, pageIndex };
    }
    return null;
  }, [project.pages, elementId, elementIds]);
}

export function useSelectedElements(): {
  elements: Element[];
  page: Page;
  pageIndex: number;
} | null {
  const project = useEditorStore((state) => state.project);
  const elementId = useEditorStore((state) => state.selection.elementId);
  const elementIds = useEditorStore((state) => state.selection.elementIds);

  return useMemo(() => {
    const ids = elementIds.length > 0 ? elementIds : elementId ? [elementId] : [];
    if (ids.length === 0) return null;
    const idSet = new Set(ids);
    for (let pageIndex = 0; pageIndex < project.pages.length; pageIndex += 1) {
      const page = project.pages[pageIndex]!;
      const found = page.elements.filter((el) => idSet.has(el.id));
      if (found.length > 0) return { elements: found, page, pageIndex };
    }
    return null;
  }, [project.pages, elementId, elementIds]);
}

export function useActivePage(): { page: Page | null; pageIndex: number } {
  const project = useEditorStore((state) => state.project);
  const spreadIndex = useEditorStore((state) => state.ui.spreadIndex);
  const selectedPageId = useEditorStore((state) => state.selection.pageId);
  const selectedElementId = useEditorStore((state) => state.selection.elementId);

  return useMemo(() => {
    if (selectedPageId) {
      const pageIndex = project.pages.findIndex(
        (page) => page.id === selectedPageId,
      );
      if (pageIndex >= 0) {
        const candidate = project.pages[pageIndex]!;
        if (!candidate.isEndPaper && !candidate.locked) {
          return { page: candidate, pageIndex };
        }
      }
    }

    if (selectedElementId) {
      const pageIndex = project.pages.findIndex((page) =>
        page.elements.some((element) => element.id === selectedElementId),
      );
      if (pageIndex >= 0) {
        const candidate = project.pages[pageIndex]!;
        if (!candidate.isEndPaper && !candidate.locked) {
          return { page: candidate, pageIndex };
        }
      }
    }

    const spreads = getSpreads(project.pages);
    const clampedSpreadIndex = Math.min(
      Math.max(spreadIndex, 0),
      Math.max(0, spreads.length - 1),
    );
    const spread = spreads[clampedSpreadIndex];
    const editableIndex =
      spread?.pageIndices.find((index) => {
        const candidate = project.pages[index];
        return candidate && !candidate.isEndPaper && !candidate.locked;
      }) ?? null;

    if (editableIndex === null) {
      return { page: null, pageIndex: -1 };
    }
    return {
      page: project.pages[editableIndex] ?? null,
      pageIndex: editableIndex,
    };
  }, [project.pages, selectedPageId, selectedElementId, spreadIndex]);
}

export function useCanUndo() {
  return useEditorStore(
    (state) =>
      state.history.past.length > 0 ||
      (state.history.pending !== null &&
        state.history.pending.project !== state.project),
  );
}

export function useCanRedo() {
  return useEditorStore((state) => state.history.future.length > 0);
}
