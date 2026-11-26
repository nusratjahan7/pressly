"use client";

import { useEffect, useState } from "react";
import { AlertCircle, Download, FileText } from "lucide-react";
import { useEditorStore } from "@/store";
import { formatNumber } from "@/lib/units";
import { getSpreads } from "@/lib/spreads";
import { slugify } from "@/lib/cn";
import { createProjectPdf } from "@/lib/pdf/exportProject";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";

export function ExportDialog() {
  const open = useEditorStore((state) => state.ui.exportOpen);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);
  const project = useEditorStore((state) => state.project);
  const [includeBleed, setIncludeBleed] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const spreads = getSpreads(project.pages);
  const hasBleed = project.pageSize.bleed > 0;

  useEffect(() => {
    if (!open) return;
    setIncludeBleed(project.pageSize.bleed > 0);
    setError(null);
  }, [open, project.pageSize.bleed]);

  const handleExport = async () => {
    setBusy(true);
    setError(null);
    try {
      const bytes = await createProjectPdf(project, {
        includeBleed: includeBleed && hasBleed,
      });
      const blob = new Blob([bytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(project.name)}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2000);
      setExportOpen(false);
    } catch {
      setError(
        "The PDF could not be generated. Check your images and try again.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={() => setExportOpen(false)}
      title="Export print-ready PDF"
      description="True trim size, optional bleed, and embedded imagery."
      size="md"
      footer={
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setExportOpen(false)}
            disabled={busy}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            leadingIcon={Download}
            loading={busy}
            onClick={() => void handleExport()}
          >
            {busy ? "Preparing PDF…" : "Download PDF"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-4">
        <div className="flex items-start gap-3 rounded-ui border border-line bg-surface-muted/60 p-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-field bg-surface shadow-sm">
            <FileText className="size-4 text-accent" aria-hidden="true" />
          </span>
          <div className="flex min-w-0 flex-col gap-0.5">
            <p className="truncate text-[12.5px] font-semibold text-ink">
              {project.name}
            </p>
            <p className="text-[10.5px] text-ink-muted">
              {project.pages.length} pages · {spreads.length} spreads
            </p>
          </div>
        </div>

        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[11px]">
          <div className="flex items-center justify-between border-b border-line pb-2">
            <dt className="text-ink-muted">Page size</dt>
            <dd className="font-medium tabular-nums text-ink">
              {formatNumber(project.pageSize.w, 1)} ×{" "}
              {formatNumber(project.pageSize.h, 1)} mm
            </dd>
          </div>
          <div className="flex items-center justify-between border-b border-line pb-2">
            <dt className="text-ink-muted">Bleed</dt>
            <dd className="font-medium tabular-nums text-ink">
              {formatNumber(project.pageSize.bleed, 1)} mm
            </dd>
          </div>
          <div className="flex items-center justify-between border-b border-line pb-2">
            <dt className="text-ink-muted">Colour</dt>
            <dd className="font-medium text-ink">RGB</dd>
          </div>
          <div className="flex items-center justify-between border-b border-line pb-2">
            <dt className="text-ink-muted">Images</dt>
            <dd className="font-medium text-ink">300 DPI</dd>
          </div>
        </dl>

        <div className="rounded-field border border-line p-3">
          <Toggle
            label="Include bleed"
            description={
              hasBleed
                ? `Adds ${formatNumber(project.pageSize.bleed, 1)} mm on every edge for trimming.`
                : "This document has no bleed defined."
            }
            checked={includeBleed && hasBleed}
            onCheckedChange={setIncludeBleed}
            disabled={!hasBleed || busy}
          />
        </div>

        {error ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2 text-[11px] leading-4 text-danger"
          >
            <AlertCircle
              className="mt-0.5 size-3.5 shrink-0"
              aria-hidden="true"
            />
            <span>{error}</span>
          </div>
        ) : null}

        <p className="text-[10px] leading-4 text-ink-subtle">
          Pages export in reading order. Backgrounds, text, shapes, images, and
          stickers are included in the PDF.
        </p>
      </div>
    </Modal>
  );
}
