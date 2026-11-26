"use client";

import { useId } from "react";
import { cn } from "@/lib/cn";

interface ToggleProps {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  label: string;
  description?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

export function Toggle({
  checked,
  onCheckedChange,
  label,
  description,
  disabled = false,
  className,
  id,
}: ToggleProps) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  const descriptionId = `${switchId}-description`;

  return (
    <div className={cn("flex items-start justify-between gap-4", className)}>
      <div className="flex min-w-0 flex-col gap-0.5">
        <label
          htmlFor={switchId}
          className="text-[12px] font-medium leading-5 text-ink"
        >
          {label}
        </label>
        {description ? (
          <p
            id={descriptionId}
            className="text-[11px] leading-4 text-ink-subtle"
          >
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-describedby={description ? descriptionId : undefined}
        disabled={disabled}
        onClick={() => onCheckedChange(!checked)}
        className={cn(
          "relative mt-0.5 inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full border transition-colors duration-150 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:opacity-45",
          checked
            ? "border-accent bg-accent"
            : "border-line-strong bg-surface-sunken",
        )}
      >
        <span
          aria-hidden="true"
          className={cn(
            "pointer-events-none block size-[16px] rounded-full bg-surface shadow-sm transition-transform duration-150 ease-out-soft",
            checked ? "translate-x-[18px]" : "translate-x-[3px]",
          )}
        />
      </button>
    </div>
  );
}
