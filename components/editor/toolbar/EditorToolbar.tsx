"use client";

import { Download, Eye, Redo2, Undo2 } from "lucide-react";
import { useEditorStore } from "@/store";
import { PresslyMark } from "@/components/editor/PresslyMark";
import { ProjectNameField } from "@/components/editor/toolbar/ProjectNameField";
import { PageSizeMenu } from "@/components/editor/toolbar/PageSizeMenu";
import { ZoomControl } from "@/components/editor/toolbar/ZoomControl";
import { ThemeToggle } from "@/components/editor/toolbar/ThemeToggle";
import { SaveStatus } from "@/components/editor/toolbar/SaveStatus";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";

function modKey() {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

export function EditorToolbar() {
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const canUndo = useEditorStore((state) => state.history.past.length > 0);
  const canRedo = useEditorStore((state) => state.history.future.length > 0);
  const setPreviewOpen = useEditorStore((state) => state.setPreviewOpen);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);

  const mod = modKey();

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2.5 sm:gap-3 sm:px-4">
      <div className="flex shrink-0 items-center gap-2">
        <PresslyMark />
        <span className="hidden text-[14px] font-semibold tracking-[-0.025em] text-ink md:inline">
          Pressly
        </span>
      </div>

      <span
        aria-hidden="true"
        className="hidden h-5 w-px shrink-0 bg-line sm:block"
      />

      <ProjectNameField />
      <SaveStatus />

      <div className="flex shrink-0 items-center">
        <IconButton
          icon={Undo2}
          label="Undo"
          tooltip="Undo"
          shortcut={`${mod}Z`}
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          tooltipSide="bottom"
        />
        <IconButton
          icon={Redo2}
          label="Redo"
          tooltip="Redo"
          shortcut={`${mod}⇧Z`}
          size="sm"
          onClick={redo}
          disabled={!canRedo}
          tooltipSide="bottom"
        />
      </div>

      <span
        aria-hidden="true"
        className="hidden h-5 w-px shrink-0 bg-line lg:block"
      />

      <div className="hidden lg:block">
        <PageSizeMenu />
      </div>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        <div className="hidden md:block">
          <ZoomControl />
        </div>
        <ThemeToggle />
        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1.5 px-2 sm:px-2.5"
          leadingIcon={Eye}
          onClick={() => setPreviewOpen(true)}
          aria-label="Preview spreads"
        >
          <span className="hidden lg:inline">Preview</span>
        </Button>
        <Button
          variant="primary"
          size="sm"
          className="h-8 gap-1.5 px-2.5 sm:px-3"
          leadingIcon={Download}
          onClick={() => setExportOpen(true)}
          aria-label="Download PDF"
        >
          <span className="hidden sm:inline">Download PDF</span>
        </Button>
      </div>
    </header>
  );
}
