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
  const spreadIndex = useEditorStore((state) => state.ui.spreadIndex);
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

  return useMemo(() => {
    if (!elementId) return null;
    for (let pageIndex = 0; pageIndex < project.pages.length; pageIndex += 1) {
      const page = project.pages[pageIndex]!;
      const element = page.elements.find((candidate) => candidate.id === elementId);
      if (element) return { element, page, pageIndex };
    }
    return null;
  }, [project.pages, elementId]);
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
        return { page: project.pages[pageIndex]!, pageIndex };
      }
    }

    if (selectedElementId) {
      const pageIndex = project.pages.findIndex((page) =>
        page.elements.some((element) => element.id === selectedElementId),
      );
      if (pageIndex >= 0) {
        return { page: project.pages[pageIndex]!, pageIndex };
      }
    }

    const spread = getSpreads(project.pages)[spreadIndex];
    const pageIndex = spread?.pageIndices[0] ?? 0;
    return {
      page: project.pages[pageIndex] ?? null,
      pageIndex,
    };
  }, [project.pages, selectedPageId, selectedElementId, spreadIndex]);
}

export function useCanUndo() {
  return useEditorStore((state) => state.history.past.length > 0);
}

export function useCanRedo() {
  return useEditorStore((state) => state.history.future.length > 0);
}
