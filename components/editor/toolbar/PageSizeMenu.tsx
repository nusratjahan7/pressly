"use client";

import { useEffect, useState } from "react";
import { ArrowLeftRight, ChevronDown, Ruler, SlidersHorizontal } from "lucide-react";
import type { PageSize } from "@/types";
import { useEditorStore } from "@/store";
import {
  findPresetForSize,
  formatNumber,
  MM_PER_INCH,
  PAGE_SIZE_PRESETS,
} from "@/lib/units";
import { Button } from "@/components/ui/button";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { Modal } from "@/components/ui/modal";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

interface MeasurementProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
}

function Measurement({ id, label, value, onChange, invalid }: MeasurementProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
        {label}
      </span>
      <span className="relative block">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={0.5}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-9 w-full rounded-field border bg-surface px-2.5 pr-8 font-mono text-[12px] tabular-nums text-ink outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25",
            invalid ? "border-danger" : "border-line",
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-ink-subtle"
        >
          mm
        </span>
      </span>
    </label>
  );
}

export function PageSizeMenu() {
  const project = useEditorStore((state) => state.project);
  const setPageSize = useEditorStore((state) => state.setPageSize);
  const [customOpen, setCustomOpen] = useState(false);
  const [draft, setDraft] = useState({
    w: String(project.pageSize.w),
    h: String(project.pageSize.h),
    bleed: String(project.pageSize.bleed),
  });

  const preset = findPresetForSize(
    project.pageSize.w,
    project.pageSize.h,
    project.pageSize.bleed,
  );

  useEffect(() => {
    if (!customOpen) return;
    setDraft({
      w: String(project.pageSize.w),
      h: String(project.pageSize.h),
      bleed: String(project.pageSize.bleed),
    });
  }, [customOpen, project.pageSize]);

  const width = Number(draft.w);
  const height = Number(draft.h);
  const bleed = Number(draft.bleed);

  const widthInvalid = !Number.isFinite(width) || width < 20 || width > 1000;
  const heightInvalid = !Number.isFinite(height) || height < 20 || height > 1000;
  const bleedInvalid = !Number.isFinite(bleed) || bleed < 0 || bleed > 25;
  const hasError = widthInvalid || heightInvalid || bleedInvalid;

  const applyCustom = (event: React.FormEvent) => {
    event.preventDefault();
    if (hasError) return;
    const next: PageSize = {
      w: width,
      h: height,
      unit: "mm",
      bleed,
    };
    setPageSize(next);
    setCustomOpen(false);
  };

  const items: DropdownItem[] = [
    ...PAGE_SIZE_PRESETS.map((option) => ({
      id: option.id,
      label: option.label,
      shortcut: option.description,
      checked:
        Math.abs(option.w - project.pageSize.w) < 0.1 &&
        Math.abs(option.h - project.pageSize.h) < 0.1 &&
        Math.abs(option.bleed - project.pageSize.bleed) < 0.1,
      onSelect: () =>
        setPageSize({
          w: option.w,
          h: option.h,
          unit: "mm",
          bleed: option.bleed,
        }),
    })),
    {
      id: "custom",
      label: "Custom size…",
      icon: SlidersHorizontal,
      separatorBefore: true,
      onSelect: () => setCustomOpen(true),
    },
  ];

  return (
    <>
      <Dropdown
        items={items}
        ariaLabel="Page size"
        align="start"
        minWidth={230}
        header="Page size"
        trigger={
          <Button
            variant="secondary"
            size="sm"
            className="h-7 gap-1.5 rounded-full border-line bg-surface-muted/70 px-2.5 text-[11px] font-medium"
            aria-label={`Page size: ${preset?.label ?? "Custom"}, ${formatNumber(project.pageSize.w, 1)} by ${formatNumber(project.pageSize.h, 1)} millimetres`}
            trailingIcon={ChevronDown}
          >
            <Ruler
              className="size-3.5 text-ink-subtle"
              strokeWidth={1.75}
              aria-hidden="true"
            />
            <span className="font-semibold text-ink">
              {preset?.label ?? "Custom"}
            </span>
            <span className="hidden text-ink-subtle xl:inline">
              {formatNumber(project.pageSize.w, 1)} ×{" "}
              {formatNumber(project.pageSize.h, 1)} mm
            </span>
          </Button>
        }
      />

      <Modal
        open={customOpen}
        onClose={() => setCustomOpen(false)}
        title="Custom page size"
        description="Set the trim dimensions and bleed for every page in this issue."
        size="sm"
        footer={
          <>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setCustomOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              type="submit"
              form="page-size-form"
              disabled={hasError}
            >
              Apply size
            </Button>
          </>
        }
      >
        <form id="page-size-form" onSubmit={applyCustom} className="flex flex-col gap-4">
          <div className="flex items-end gap-2">
            <Measurement
              id="page-width"
              label="Width"
              value={draft.w}
              onChange={(value) =>
                setDraft((current) => ({ ...current, w: value }))
              }
              invalid={widthInvalid}
            />
            <IconButton
              icon={ArrowLeftRight}
              label="Swap width and height"
              size="md"
              variant="ghost"
              className="mb-0.5 shrink-0"
              onClick={() =>
                setDraft((current) => ({
                  ...current,
                  w: current.h,
                  h: current.w,
                }))
              }
            />
            <Measurement
              id="page-height"
              label="Height"
              value={draft.h}
              onChange={(value) =>
                setDraft((current) => ({ ...current, h: value }))
              }
              invalid={heightInvalid}
            />
          </div>
          <Measurement
            id="page-bleed"
            label="Bleed"
            value={draft.bleed}
            onChange={(value) =>
              setDraft((current) => ({ ...current, bleed: value }))
            }
            invalid={bleedInvalid}
          />
          <div className="flex items-start justify-between gap-4 rounded-field bg-surface-muted px-3 py-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
                Trim in inches
              </span>
              <span className="font-mono text-[11px] text-ink-muted">
                {formatNumber(width / MM_PER_INCH, 2)} ×{" "}
                {formatNumber(height / MM_PER_INCH, 2)} in
              </span>
            </div>
            <p className="max-w-[170px] text-right text-[10.5px] leading-4 text-ink-subtle">
              Existing elements scale proportionally. This can be undone.
            </p>
          </div>
          {hasError ? (
            <p role="alert" className="text-[11px] leading-4 text-danger">
              Width and height must be between 20 and 1000 mm. Bleed must be
              between 0 and 25 mm.
            </p>
          ) : null}
        </form>
      </Modal>
    </>
  );
}
