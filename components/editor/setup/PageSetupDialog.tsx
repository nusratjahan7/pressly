"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AlertTriangle, Check, Plus, RefreshCw, Ruler } from "lucide-react";
import type { BindingType, PageSize } from "@/types";
import { useEditorStore } from "@/store";
import {
  DEFAULT_BLEED_MM,
  DEFAULT_SAFE_MARGIN_MM,
  previewPageSizeChange,
} from "@/store/slices/projectSlice";
import { getBinding, getSpineWidth } from "@/lib/binding";
import { getEditablePageCount } from "@/lib/spreads";
import { formatNumber, PAGE_SIZE_PRESETS, round } from "@/lib/units";
import {
  analyzePrintResolution,
  MIN_PRINT_DPI,
  type ResolutionReport,
} from "@/lib/printQuality";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import {
  BindingField,
  DimensionSummary,
  fromMm,
  OrientationField,
  SetupRow,
  toMm,
  UnitInput,
  UnitToggle,
  getOrientation,
  type DisplayUnit,
} from "@/components/editor/setup/setup-fields";
import { cn } from "@/lib/cn";

type Mode = "setup" | "new";

interface PageSetupDialogProps {
  open: boolean;
  mode: Mode;
  onClose: () => void;
}

interface Draft {
  wMm: number;
  hMm: number;
  bleedMm: number;
  safeMarginMm: number;
  binding: BindingType;
  presetId: string | null;
}

const MM_MIN = 20;
const MM_MAX = 1000;
const BLEED_MAX = 25;
const MARGIN_MAX = 50;

function draftFromPageSize(pageSize: PageSize): Draft {
  const preset = PAGE_SIZE_PRESETS.find(
    (option) =>
      (Math.abs(option.w - pageSize.w) < 0.1 &&
        Math.abs(option.h - pageSize.h) < 0.1) ||
      (Math.abs(option.w - pageSize.h) < 0.1 &&
        Math.abs(option.h - pageSize.w) < 0.1),
  );
  return {
    wMm: pageSize.w,
    hMm: pageSize.h,
    bleedMm: pageSize.bleed,
    safeMarginMm: pageSize.safeMargin,
    binding: pageSize.binding,
    presetId: preset?.id ?? null,
  };
}

