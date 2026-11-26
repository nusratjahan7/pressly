"use client";

import { useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEditorStore } from "@/store";
import { useCurrentSpread } from "@/store/selectors";
import { useElementSize } from "@/lib/useElementSize";
import { getSpreadLabel } from "@/lib/spreads";
import { SpreadView } from "@/components/editor/canvas/SpreadView";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

export function PreviewDialog() {
  const open = useEditorStore((state) => state.ui.previewOpen);
  const setPreviewOpen = useEditorStore((state) => state.setPreviewOpen);
  const project = useEditorStore((state) => state.project);
  const { spread, spreads, spreadIndex } = useCurrentSpread();
  const prevSpread = useEditorStore((state) => state.prevSpread);
  const nextSpread = useEditorStore((state) => state.nextSpread);
  const { ref, size } = useElementSize<HTMLDivElement>();

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
          label: String(pageIndex + 1),
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item)) ?? [];

  const spreadLabel = spread
    ? getSpreadLabel(spread, project.pages)
    : "Preview";

  const scale =
    size.width > 0 && size.height > 0
      ? Math.min(
          (size.width - 80) / (project.pageSize.w * Math.max(1, items.length)),
          (size.height - 72) / project.pageSize.h,
        )
      : 0;

  return (
    <Modal
      open={open}
      onClose={() => setPreviewOpen(false)}
      title="Live preview"
      description={`${spreadLabel} · ${spreads.length} spreads`}
      variant="full"
      size="full"
      bodyClassName="flex min-h-0 flex-1 flex-col"
      footer={
        <div className="flex w-full items-center justify-between gap-3">
          <div className="text-[11px] font-medium text-ink-muted">
            {spreadLabel}
            <span className="ml-2 text-ink-subtle">
              {spreadIndex + 1} / {spreads.length}
            </span>
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
        {items.length > 0 && scale > 0 ? (
          <div className="relative">
            <SpreadView
              items={items}
              pageSize={project.pageSize}
              scale={scale}
              variant="preview"
              showLabels={false}
              className="animate-fade-up"
            />
          </div>
        ) : (
          <p className="relative text-[12px] text-white/60">
            Nothing to preview yet.
          </p>
        )}
        <p className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-[10px] font-medium uppercase tracking-[0.18em] text-white/40">
          {project.pageSize.w} × {project.pageSize.h} mm · use ← → to navigate
        </p>
      </div>
    </Modal>
  );
}
