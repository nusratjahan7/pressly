"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  AlertTriangle,
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Download,
  FileText,
  Frame,
  Image as ImageIcon,
  Loader2,
  Printer,
  Scissors,
  Sparkles,
  Type,
} from "lucide-react";
import { useEditorStore } from "@/store";
import { formatNumber } from "@/lib/units";
import {
  getEditablePageCount,
  getSpreadIndexForPage,
  getSpreads,
} from "@/lib/spreads";
import { slugify, cn } from "@/lib/cn";
import {
  createProjectPdf,
  type PdfExportProgress,
  type PdfLayoutMode,
  type PdfPreset,
} from "@/lib/pdf/exportProject";
import {
  buildPdfExportPlan,
  estimatePdfFileSizeBytes,
  formatFileSize,
} from "@/lib/pdf/plan";
import {
  runPdfPreflight,
  type PreflightIssue,
  type PreflightIssueKind,
  type PreflightReport,
} from "@/lib/pdf/preflight";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";

const ISSUE_ICON: Record<PreflightIssueKind, typeof AlertTriangle> = {
  "low-resolution": ImageIcon,
  "empty-frame": Frame,
  "safe-margin": Scissors,
  "missing-font": Type,
};

export function ExportDialog() {
  const open = useEditorStore((state) => state.ui.exportOpen);
  const setExportOpen = useEditorStore((state) => state.setExportOpen);
  const goToSpread = useEditorStore((state) => state.goToSpread);
  const selectElement = useEditorStore((state) => state.selectElement);
  const project = useEditorStore((state) => state.project);

  const [preset, setPreset] = useState<PdfPreset>("print");
  const [layoutMode, setLayoutMode] = useState<PdfLayoutMode>("single");
  const [includeBleed, setIncludeBleed] = useState(true);
  const [cropMarks, setCropMarks] = useState(true);
  const [quality, setQuality] = useState(92);
  const [rangeMode, setRangeMode] = useState<"all" | "custom">("all");
  const [pageRangeInput, setPageRangeInput] = useState("");

  const [preflight, setPreflight] = useState<PreflightReport | null>(null);
  const [preflightLoading, setPreflightLoading] = useState(false);

  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<PdfExportProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  const spreads = getSpreads(project.pages);
  const editablePageCount = getEditablePageCount(project.pages);
  const hasBleed = project.pageSize.bleed > 0;
  const targetDpi = preset === "print" ? 300 : 150;

  useEffect(() => {
    if (!open) {
      abortRef.current?.abort();
      abortRef.current = null;
      return;
    }
    setPreset("print");
    setLayoutMode("single");
    setIncludeBleed(project.pageSize.bleed > 0);
    setCropMarks(project.pageSize.bleed > 0);
    setQuality(92);
    setRangeMode("all");
    setPageRangeInput("");
    setProgress(null);
    setBusy(false);
    setError(null);
  }, [open, project.pageSize.bleed]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setPreflightLoading(true);
    void runPdfPreflight(project, { targetDpi }).then((report) => {
      if (!cancelled) {
        setPreflight(report);
        setPreflightLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [open, project, targetDpi]);

  const exportOptions = useMemo(
    () => ({
      preset,
      layoutMode,
      dpi: targetDpi,
      includeBleed: preset === "print" && includeBleed && hasBleed,
      cropMarks: preset === "print" && includeBleed && hasBleed && cropMarks,
      quality,
      pageRange: rangeMode === "custom" ? pageRangeInput : "",
    }),
    [
      preset,
      layoutMode,
      targetDpi,
      includeBleed,
      hasBleed,
      cropMarks,
      quality,
      rangeMode,
      pageRangeInput,
    ],
  );

  const plan = useMemo(
    () => buildPdfExportPlan(project, exportOptions),
    [project, exportOptions],
  );

  const estimatedBytes = useMemo(
    () => estimatePdfFileSizeBytes(project, exportOptions),
    [project, exportOptions],
  );

  const handleSelectPreset = (next: PdfPreset) => {
    setPreset(next);
    if (next === "print") {
      setIncludeBleed(hasBleed);
      setQuality(92);
    } else {
      setIncludeBleed(false);
      setCropMarks(false);
      setQuality(82);
    }
  };

  const handleJumpToIssue = (issue: PreflightIssue) => {
    const spreadIdx = getSpreadIndexForPage(issue.pageIndex);
    goToSpread(spreadIdx);
    selectElement(issue.pageId, issue.elementId);
    setExportOpen(false);
  };

  const handleCancelExport = () => {
    abortRef.current?.abort();
  };

  const handleExport = async () => {
    if (plan.rangeError || plan.selectedSheets.length === 0) return;

    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setError(null);
    setProgress({
      phase: "preparing",
      percent: 2,
      currentSheet: 0,
      totalSheets: plan.selectedSheets.length,
      label: "Starting export…",
    });

    try {
      const bytes = await createProjectPdf(project, exportOptions, {
        onProgress: setProgress,
        signal: controller.signal,
      });

      const blob = new Blob([bytes as unknown as BlobPart], {
        type: "application/pdf",
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${slugify(project.name) || "pressly"}-${preset}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 2500);
      setExportOpen(false);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") {
        setError("Export cancelled.");
      } else {
        setError(
          "The PDF could not be generated. Check your images or fonts and try again.",
        );
      }
    } finally {
      abortRef.current = null;
      setBusy(false);
      setProgress(null);
    }
  };

  const issueCount = preflight?.issues.length ?? 0;

  return (
    <Modal
      open={open}
      onClose={() => {
        if (busy) handleCancelExport();
        else setExportOpen(false);
      }}
      dismissible={!busy}
      title={busy ? "Generating PDF…" : "Export PDF"}
      description={
        busy
          ? "Rendering pages off-screen without blocking your workspace."
          : "Configure print or digital output specs, run pre-flight checks, and download."
      }
      size="lg"
      footer={
        busy ? (
          <Button variant="secondary" size="sm" onClick={handleCancelExport}>
            Cancel export
          </Button>
        ) : (
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setExportOpen(false)}
            >
              Close
            </Button>
            <Button
              variant="primary"
              size="sm"
              leadingIcon={Download}
              disabled={Boolean(plan.rangeError) || plan.selectedSheets.length === 0}
              onClick={() => void handleExport()}
            >
              Export {plan.selectedSheets.length}{" "}
              {layoutMode === "spreads"
                ? plan.selectedSheets.length === 1
                  ? "spread"
                  : "spreads"
                : plan.selectedSheets.length === 1
                  ? "page"
                  : "pages"}{" "}
              ({formatFileSize(estimatedBytes)})
            </Button>
          </>
        )
      }
    >
      {busy ? (
        <div className="flex flex-col gap-4 py-4">
          <div className="flex items-center justify-between gap-2 text-[12px]">
            <span className="flex items-center gap-2 font-medium text-ink">
              <Loader2 className="size-4 animate-spin text-accent" />
              {progress?.label ?? "Preparing PDF…"}
            </span>
            <span className="tabular-nums font-semibold text-accent">
              {progress?.percent ?? 0}%
            </span>
          </div>

          <div className="h-2.5 w-full overflow-hidden rounded-full bg-surface-muted">
            <div
              className="h-full rounded-full bg-accent transition-[width] duration-200"
              style={{ width: `${Math.max(4, progress?.percent ?? 0)}%` }}
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 rounded-field border border-line bg-surface-muted/50 px-3 py-2 text-[10.5px] text-ink-muted">
            <span>
              {preset === "print" ? "Print-ready (300 DPI)" : "Digital (150 DPI)"} ·{" "}
              {layoutMode === "spreads" ? "Spreads" : "Single pages"} · {quality}%
              quality
            </span>
            <span>
              Sheet {progress?.currentSheet ?? 0} /{" "}
              {progress?.totalSheets ?? plan.selectedSheets.length}
            </span>
          </div>
        </div>
      ) : (
        <div className="flex max-h-[68dvh] flex-col gap-4 overflow-y-auto pr-0.5">
          {/* Document summary header */}
          <div className="flex items-center justify-between gap-3 rounded-ui border border-line bg-surface-muted/60 px-3 py-2.5">
            <div className="flex min-w-0 items-center gap-2.5">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-field bg-surface shadow-sm">
                <FileText className="size-4 text-accent" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-[12.5px] font-semibold text-ink">
                  {project.name}
                </p>
                <p className="text-[10.5px] text-ink-muted">
                  {editablePageCount} pages + cover ·{" "}
                  {formatNumber(project.pageSize.w, 1)} ×{" "}
                  {formatNumber(project.pageSize.h, 1)} mm ·{" "}
                  {plan.spineWidthMm > 0
                    ? `${plan.spineWidthMm} mm spine`
                    : "No spine (saddle stitch)"}
                </p>
              </div>
            </div>
            <div className="shrink-0 text-right">
              <p className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                Est. size
              </p>
              <p className="text-[13px] font-semibold tabular-nums text-ink">
                {formatFileSize(estimatedBytes)}
              </p>
            </div>
          </div>

          {/* Output preset */}
          <div className="flex flex-col gap-1.5">
            <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              Output preset
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleSelectPreset("print")}
                className={cn(
                  "flex items-start gap-2.5 rounded-card border p-2.5 text-left transition-colors",
                  preset === "print"
                    ? "border-accent bg-accent-soft/45"
                    : "border-line hover:border-line-strong",
                )}
              >
                <Printer
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    preset === "print" ? "text-accent" : "text-ink-muted",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-ink">
                    Print-ready
                  </p>
                  <p className="text-[10px] text-ink-muted">
                    300 DPI · bleed + crop marks
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleSelectPreset("digital")}
                className={cn(
                  "flex items-start gap-2.5 rounded-card border p-2.5 text-left transition-colors",
                  preset === "digital"
                    ? "border-accent bg-accent-soft/45"
                    : "border-line hover:border-line-strong",
                )}
              >
                <Sparkles
                  className={cn(
                    "mt-0.5 size-4 shrink-0",
                    preset === "digital" ? "text-accent" : "text-ink-muted",
                  )}
                />
                <div className="min-w-0">
                  <p className="text-[11.5px] font-semibold text-ink">
                    Digital
                  </p>
                  <p className="text-[10px] text-ink-muted">
                    150 DPI · no bleed · compact
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Pagination & Page range */}
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                Page layout
              </span>
              <div className="grid grid-cols-2 rounded-field border border-line bg-surface-muted p-0.5 text-[11px] font-medium">
                <button
                  type="button"
                  onClick={() => setLayoutMode("single")}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1 rounded-[5px] transition-colors",
                    layoutMode === "single"
                      ? "bg-surface text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  <FileText className="size-3" />
                  Single pages
                </button>
                <button
                  type="button"
                  onClick={() => setLayoutMode("spreads")}
                  className={cn(
                    "flex h-7 items-center justify-center gap-1 rounded-[5px] transition-colors",
                    layoutMode === "spreads"
                      ? "bg-surface text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  <BookOpen className="size-3" />
                  Spreads
                </button>
              </div>
              <p className="text-[10px] leading-3.5 text-ink-subtle">
                {layoutMode === "single"
                  ? plan.spineWidthMm > 0
                    ? `Front cover → Spine (${plan.spineWidthMm} mm) → Pages 1–${editablePageCount} → Back cover.`
                    : `Front cover → Pages 1–${editablePageCount} → Back cover.`
                  : plan.spineWidthMm > 0
                    ? `Wrap cover (${plan.spineWidthMm} mm spine) + ${spreads.length - 1} interior spreads.`
                    : `Wrap cover + ${spreads.length - 1} interior spreads.`}
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                Page range (1–{plan.allSheets.length})
              </span>
              <div className="flex items-center gap-1.5">
                <div className="grid shrink-0 grid-cols-2 rounded-field border border-line bg-surface-muted p-0.5 text-[11px] font-medium">
                  <button
                    type="button"
                    onClick={() => setRangeMode("all")}
                    className={cn(
                      "h-7 rounded-[5px] px-2.5 transition-colors",
                      rangeMode === "all"
                        ? "bg-surface text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    All
                  </button>
                  <button
                    type="button"
                    onClick={() => setRangeMode("custom")}
                    className={cn(
                      "h-7 rounded-[5px] px-2.5 transition-colors",
                      rangeMode === "custom"
                        ? "bg-surface text-ink shadow-sm"
                        : "text-ink-muted hover:text-ink",
                    )}
                  >
                    Custom
                  </button>
                </div>
                {rangeMode === "custom" ? (
                  <input
                    type="text"
                    value={pageRangeInput}
                    onChange={(e) => setPageRangeInput(e.target.value)}
                    placeholder="e.g. 1-4, 6"
                    aria-label="Custom page range"
                    className="h-8 min-w-0 flex-1 rounded-field border border-line bg-surface px-2.5 text-[11.5px] text-ink outline-none focus:border-accent"
                  />
                ) : (
                  <span className="truncate text-[10.5px] text-ink-muted">
                    All {plan.allSheets.length} sheets
                  </span>
                )}
              </div>
              {plan.rangeError ? (
                <p className="text-[10px] font-medium text-danger">
                  {plan.rangeError}
                </p>
              ) : (
                <p className="truncate text-[10px] text-ink-subtle">
                  {plan.selectedSheets.map((s) => `${s.sheetNumber}. ${s.label}`).join(" · ")}
                </p>
              )}
            </div>
          </div>

          {/* Bleed, Crop marks & Quality slider */}
          <div className="grid grid-cols-1 gap-3 rounded-card border border-line p-3 sm:grid-cols-2">
            <div className="flex flex-col gap-2.5">
              <Toggle
                label="Include bleed"
                description={
                  preset === "digital"
                    ? "Disabled in Digital 150 DPI preset."
                    : hasBleed
                      ? `Adds ${formatNumber(project.pageSize.bleed, 1)} mm on trim edges.`
                      : "Document bleed is 0 mm."
                }
                checked={preset === "print" && includeBleed && hasBleed}
                onCheckedChange={setIncludeBleed}
                disabled={preset === "digital" || !hasBleed}
              />
              <Toggle
                label="Crop & spine fold marks"
                description="Adds corner trim hairlines & fold guides."
                checked={
                  preset === "print" && includeBleed && hasBleed && cropMarks
                }
                onCheckedChange={setCropMarks}
                disabled={
                  preset === "digital" || !hasBleed || !includeBleed
                }
              />
            </div>

            <div className="flex flex-col justify-center gap-2 border-t border-line pt-2.5 sm:border-l sm:border-t-0 sm:pl-3 sm:pt-0">
              <Slider
                label="Image quality"
                value={quality}
                min={50}
                max={100}
                step={2}
                formatValue={(v) => `${v}%`}
                onValueChange={setQuality}
              />
              <p className="text-[10px] leading-3.5 text-ink-subtle">
                Vectors (shapes, QR codes) and subsetted fonts stay sharp at any
                quality setting.
              </p>
            </div>
          </div>

          {/* Pre-flight check panel */}
          <div className="flex flex-col gap-2 rounded-card border border-line bg-surface-muted/40 p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                {preflightLoading ? (
                  <Loader2 className="size-3.5 animate-spin text-accent" />
                ) : issueCount === 0 ? (
                  <CheckCircle2 className="size-3.5 text-accent" />
                ) : (
                  <AlertTriangle className="size-3.5 text-amber-500" />
                )}
                <span className="text-[11px] font-semibold text-ink">
                  Pre-flight check
                </span>
              </div>
              <span className="text-[10.5px] font-medium text-ink-muted">
                {preflightLoading
                  ? "Scanning pages…"
                  : issueCount === 0
                    ? "No print issues detected"
                    : `${issueCount} ${issueCount === 1 ? "issue" : "issues"} found`}
              </span>
            </div>

            {preflight && issueCount > 0 ? (
              <div className="flex max-h-40 flex-col gap-1.5 overflow-y-auto pr-1">
                {preflight.issues.map((issue) => {
                  const Icon = ISSUE_ICON[issue.kind];
                  return (
                    <div
                      key={issue.id}
                      className="flex items-center justify-between gap-2 rounded-field border border-line bg-surface px-2.5 py-2"
                    >
                      <div className="flex min-w-0 items-start gap-2">
                        <Icon
                          className={cn(
                            "mt-0.5 size-3.5 shrink-0",
                            issue.severity === "error"
                              ? "text-danger"
                              : "text-amber-500",
                          )}
                        />
                        <div className="min-w-0">
                          <p className="truncate text-[11px] font-semibold text-ink">
                            {issue.title}
                          </p>
                          <p className="text-[10px] leading-3.5 text-ink-muted">
                            {issue.detail}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleJumpToIssue(issue)}
                        className="inline-flex shrink-0 items-center gap-1 rounded-field border border-line bg-surface-muted px-2 py-1 text-[10px] font-medium text-ink hover:border-accent hover:text-accent"
                      >
                        Jump to issue
                        <ArrowUpRight className="size-3" />
                      </button>
                    </div>
                  );
                })}
              </div>
            ) : null}
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
        </div>
      )}
    </Modal>
  );
}