export function PageSetupDialog({ open, mode, onClose }: PageSetupDialogProps) {
  const project = useEditorStore((state) => state.project);
  const setPageSize = useEditorStore((state) => state.setPageSize);
  const setPageSetup = useEditorStore((state) => state.setPageSetup);
  const createProject = useEditorStore((state) => state.createProject);

  const [unit, setUnit] = useState<DisplayUnit>("mm");
  const [draft, setDraft] = useState<Draft>(() =>
    draftFromPageSize(project.pageSize),
  );
  const [name, setName] = useState(project.name);
  const [spreads, setSpreads] = useState(4);
  const [projectName, setProjectName] = useState(project.name);
  const [report, setReport] = useState<ResolutionReport | null>(null);
  const [confirming, setConfirming] = useState(false);
  const openedFor = useRef<string | null>(null);

  // Reset the draft each time the dialog opens, not on every project change.
  useEffect(() => {
    if (!open) {
      openedFor.current = null;
      setConfirming(false);
      return;
    }
    const key = `${mode}:${project.id}:${project.pages.length}`;
    if (openedFor.current === key) return;
    openedFor.current = key;
    setDraft(draftFromPageSize(project.pageSize));
    setName(project.name);
    setProjectName(project.name);
    setSpreads(Math.max(1, Math.ceil(getEditablePageCount(project.pages) / 2)));
    setConfirming(false);
  }, [open, mode, project]);

  // Print resolution is measured against the live draft, so warnings update
  // as the size changes.
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    const candidate = {
      ...project,
      pageSize: {
        ...project.pageSize,
        w: draft.wMm,
        h: draft.hMm,
        safeMargin: draft.safeMarginMm,
        bleed: draft.bleedMm,
        binding: draft.binding,
      },
    };
    const scaled =
      mode === "setup"
        ? {
            ...candidate,
            pages: previewPageSizeChange(project, candidate.pageSize).pages,
          }
        : candidate;
    void analyzePrintResolution(scaled).then((next) => {
      if (!cancelled) setReport(next);
    });
    return () => {
      cancelled = true;
    };
  }, [open, mode, project, draft]);

  const widthInvalid = !Number.isFinite(draft.wMm)
    ? true
    : draft.wMm < MM_MIN || draft.wMm > MM_MAX;
  const heightInvalid = !Number.isFinite(draft.hMm)
    ? true
    : draft.hMm < MM_MIN || draft.hMm > MM_MAX;
  const bleedInvalid =
    !Number.isFinite(draft.bleedMm) ||
    draft.bleedMm < 0 ||
    draft.bleedMm > BLEED_MAX;
  const marginInvalid =
    !Number.isFinite(draft.safeMarginMm) ||
    draft.safeMarginMm < 0 ||
    draft.safeMarginMm > MARGIN_MAX;
  const hasError =
    widthInvalid || heightInvalid || bleedInvalid || marginInvalid;

  const orientation = getOrientation({ w: draft.wMm, h: draft.hMm });
  const pageCount =
    mode === "new" ? spreads * 2 : getEditablePageCount(project.pages);
  const spine = getSpineWidth(draft.binding, pageCount);

  const trimChanged =
    Math.abs(draft.wMm - project.pageSize.w) > 0.05 ||
    Math.abs(draft.hMm - project.pageSize.h) > 0.05;
  const hasContent = project.pages.some((page) => page.elements.length > 0);
  const needsPreview = mode === "setup" && trimChanged && hasContent;

  const nextPageSize: PageSize = {
    w: round(draft.wMm, 2),
    h: round(draft.hMm, 2),
    unit: "mm",
    bleed: round(draft.bleedMm, 2),
    safeMargin: round(draft.safeMarginMm, 2),
    binding: draft.binding,
  };

  const preview = useMemo(() => {
    if (!needsPreview) return null;
    return previewPageSizeChange(project, nextPageSize);
  }, [needsPreview, project, nextPageSize.w, nextPageSize.h]);

  const applyPreset = (presetId: string) => {
    const preset = PAGE_SIZE_PRESETS.find((option) => option.id === presetId);
    if (!preset) return;
    setDraft((current) => {
      // Keep the current orientation when swapping presets.
      const landscape = current.wMm > current.hMm;
      return {
        ...current,
        presetId,
        wMm: landscape ? Math.max(preset.w, preset.h) : preset.w,
        hMm: landscape ? Math.min(preset.w, preset.h) : preset.h,
        bleedMm: preset.bleed,
      };
    });
  };

  const setOrientation = (orientation: "portrait" | "landscape") => {
    setDraft((current) => {
      if (orientation === "portrait") {
        return {
          ...current,
          wMm: Math.min(current.wMm, current.hMm),
          hMm: Math.max(current.wMm, current.hMm),
        };
      }
      return {
        ...current,
        wMm: Math.max(current.wMm, current.hMm),
        hMm: Math.min(current.wMm, current.hMm),
      };
    });
  };

  const swapDimensions = () =>
    setDraft((current) => ({ ...current, wMm: current.hMm, hMm: current.wMm }));

  const resetToDefaults = () =>
    setDraft((current) => ({
      ...current,
      bleedMm: DEFAULT_BLEED_MM,
      safeMarginMm: DEFAULT_SAFE_MARGIN_MM,
      binding: "perfect-bound",
    }));

  const commit = () => {
    if (hasError) return;
    if (mode === "new") {
      createProject({
        name: projectName,
        pageSize: nextPageSize,
        spreads,
      });
      onClose();
      return;
    }
    if (needsPreview) {
      setConfirming(true);
      return;
    }
    setPageSize(nextPageSize);
    setPageSetup({
      bleed: nextPageSize.bleed,
      safeMargin: nextPageSize.safeMargin,
      binding: nextPageSize.binding,
    });
    onClose();
  };

  const confirmRescale = () => {
    setPageSize(nextPageSize);
    setPageSetup({
      bleed: nextPageSize.bleed,
      safeMargin: nextPageSize.safeMargin,
      binding: nextPageSize.binding,
    });
    setConfirming(false);
    onClose();
  };

  const lowResolution = report?.issues ?? [];

  if (confirming && preview) {
    return (
      <Modal
        open={open}
        onClose={onClose}
        title="Rescale existing content?"
        description="Every element is scaled proportionally to the new trim. Undo is available afterwards."
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)}>
              Back
            </Button>
            <Button variant="primary" size="sm" onClick={confirmRescale}>
              Rescale and apply
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <BeforeAfter
              label="Before"
              w={project.pageSize.w}
              h={project.pageSize.h}
            />
            <BeforeAfter
              label="After"
              w={nextPageSize.w}
              h={nextPageSize.h}
              highlight
            />
          </div>
          <div className="rounded-field border border-line bg-surface-muted/50 px-3 py-2.5">
            <SetupRow label="Horizontal scale">
              <span className="font-mono text-[11px] tabular-nums text-ink">
                {formatNumber(preview.rx * 100, 1)}%
              </span>
            </SetupRow>
            <SetupRow label="Vertical scale">
              <span className="font-mono text-[11px] tabular-nums text-ink">
                {formatNumber(preview.ry * 100, 1)}%
              </span>
            </SetupRow>
            <SetupRow label="Pages affected">
              <span className="font-mono text-[11px] tabular-nums text-ink">
                {preview.pages.filter((page) => page.elements.length > 0).length}
              </span>
            </SetupRow>
            <SetupRow label="Elements rescaled">
              <span className="font-mono text-[11px] tabular-nums text-ink">
                {preview.pages.reduce(
                  (total, page) => total + page.elements.length,
                  0,
                )}
              </span>
            </SetupRow>
          </div>
          <p className="text-[11px] leading-4 text-ink-muted">
            Text sizes, stroke widths and corner radii scale by the smaller
            ratio so nothing distorts. A trim change from {formatNumber(project.pageSize.w, 1)}×
            {formatNumber(project.pageSize.h, 1)} to{" "}
            {formatNumber(nextPageSize.w, 1)}×{formatNumber(nextPageSize.h, 1)} mm
            keeps the layout proportions.
          </p>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={mode === "new" ? "New project" : "Page setup"}
      description={
        mode === "new"
          ? "Choose a size and binding, then start with a blank issue."
          : "Trim, bleed, margins and binding for this issue."
      }
      size="lg"
      footer={
        <>
          <div className="mr-auto flex items-center gap-2">
            <UnitToggle value={unit} onChange={setUnit} />
            <button
              type="button"
              onClick={resetToDefaults}
              className="inline-flex h-7 items-center gap-1.5 rounded-field px-2 text-[10.5px] font-medium text-ink-muted transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <RefreshCw className="size-3" aria-hidden="true" />
              Reset print defaults
            </button>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={commit}
            disabled={hasError}
          >
            {mode === "new" ? "Create project" : "Apply"}
          </Button>
        </>
      }
    >
      <div className="flex flex-col gap-5">
        {mode === "new" ? (
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
                Project name
              </span>
              <input
                type="text"
                value={projectName}
                onChange={(event) => setProjectName(event.target.value)}
                maxLength={80}
                className="h-8 w-full rounded-field border border-line bg-surface px-2.5 text-[12px] text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>
            <label className="flex flex-col gap-1.5">
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
                Spreads
              </span>
              <input
                type="number"
                min={1}
                max={200}
                value={spreads}
                onChange={(event) => setSpreads(Number(event.target.value))}
                className="h-8 w-full rounded-field border border-line bg-surface px-2.5 font-mono text-[12px] tabular-nums text-ink outline-none focus:border-accent focus:ring-2 focus:ring-accent/25"
              />
            </label>
          </div>
        ) : null}

        <section className="flex flex-col gap-2">
          <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Preset
          </h3>
          <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
            {PAGE_SIZE_PRESETS.map((preset) => {
              const selected = draft.presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => applyPreset(preset.id)}
                  className={cn(
                    "flex flex-col items-start gap-0.5 rounded-field border px-2.5 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                    selected
                      ? "border-accent bg-accent-soft/60"
                      : "border-line bg-surface hover:border-line-strong",
                  )}
                >
                  <span className="flex w-full items-center gap-1 text-[11px] font-semibold text-ink">
                    {selected ? (
                      <Check className="size-3 text-accent" aria-hidden="true" />
                    ) : null}
                    <span className="truncate">{preset.label}</span>
                  </span>
                  <span className="text-[9.5px] text-ink-subtle">
                    {preset.description}
                  </span>
                </button>
              );
            })}
            <button
              type="button"
              aria-pressed={draft.presetId === null}
              onClick={() =>
                setDraft((current) => ({ ...current, presetId: null }))
              }
              className={cn(
                "flex flex-col items-start gap-0.5 rounded-field border px-2.5 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                draft.presetId === null
                  ? "border-accent bg-accent-soft/60"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <span className="flex items-center gap-1 text-[11px] font-semibold text-ink">
                <Ruler className="size-3 text-ink-subtle" aria-hidden="true" />
                Custom
              </span>
              <span className="text-[9.5px] text-ink-subtle">Set your own</span>
            </button>
          </div>
        </section>

        <section className="flex flex-col gap-2.5">
          <div className="flex items-end gap-2">
            <UnitInput
              id="trim-width"
              label="Width"
              value={fromMm(draft.wMm, unit)}
              unit={unit}
              invalid={widthInvalid}
              step={unit === "in" ? 0.05 : 0.5}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  presetId: null,
                  wMm: toMm(value, unit),
                }))
              }
            />
            <button
              type="button"
              onClick={swapDimensions}
              aria-label="Swap width and height"
              className="mb-0.5 inline-flex size-8 shrink-0 items-center justify-center rounded-field border border-line bg-surface text-ink-muted transition-colors hover:border-line-strong hover:text-ink"
            >
              <span aria-hidden="true" className="rotate-90 text-[13px]">
                ⇄
              </span>
            </button>
            <UnitInput
              id="trim-height"
              label="Height"
              value={fromMm(draft.hMm, unit)}
              unit={unit}
              invalid={heightInvalid}
              step={unit === "in" ? 0.05 : 0.5}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  presetId: null,
                  hMm: toMm(value, unit),
                }))
              }
            />
          </div>

          <div className="flex items-center justify-between gap-3">
            <OrientationField
              orientation={orientation}
              onChange={setOrientation}
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <UnitInput
              id="trim-bleed"
              label="Bleed"
              value={fromMm(draft.bleedMm, unit)}
              unit={unit}
              invalid={bleedInvalid}
              step={unit === "in" ? 0.02 : 0.5}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  bleedMm: toMm(value, unit),
                }))
              }
            />
            <UnitInput
              id="trim-safe-margin"
              label="Safe margin"
              value={fromMm(draft.safeMarginMm, unit)}
              unit={unit}
              invalid={marginInvalid}
              step={unit === "in" ? 0.02 : 0.5}
              onChange={(value) =>
                setDraft((current) => ({
                  ...current,
                  safeMarginMm: toMm(value, unit),
                }))
              }
            />
          </div>
        </section>

        <BindingField
          value={draft.binding}
          onChange={(binding) => setDraft((current) => ({ ...current, binding }))}
          pageCount={pageCount}
        />

        <section className="flex flex-col gap-2">
          <DimensionSummary
            pageSize={{
              ...nextPageSize,
              w: Number.isFinite(draft.wMm) ? draft.wMm : 0,
              h: Number.isFinite(draft.hMm) ? draft.hMm : 0,
            }}
            pageCount={pageCount}
          />
          <div className="flex items-baseline justify-between gap-2 px-0.5">
            <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
              Spine ({getBinding(draft.binding).name})
            </span>
            <span className="font-mono text-[11px] tabular-nums text-ink">
              {spine > 0 ? `${formatNumber(spine, 1)} mm` : "n/a"}
            </span>
          </div>
        </section>

        {hasError ? (
          <p role="alert" className="text-[11px] leading-4 text-danger">
            Width and height must be {MM_MIN}–{MM_MAX} mm. Bleed must be 0–
            {BLEED_MAX} mm and safe margin 0–{MARGIN_MAX} mm.
          </p>
        ) : null}

        {lowResolution.length > 0 ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-field border border-line bg-danger-soft px-3 py-2.5"
          >
            <AlertTriangle
              className="mt-0.5 size-3.5 shrink-0 text-danger"
              aria-hidden="true"
            />
            <div className="flex flex-col gap-0.5">
              <span className="text-[11px] font-semibold text-danger">
                {lowResolution.length} image
                {lowResolution.length === 1 ? "" : "s"} below {MIN_PRINT_DPI} DPI
              </span>
              <span className="text-[10.5px] leading-4 text-danger/90">
                {lowResolution
                  .slice(0, 3)
                  .map((issue) => `${issue.alt} (${issue.dpi} DPI)`)
                  .join(", ")}
                {lowResolution.length > 3
                  ? ` and ${lowResolution.length - 3} more`
                  : ""}
                . They may look soft in print.
              </span>
            </div>
          </div>
        ) : null}

        {mode === "new" ? (
          <p className="flex items-start gap-2 rounded-field bg-surface-muted px-3 py-2 text-[10.5px] leading-4 text-ink-muted">
            <Plus className="mt-0.5 size-3 shrink-0 text-ink-subtle" aria-hidden="true" />
            Creating a project replaces the open issue. The current one can be
            restored with Undo.
          </p>
        ) : null}
      </div>
    </Modal>
  );
}

function BeforeAfter({
  label,
  w,
  h,
  highlight,
}: {
  label: string;
  w: number;
  h: number;
  highlight?: boolean;
}) {
  const maxEdge = 92;
  const ratio = w / h;
  const boxW = ratio >= 1 ? maxEdge : maxEdge * ratio;
  const boxH = ratio >= 1 ? maxEdge / ratio : maxEdge;
  return (
    <div
      className={cn(
        "flex flex-col items-center gap-1.5 rounded-field border px-3 py-3",
        highlight ? "border-accent bg-accent-soft/40" : "border-line bg-surface",
      )}
    >
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
        {label}
      </span>
      <span
        className="rounded-[2px] bg-paper shadow-paper ring-1 ring-black/5"
        style={{ width: boxW, height: boxH }}
      />
      <span className="font-mono text-[10px] tabular-nums text-ink-muted">
        {formatNumber(w, 1)} × {formatNumber(h, 1)} mm
      </span>
    </div>
  );
}
