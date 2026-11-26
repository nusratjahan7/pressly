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
        const selectedId = state.selection.elementId;
        if (!selectedId) return;
        const element = state.project.pages
          .flatMap((page) => page.elements)
          .find((candidate) => candidate.id === selectedId);
        if (!element || element.locked) return;
        event.preventDefault();
        state.removeElement(selectedId);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return null;
}
