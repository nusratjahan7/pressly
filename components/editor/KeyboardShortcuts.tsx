"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store";

export function KeyboardShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented) return;

      const target = event.target as HTMLElement | null;
      if (
        target &&
        (target.isContentEditable ||
          ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName))
      ) {
        return;
      }

      const state = useEditorStore.getState();
      if (
        state.ui.previewOpen ||
        state.ui.exportOpen ||
        state.ui.pageSetupOpen ||
        document.querySelector('[role="dialog"][aria-modal="true"]')
      ) {
        return;
      }

      const mod = event.metaKey || event.ctrlKey;
      const key = event.key.toLowerCase();

      if (mod && key === "z") {
        event.preventDefault();
        if (event.shiftKey) state.redo();
        else state.undo();
        return;
      }
      if (mod && key === "y") {
        event.preventDefault();
        state.redo();
        return;
      }
      if (mod && (event.key === "=" || event.key === "+")) {
        event.preventDefault();
        state.zoomIn();
        return;
      }
      if (mod && event.key === "-") {
        event.preventDefault();
        state.zoomOut();
        return;
      }
      if (mod && event.key === "0") {
        event.preventDefault();
        state.resetZoom();
        return;
      }

      if (mod && key === "g") {
        const ids = state.selection.elementIds;
        if (ids.length >= 2) {
          event.preventDefault();
          if (event.shiftKey) state.ungroupElements(ids);
          else state.groupElements(ids);
        } else if (ids.length === 1 && event.shiftKey) {
          event.preventDefault();
          state.ungroupElements(ids);
        }
        return;
      }

      if (mod && key === "a") {
        const pageId = state.selection.pageId;
        const page = pageId
          ? state.project.pages.find((p) => p.id === pageId)
          : undefined;
        if (page && !page.isEndPaper && !page.locked) {
          const unlockedIds = page.elements
            .filter((el) => !el.locked)
            .map((el) => el.id);
          if (unlockedIds.length > 0) {
            event.preventDefault();
            state.selectElements(page.id, unlockedIds);
          }
        }
        return;
      }

      if (event.key === "PageDown") {
        event.preventDefault();
        state.nextSpread();
        return;
      }
      if (event.key === "PageUp") {
        event.preventDefault();
        state.prevSpread();
        return;
      }

      if (event.key === "Escape") {
        state.clearSelection();
        return;
      }

      if (event.key === "Delete" || event.key === "Backspace") {
        const ids =
          state.selection.elementIds.length > 0
            ? state.selection.elementIds
            : state.selection.elementId
              ? [state.selection.elementId]
              : [];
        if (ids.length === 0) return;
        event.preventDefault();
        state.removeElements(ids);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
