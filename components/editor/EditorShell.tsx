"use client";

import { useEffect } from "react";
import { useEditorStore } from "@/store";
import { useProjectPersistence } from "@/store/persistence";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { EditorToolbar } from "@/components/editor/toolbar/EditorToolbar";
import { SidebarRail } from "@/components/editor/sidebar/SidebarRail";
import { SidebarPanel } from "@/components/editor/sidebar/SidebarPanel";
import { CanvasWorkspace } from "@/components/editor/canvas/CanvasWorkspace";
import { PropertiesPanel } from "@/components/editor/properties/PropertiesPanel";
import { ThumbnailStrip } from "@/components/editor/thumbnails/ThumbnailStrip";
import { PreviewDialog } from "@/components/editor/PreviewDialog";
import { ExportDialog } from "@/components/editor/ExportDialog";
import { PageSetupDialog } from "@/components/editor/setup/PageSetupDialog";
import { ToastViewport } from "@/components/ui/toast";
import { KeyboardShortcuts } from "@/components/editor/KeyboardShortcuts";
import { EditorSkeleton } from "@/components/editor/EditorSkeleton";

export function EditorShell() {
  useProjectPersistence();
  const hydrated = useEditorStore((state) => state.ui.hydrated);
  const pageSetupOpen = useEditorStore((state) => state.ui.pageSetupOpen);
  const pageSetupMode = useEditorStore((state) => state.ui.pageSetupMode);
  const closePageSetup = useEditorStore((state) => state.closePageSetup);
  const setSidebarOpen = useEditorStore((state) => state.setSidebarOpen);
  const isTablet = useMediaQuery("(max-width: 1023px)");

  useEffect(() => {
    if (isTablet) setSidebarOpen(false);
  }, [isTablet, setSidebarOpen]);

  if (!hydrated) return <EditorSkeleton />;

  return (
    <>
      <div className="flex h-dvh flex-col overflow-hidden bg-canvas text-ink">
        <EditorToolbar />
        <div className="flex min-h-0 flex-1">
          <SidebarRail />
          <SidebarPanel />
          <main className="relative flex min-w-0 flex-1 flex-row overflow-hidden">
            <CanvasWorkspace />
            <PropertiesPanel />
          </main>
        </div>
        <ThumbnailStrip />
      </div>
      <PreviewDialog />
      <ExportDialog />
      <PageSetupDialog
        open={pageSetupOpen}
        mode={pageSetupMode}
        onClose={closePageSetup}
      />
      <KeyboardShortcuts />
      <ToastViewport />
    </>
  );
}
