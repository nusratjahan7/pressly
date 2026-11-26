"use client";

import { useEffect, useState } from "react";
import { BookOpen, Box, ChevronLeft, ChevronRight } from "lucide-react";
import { useEditorStore } from "@/store";
import { useCurrentSpread } from "@/store/selectors";
import { useElementSize } from "@/lib/useElementSize";
import {
  getEditablePageCount,
  getPageLabel,
  getSpreadLabel,
} from "@/lib/spreads";
import { getCoverDisplaySpineWidth } from "@/lib/binding";
import { SpreadView } from "@/components/editor/canvas/SpreadView";
import { Book3DPreview } from "@/components/editor/Book3DPreview";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type PreviewMode = "2d" | "3d";

export function PreviewDialog() {
  const open = useEditorStore((state) => state.ui.previewOpen);
  const setPreviewOpen = useEditorStore((state) => state.setPreviewOpen);
  const project = useEditorStore((state) => state.project);
  const { spread, spreads, spreadIndex } = useCurrentSpread();
  const prevSpread = useEditorStore((state) => state.prevSpread);
  const nextSpread = useEditorStore((state) => state.nextSpread);
  const { ref, size } = useElementSize<HTMLDivElement>();
  const [mode, setMode] = useState<PreviewMode>("2d");

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft" || event.key === "PageUp") {
        event.preventDefault();
        prevSpread();
      } else if (event.key === "ArrowRight" || event.key === "PageDown") {
        event.preventDefault();
        nextSpread();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, prevSpread, nextSpread]);

  const items =
    spread?.pageIndices
      .map((pageIndex) => {
        const page = project.pages[pageIndex];
        if (!page) return null;
        return {
          page,
          pageIndex,
          label: getPageLabel(pageIndex, project.pages),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)) ?? [];

  const isCover = Boolean(spread?.isCover);
  const spineWidth = isCover
    ? getCoverDisplaySpineWidth(
        project.pageSize.binding,
        getEditablePageCount(project.pages),
      )
    : 0;

  const spreadLabel = spread
    ? getSpreadLabel(spread, project.pages)
    : "Preview";

  const displayPageSlots = isCover
    ? Math.max(1, items.length)
    : Math.max(2, items.length);

  const scale =
    size.width > 0 && size.height > 0
      ? Math.min(
          (size.width - 80) /
            (project.pageSize.w * displayPageSlots + spineWidth),
          (size.height - 72) / project.pageSize.h,
        )
      : 0;

  return (
    <Modal
      open={open}
      onClose={() => setPreviewOpen(false)}
      title="Live preview"
      description={`${spreadLabel} · Spread ${spreadIndex + 1} of ${spreads.length}`}
      variant="full"
      size="full"
      bodyClassName="flex min-h-0 flex-1 flex-col"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="text-[11px] font-medium text-ink-muted">
              {spreadLabel}
              <span className="ml-2 text-ink-subtle">
                Spread {spreadIndex + 1} of {spreads.length}
              </span>
            </div>
            <div
              role="group"
              aria-label="Preview mode"
              className="inline-flex h-7 items-center gap-0.5 rounded-field border border-line bg-surface-muted/60 p-0.5"
            >
              <button
                type="button"
                aria-pressed={mode === "2d"}
                onClick={() => setMode("2d")}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-[6px] px-2 text-[10.5px] font-medium transition-colors",
                  mode === "2d"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-subtle hover:text-ink-muted",
                )}
              >
                <BookOpen className="size-3" aria-hidden="true" />
                2D Spread
              </button>
              <button
                type="button"
                aria-pressed={mode === "3d"}
                onClick={() => setMode("3d")}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded-[6px] px-2 text-[10.5px] font-medium transition-colors",
                  mode === "3d"
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-subtle hover:text-ink-muted",
                )}
              >
                <Box className="size-3" aria-hidden="true" />
                3D Book
              </button>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leadingIcon={ChevronLeft}
              onClick={prevSpread}
              disabled={spreadIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="secondary"
              size="sm"
              trailingIcon={ChevronRight}
              onClick={nextSpread}
              disabled={spreadIndex === spreads.length - 1}
            >
              Next
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setPreviewOpen(false)}
            >
              Done
            </Button>
          </div>
        </div>
      }
    >
      <div
        ref={ref}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden bg-[#0d0d0c] p-6 sm:p-10"
      >
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.35]"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, rgba(255,255,255,0.16) 1px, transparent 1.4px)",
            backgroundSize: "28px 28px",
          }}
          aria-hidden="true"
        />
        {mode === "3d" && spread ? (
          <Book3DPreview
            project={project}
            spread={spread}
            spreads={spreads}
            spreadIndex={spreadIndex}
            containerWidth={size.width}
            containerHeight={size.height}
            onPrevSpread={prevSpread}
            onNextSpread={nextSpread}
          />
        ) : items.length > 0 && scale > 0 ? (
          <div className="relative">
            <SpreadView
              items={items}
              pageSize={project.pageSize}
              scale={scale}
              variant="preview"
              isCover={isCover}
              spineWidth={spineWidth}
              spineText={project.spineText ?? project.name}
              showLabels={isCover}
              className="animate-fade-up"
            />
          </div>
        ) : (
          <p className="relative text-[12px] text-white/60">
            Nothing to preview yet.
          </p>
        )}
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
          {project.pageSize.w} × {project.pageSize.h} mm ·{" "}
          {mode === "3d"
            ? "drag to rotate · use ← → to flip"
            : "use ← → to navigate"}
        </p>
      </div>
    </Modal>
  );
}
