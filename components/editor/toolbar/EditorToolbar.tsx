"use client";

import { Download, Eye, FolderOpen, HelpCircle, Redo2, Type, Undo2 } from "lucide-react";
import { useEditorStore } from "@/store";
import { useActivePage, useCanRedo, useCanUndo } from "@/store/selectors";
import { createTextElement } from "@/lib/elements";
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
  const canUndo = useCanUndo();
  const canRedo = useCanRedo();
  const undoLabel = useEditorStore(
    (state) =>
      state.history.pending?.label ??
      state.history.past[state.history.past.length - 1]?.label ??
      "",
  );
  const redoLabel = useEditorStore(
    (state) => state.history.future[0]?.label ?? "",
  );
  const setDashboardOpen = useEditorStore((state) => state.setDashboardOpen);
  const setShortcutsOpen = useEditorStore((state) => state.setShortcutsOpen);
  const setPreviewOpen = useEditorStore((state) => state.setPreviewOpen);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);
  const addElement = useEditorStore((state) => state.addElement);
  const project = useEditorStore((state) => state.project);
  const { page: activePage } = useActivePage();

  const mod = modKey();

  const handleAddText = () => {
    if (!activePage || activePage.isEndPaper || activePage.locked) return;
    const w = Math.min(120, project.pageSize.w * 0.65);
    addElement(
      activePage.id,
      createTextElement(
        {
          x: Math.round(((project.pageSize.w - w) / 2) * 10) / 10,
          y: Math.round(project.pageSize.h * 0.25 * 10) / 10,
          width: Math.round(w * 10) / 10,
          height: 16,
        },
        {
          text: "Double-click to edit",
          fontSize: 22,
          fontWeight: 600,
          align: "center",
          boxMode: "auto",
        },
      ),
    );
  };

  return (
    <header className="relative z-40 flex h-14 shrink-0 items-center gap-2 border-b border-line bg-surface px-2.5 sm:gap-3 sm:px-4">
      <div className="flex shrink-0 items-center gap-2">
        <PresslyMark />
        <span className="hidden text-[14px] font-semibold tracking-[-0.025em] text-ink md:inline">
          Pressly
        </span>
      </div>

      <Button
        variant="secondary"
        size="sm"
        className="h-8 gap-1.5 px-2 sm:px-2.5"
        leadingIcon={FolderOpen}
        onClick={() => setDashboardOpen(true)}
        aria-label="Open projects dashboard"
      >
        <span className="hidden sm:inline">Projects</span>
      </Button>

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
          tooltip={undoLabel ? `Undo ${undoLabel}` : "Undo"}
          shortcut={`${mod}Z`}
          size="sm"
          onClick={undo}
          disabled={!canUndo}
          tooltipSide="bottom"
        />
        <IconButton
          icon={Redo2}
          label="Redo"
          tooltip={redoLabel ? `Redo ${redoLabel}` : "Redo"}
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
        <Button
          variant="secondary"
          size="sm"
          className="h-8 gap-1 px-2 sm:px-2.5"
          leadingIcon={Type}
          onClick={handleAddText}
          disabled={!activePage || activePage.isEndPaper || activePage.locked}
          aria-label="Add text box"
        >
          <span className="hidden xl:inline">A+ Text</span>
        </Button>
        <IconButton
          icon={HelpCircle}
          label="Keyboard shortcuts"
          tooltip="Shortcuts & tour"
          shortcut="?"
          size="sm"
          onClick={() => setShortcutsOpen(true)}
          tooltipSide="bottom"
        />
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
          className="h-8 shrink-0 gap-1.5 whitespace-nowrap px-2.5 sm:px-3"
          leadingIcon={Download}
          data-tour="export"
          onClick={() => setExportOpen(true)}
          aria-label="Download PDF"
        >
          <span className="hidden sm:inline">Download PDF</span>
        </Button>
      </div>
    </header>
  );
}
