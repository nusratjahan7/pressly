"use client";

import { AlertCircle, Check, Loader2 } from "lucide-react";
import { useEditorStore } from "@/store";

export function SaveStatus() {
  const saveState = useEditorStore((state) => state.ui.saveState);
  const lastSavedAt = useEditorStore((state) => state.ui.lastSavedAt);

  if (saveState === "idle") return null;

  const savedTooltip = lastSavedAt
    ? `Autosaved to IndexedDB at ${new Date(lastSavedAt).toLocaleTimeString()}`
    : "Autosaved to IndexedDB";

  return (
    <div
      aria-live="polite"
      title={saveState === "saved" ? savedTooltip : undefined}
      className="hidden items-center gap-1.5 text-[10.5px] font-medium tracking-[0.01em] text-ink-subtle md:flex"
    >
      {saveState === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden="true" />
          Saving
        </>
      ) : saveState === "saved" ? (
        <>
          <Check className="size-3 text-accent" aria-hidden="true" />
          Saved
        </>
      ) : (
        <>
          <AlertCircle className="size-3 text-danger" aria-hidden="true" />
          <span className="text-danger">Not saved</span>
        </>
      )}
    </div>
  );
}
