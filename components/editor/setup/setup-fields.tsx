"use client";

import { useId } from "react";
import { ArrowLeftRight } from "lucide-react";
import type { BindingType, Orientation, PageSize } from "@/types";
import { BINDING_TYPES } from "@/lib/binding";
import {
  formatNumber,
  inchesToMm,
  mmToInchesRounded,
  MM_PER_INCH,
} from "@/lib/units";
import { IconButton } from "@/components/ui/icon-button";
import { cn } from "@/lib/cn";

export type DisplayUnit = "mm" | "in";

export function getOrientation(pageSize: Pick<PageSize, "w" | "h">): Orientation {
  return pageSize.w > pageSize.h ? "landscape" : "portrait";
}

interface NumberInputProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  unit: DisplayUnit;
  invalid?: boolean;
  step?: number;
}

export function UnitInput({
  id,
  label,
  value,
  onChange,
  unit,
  invalid,
  step = 0.1,
}: NumberInputProps) {
  return (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1.5">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
        {label}
      </span>
      <span className="relative block">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          min={0}
          step={step}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={invalid || undefined}
          className={cn(
            "h-8 w-full rounded-field border bg-surface px-2.5 pr-9 font-mono text-[12px] tabular-nums text-ink outline-none transition-colors duration-150 focus:border-accent focus:ring-2 focus:ring-accent/25",
            invalid ? "border-danger" : "border-line",
          )}
        />
        <span
          aria-hidden="true"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[10px] font-medium text-ink-subtle"
        >
          {unit}
        </span>
      </span>
    </label>
  );
}

interface UnitToggleProps {
  value: DisplayUnit;
  onChange: (unit: DisplayUnit) => void;
  label?: string;
}

export function UnitToggle({ value, onChange, label = "Units" }: UnitToggleProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="inline-flex h-7 items-center gap-0.5 rounded-field border border-line bg-surface-muted/60 p-0.5"
    >
      {(["mm", "in"] as const).map((unit) => (
        <button
          key={unit}
          type="button"
          aria-pressed={value === unit}
          onClick={() => onChange(unit)}
          className={cn(
            "h-6 rounded-[6px] px-2 text-[10.5px] font-semibold uppercase tracking-[0.06em] transition-colors duration-150",
            value === unit
              ? "bg-surface text-ink shadow-sm"
              : "text-ink-subtle hover:text-ink-muted",
          )}
        >
          {unit}
        </button>
      ))}
    </div>
  );
}

interface OrientationFieldProps {
  orientation: Orientation;
  onChange: (orientation: Orientation) => void;
}

export function OrientationField({
  orientation,
  onChange,
}: OrientationFieldProps) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
        Orientation
      </span>
      <IconButton
        icon={ArrowLeftRight}
        label="Rotate page 90°"
        tooltip={
          orientation === "portrait"
            ? "Switch to landscape"
            : "Switch to portrait"
        }
        size="sm"
        variant="secondary"
        onClick={() =>
          onChange(orientation === "portrait" ? "landscape" : "portrait")
        }
      />
      <span className="text-[11px] font-medium capitalize text-ink">
        {orientation}
      </span>
    </div>
  );
}

interface BindingFieldProps {
  value: BindingType;
  onChange: (binding: BindingType) => void;
  pageCount: number;
}

export function BindingField({ value, onChange, pageCount }: BindingFieldProps) {
  return (
    <fieldset className="flex flex-col gap-1.5">
      <legend className="mb-1 text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
        Binding
      </legend>
      <div className="grid gap-1.5">
        {BINDING_TYPES.map((binding) => {
          const selected = binding.id === value;
          return (
            <button
              key={binding.id}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(binding.id)}
              className={cn(
                "flex flex-col gap-0.5 rounded-field border px-2.5 py-2 text-left transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                selected
                  ? "border-accent bg-accent-soft/60"
                  : "border-line bg-surface hover:border-line-strong",
              )}
            >
              <span
                className={cn(
                  "text-[11.5px] font-semibold",
                  selected ? "text-ink" : "text-ink-muted",
                )}
              >
                {binding.name}
              </span>
              <span className="text-[10px] leading-3.5 text-ink-subtle">
                {binding.description}
              </span>
            </button>
          );
        })}
      </div>
      {value !== "saddle-stitch" && pageCount < 32 ? (
        <p className="text-[10.5px] leading-4 text-ink-subtle">
          {pageCount} pages is short for glue binding; saddle stitch may hold
          better.
        </p>
      ) : null}
    </fieldset>
  );
}

/** Converts a display-unit string into millimetres. */
export function toMm(value: string, unit: DisplayUnit): number {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return unit === "in" ? inchesToMm(parsed) : parsed;
}

/** Formats millimetres into the given display unit, for input values. */
export function fromMm(mm: number, unit: DisplayUnit, decimals = 2): string {
  if (!Number.isFinite(mm)) return "";
  if (unit === "in") return String(mmToInchesRounded(mm, decimals));
  return String(Math.round(mm * 10) / 10);
}

export function formatWithUnit(mm: number, unit: DisplayUnit, decimals = 1) {
  if (unit === "in") {
    return `${formatNumber(mm / MM_PER_INCH, 2)} in`;
  }
  return `${formatNumber(mm, decimals)} mm`;
}

/** Live "trim, bleed and page count" summary shared by both surfaces. */
export function DimensionSummary({
  pageSize,
  pageCount,
}: {
  pageSize: PageSize;
  pageCount: number;
}) {
  return (
    <div className="flex flex-col gap-1 rounded-field border border-line bg-surface-muted/50 px-2.5 py-2">
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
          Trim
        </span>
        <span className="font-mono text-[11px] tabular-nums text-ink">
          {formatNumber(pageSize.w, 1)} × {formatNumber(pageSize.h, 1)} mm
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
          Inches
        </span>
        <span className="font-mono text-[11px] tabular-nums text-ink-muted">
          {formatNumber(pageSize.w / MM_PER_INCH, 2)} ×{" "}
          {formatNumber(pageSize.h / MM_PER_INCH, 2)} in
        </span>
      </div>
      <div className="flex items-baseline justify-between gap-2">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.13em] text-ink-subtle">
          Total pages
        </span>
        <span className="font-mono text-[11px] tabular-nums text-ink-muted">
          {pageCount}
        </span>
      </div>
    </div>
  );
}

/** Small helper for a labelled row inside the setup surfaces. */
export function SetupRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[11px] font-medium text-ink-muted">{label}</span>
      {children}
    </div>
  );
}

export function useIdSafe(prefix: string) {
  const id = useId();
  return `${prefix}-${id}`;
}
