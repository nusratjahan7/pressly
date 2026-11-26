"use client";

import { useId, type CSSProperties } from "react";
import { cn } from "@/lib/cn";

interface SliderProps {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  label: string;
  onValueChange: (value: number) => void;
  onStart?: () => void;
  formatValue?: (value: number) => string;
  disabled?: boolean;
  className?: string;
  valueClassName?: string;
}

export function Slider({
  value,
  min = 0,
  max = 100,
  step = 1,
  label,
  onValueChange,
  onStart,
  formatValue = (next) => `${Math.round(next)}`,
  disabled = false,
  className,
  valueClassName,
}: SliderProps) {
  const id = useId();
  const progress = max === min ? 0 : ((value - min) / (max - min)) * 100;

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <div className="flex items-baseline justify-between gap-3">
        <label
          htmlFor={id}
          className="text-[11px] font-medium tracking-[0.02em] text-ink-muted"
        >
          {label}
        </label>
        <output
          htmlFor={id}
          className={cn(
            "font-sans text-[11px] tabular-nums text-ink-subtle",
            valueClassName,
          )}
        >
          {formatValue(value)}
        </output>
      </div>
      <input
        id={id}
        type="range"
        className="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        aria-valuetext={formatValue(value)}
        style={{ "--range-progress": `${progress}%` } as CSSProperties}
        onPointerDown={() => {
          if (!disabled) onStart?.();
        }}
        onKeyDown={(event) => {
          if (
            ["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Home", "End", "PageUp", "PageDown"].includes(
              event.key,
            )
          ) {
            onStart?.();
          }
        }}
        onChange={(event) => {
          onValueChange(Number(event.target.value));
        }}
      />
    </div>
  );
}
