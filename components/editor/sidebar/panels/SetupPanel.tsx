"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, Check, ChevronRight, ScanLine } from "lucide-react";
import type { BindingType, PageSize } from "@/types";
import { useEditorStore } from "@/store";
import { getBinding, getSpineWidth } from "@/lib/binding";
import { formatNumber, PAGE_SIZE_PRESETS } from "@/lib/units";
import { getEditablePageCount } from "@/lib/spreads";
import {
  analyzePrintResolution,
  MIN_PRINT_DPI,
  type ResolutionReport,
} from "@/lib/printQuality";
import { PanelSection } from "@/components/editor/sidebar/PanelSection";
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
import { Button } from "@/components/ui/button";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/cn";

interface SetupPanelProps {
  onOpenDialog: () => void;
  onCreateProject: () => void;
}

export function SetupPanel({ onOpenDialog, onCreateProject }: SetupPanelProps) {
  const project = useEditorStore((state) => state.project);
  const setPageSize = useEditorStore((state) => state.setPageSize);
  const setPageSetup = useEditorStore((state) => state.setPageSetup);
  const setSpineText = useEditorStore((state) => state.setSpineText);
  const showSafeMargin = useEditorStore((state) => state.ui.showSafeMargin);
  const showBleed = useEditorStore((state) => state.ui.showBleed);
  const setShowSafeMargin = useEditorStore((state) => state.setShowSafeMargin);
  const setShowBleed = useEditorStore((state) => state.setShowBleed);

  const [unit, setUnit] = useState<DisplayUnit>("mm");
  const [draft, setDraft] = useState<PageSize>(project.pageSize);
  const [spineDraft, setSpineDraft] = useState(
    project.spineText ?? project.name,
  );
  const [report, setReport] = useState<ResolutionReport | null>(null);

  // Mirror the store into a local draft so typing does not commit per keystroke.
  useEffect(() => {
    setDraft(project.pageSize);
  }, [project.pageSize]);

  useEffect(() => {
    setSpineDraft(project.spineText ?? project.name);
  }, [project.spineText, project.name]);

  useEffect(() => {
    let cancelled = false;
    void analyzePrintResolution(project).then((next) => {
      if (!cancelled) setReport(next);
    });
    return () => {
      cancelled = true;
    };
  }, [project]);

  const pageCount = getEditablePageCount(project.pages);
  const spine = getSpineWidth(draft.binding, pageCount);
  const preset = PAGE_SIZE_PRESETS.find(
    (option) =>
      (Math.abs(option.w - draft.w) < 0.1 && Math.abs(option.h - draft.h) < 0.1) ||
      (Math.abs(option.w - draft.h) < 0.1 && Math.abs(option.h - draft.w) < 0.1),
  );

  const commitTrim = () => setPageSize(draft);

  const setOrientation = (orientation: "portrait" | "landscape") => {
    const next =
      orientation === "portrait"
        ? { ...draft, w: Math.min(draft.w, draft.h), h: Math.max(draft.w, draft.h) }
        : { ...draft, w: Math.max(draft.w, draft.h), h: Math.min(draft.w, draft.h) };
    setDraft(next);
    setPageSize(next);
  };

  const applyPreset = (id: string) => {
    const option = PAGE_SIZE_PRESETS.find((entry) => entry.id === id);
    if (!option) return;
    const landscape = draft.w > draft.h;
    const next: PageSize = {
      ...draft,
      w: landscape ? Math.max(option.w, option.h) : option.w,
      h: landscape ? Math.min(option.w, option.h) : option.h,
      bleed: option.bleed,
    };
    setDraft(next);
    setPageSize(next);
  };

  const lowResolution = report?.issues ?? [];

  return (
    <div className="flex flex-col gap-5">
      <PanelSection
        title="Current page"
        description="Changes rescale existing elements proportionally and can be undone."
      >
        <div className="rounded-field border border-line bg-surface-muted/40 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-ink">
              {preset?.label ?? "Custom size"}
            </span>
            <span className="font-mono text-[10.5px] tabular-nums text-ink-muted">
              {formatNumber(draft.w, 1)} × {formatNumber(draft.h, 1)} mm
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between gap-2">
          <UnitToggle value={unit} onChange={setUnit} />
          <OrientationField orientation={getOrientation(draft)} onChange={setOrientation} />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <UnitInput
            id="panel-width"
            label="Width"
            value={fromMm(draft.w, unit)}
            unit={unit}
            step={unit === "in" ? 0.05 : 0.5}
            onChange={(value) =>
              setDraft((current) => ({ ...current, w: toMm(value, unit) }))
            }
          />
          <UnitInput
            id="panel-height"
            label="Height"
            value={fromMm(draft.h, unit)}
            unit={unit}
            step={unit === "in" ? 0.05 : 0.5}
            onChange={(value) =>
              setDraft((current) => ({ ...current, h: toMm(value, unit) }))
            }
          />
        </div>

        <div className="grid grid-cols-2 gap-2">
          <UnitInput
            id="panel-bleed"
            label="Bleed"
            value={fromMm(draft.bleed, unit)}
            unit={unit}
            step={unit === "in" ? 0.02 : 0.5}
            onChange={(value) =>
              setDraft((current) => ({ ...current, bleed: toMm(value, unit) }))
            }
          />
          <UnitInput
            id="panel-safe-margin"
            label="Safe margin"
            value={fromMm(draft.safeMargin, unit)}
            unit={unit}
            step={unit === "in" ? 0.02 : 0.5}
            onChange={(value) =>
              setDraft((current) => ({
                ...current,
                safeMargin: toMm(value, unit),
              }))
            }
          />
        </div>

        <Button variant="secondary" size="sm" block onClick={commitTrim}>
          Apply trim and rescale
        </Button>

        <div className="grid grid-cols-2 gap-1.5">
          {PAGE_SIZE_PRESETS.slice(0, 4).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => applyPreset(option.id)}
              aria-pressed={preset?.id === option.id}
              className={cn(
                "truncate rounded-field border px-2 py-1.5 text-[10.5px] font-medium transition-colors duration-150",
                preset?.id === option.id
                  ? "border-accent bg-accent-soft/60 text-ink"
                  : "border-line bg-surface text-ink-muted hover:border-line-strong",
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={onOpenDialog}
          className="inline-flex items-center gap-1 self-start text-[10.5px] font-medium text-accent hover:underline"
        >
          All sizes and presets
          <ChevronRight className="size-3" aria-hidden="true" />
        </button>
      </PanelSection>

      <PanelSection title="Binding">
        <BindingField
          value={draft.binding}
          onChange={(binding: BindingType) => {
            setDraft((current) => ({ ...current, binding }));
            setPageSetup({ binding });
          }}
          pageCount={pageCount}
        />
      </PanelSection>

      <PanelSection title="Print summary">
        <DimensionSummary pageSize={draft} pageCount={pageCount} />
        <div className="rounded-field border border-line bg-surface-muted/50 px-2.5 py-2">
          <SetupRow label="Spine">
            <span className="font-mono text-[11px] tabular-nums text-ink">
              {spine > 0 ? `${formatNumber(spine, 1)} mm` : "n/a"}
            </span>
          </SetupRow>
          <SetupRow label="Binding">
            <span className="text-[11px] text-ink-muted">
              {getBinding(draft.binding).name}
            </span>
          </SetupRow>
        </div>
        <label className="flex flex-col gap-1.5">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
            Spine text
          </span>
          <input
            type="text"
            value={spineDraft}
            maxLength={80}
            placeholder="Blank spine"
            onChange={(event) => setSpineDraft(event.target.value)}
            onBlur={() => setSpineText(spineDraft)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                setSpineText(spineDraft);
                event.currentTarget.blur();
              }
            }}
            className="h-8 w-full rounded-field border border-line bg-surface px-2.5 text-[11.5px] text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/25"
          />
        </label>
      </PanelSection>

      <PanelSection title="Guides">
        <Toggle
          label="Safe margin"
          description="Dashed inset for critical content."
          checked={showSafeMargin}
          onCheckedChange={setShowSafeMargin}
        />
        <Toggle
          label="Bleed"
          description="Marks the trim allowance outside the page edge."
          checked={showBleed}
          onCheckedChange={setShowBleed}
        />
      </PanelSection>

      <PanelSection title="Print quality">
        {report === null ? (
          <p className="flex items-center gap-1.5 text-[10.5px] text-ink-subtle">
            <ScanLine className="size-3" aria-hidden="true" />
            Measuring placed images…
          </p>
        ) : report.imageCount === 0 ? (
          <p className="text-[10.5px] leading-4 text-ink-subtle">
            No images placed yet.
          </p>
        ) : lowResolution.length === 0 ? (
          <p className="flex items-start gap-1.5 text-[10.5px] leading-4 text-ink-muted">
            <Check className="mt-0.5 size-3 shrink-0 text-accent" aria-hidden="true" />
            All {report.imageCount} images meet {MIN_PRINT_DPI} DPI at their
            placed size.
          </p>
        ) : (
          <div className="flex flex-col gap-1.5 rounded-field border border-line bg-danger-soft px-2.5 py-2">
            <div className="flex items-center gap-1.5">
              <AlertTriangle className="size-3 shrink-0 text-danger" aria-hidden="true" />
              <span className="text-[10.5px] font-semibold text-danger">
                {lowResolution.length} below {MIN_PRINT_DPI} DPI
              </span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {lowResolution.slice(0, 5).map((issue) => (
                <li
                  key={issue.elementId}
                  className="flex items-baseline justify-between gap-2 text-[10px] text-danger/90"
                >
                  <span className="truncate">{issue.alt}</span>
                  <span className="shrink-0 font-mono tabular-nums">
                    {issue.dpi} DPI
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </PanelSection>

      <PanelSection title="Document">
        <Button variant="secondary" size="sm" block onClick={onCreateProject}>
          New project…
        </Button>
      </PanelSection>
    </div>
  );
}
