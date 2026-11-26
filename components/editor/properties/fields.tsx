"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

export function PropertySection({
  title,
  action,
  children,
  className,
}: {
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "border-t border-line px-3.5 py-3.5 first:border-t-0",
        className,
      )}
    >
      <div className="mb-2.5 flex items-center justify-between gap-2">
        <h3 className="text-[9.5px] font-semibold uppercase tracking-[0.15em] text-ink-subtle">
          {title}
        </h3>
        {action}
      </div>
      <div className="flex flex-col gap-2.5">{children}</div>
    </section>
  );
}

export function PropertyGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-2.5">{children}</div>;
}

interface NumberFieldProps {
  label: string;
  value: number;
  onCommit: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  unit?: string;
  disabled?: boolean;
  className?: string;
}

function formatDraft(value: number) {
  return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100);
}

export function NumberField({
  label,
  value,
  onCommit,
  min,
  max,
  step = 1,
  unit,
  disabled = false,
  className,
}: NumberFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(formatDraft(value));
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(formatDraft(value));
  }, [value]);

  const reset = () => setDraft(formatDraft(value));

  const commit = () => {
    const parsed = Number.parseFloat(draft.replace(",", "."));
    if (!Number.isFinite(parsed)) {
      reset();
      return;
    }
    let next = parsed;
    if (typeof min === "number") next = Math.max(min, next);
    if (typeof max === "number") next = Math.min(max, next);
    setDraft(formatDraft(next));
    if (Math.abs(next - value) > 0.0001) onCommit(next);
  };

  return (
    <div className={cn("flex min-w-0 flex-col gap-1", className)}>
      <label
        htmlFor={id}
        className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
      >
        {label}
      </label>
      <span className="relative block">
        <input
          id={id}
          type="number"
          inputMode="decimal"
          step={step}
          value={draft}
          disabled={disabled}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(event) => setDraft(event.target.value)}
          onBlur={() => {
            focused.current = false;
            commit();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              reset();
              event.currentTarget.blur();
            }
          }}
          className={cn(
            "h-8 w-full rounded-field border border-line bg-surface px-2 font-mono text-[11.5px] tabular-nums text-ink outline-none transition-colors duration-150 hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-45",
            unit && "pr-7",
          )}
        />
        {unit ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute right-2 top-1/2 -translate-y-1/2 text-[9.5px] font-medium text-ink-subtle"
          >
            {unit}
          </span>
        ) : null}
      </span>
    </div>
  );
}

interface TextFieldProps {
  label: string;
  value: string;
  onCommit: (value: string) => void;
  onLiveChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
}

export function TextField({
  label,
  value,
  onCommit,
  onLiveChange,
  placeholder,
  disabled = false,
  multiline = false,
  rows = 3,
}: TextFieldProps) {
  const id = useId();
  const [draft, setDraft] = useState(value);
  const focused = useRef(false);

  useEffect(() => {
    if (!focused.current) setDraft(value);
  }, [value]);

  const commit = () => {
    if (draft !== value) onCommit(draft);
  };

  const sharedClass =
    "w-full rounded-field border border-line bg-surface px-2.5 py-2 text-[11.5px] leading-4 text-ink outline-none transition-colors duration-150 placeholder:text-ink-subtle hover:border-line-strong focus:border-accent focus:ring-2 focus:ring-accent/20 disabled:opacity-45";

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <label
        htmlFor={id}
        className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
      >
        {label}
      </label>
      {multiline ? (
        <textarea
          id={id}
          value={draft}
          rows={rows}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            onLiveChange?.(event.target.value);
          }}
          onBlur={() => {
            focused.current = false;
            commit();
          }}
          onKeyDown={(event) => {
            if (event.key === "Escape") {
              event.preventDefault();
              setDraft(value);
              event.currentTarget.blur();
            } else if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
              event.preventDefault();
              commit();
              event.currentTarget.blur();
            }
          }}
          className={cn(sharedClass, "min-h-[60px] resize-y")}
        />
      ) : (
        <input
          id={id}
          type="text"
          value={draft}
          disabled={disabled}
          placeholder={placeholder}
          onFocus={() => {
            focused.current = true;
          }}
          onChange={(event) => {
            setDraft(event.target.value);
            onLiveChange?.(event.target.value);
          }}
          onBlur={() => {
            focused.current = false;
            commit();
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              commit();
              event.currentTarget.blur();
            } else if (event.key === "Escape") {
              event.preventDefault();
              setDraft(value);
              event.currentTarget.blur();
            }
          }}
          className={cn(sharedClass, "h-8 py-0")}
        />
      )}
    </div>
  );
}

interface SelectOption<T extends string | number> {
  value: T;
  label: string;
}

interface SelectFieldProps<T extends string | number> {
  label: string;
  value: T;
  options: SelectOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function SelectField<T extends string | number>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SelectFieldProps<T>) {
  const id = useId();
  const current = options.find((option) => option.value === value);

  const items: DropdownItem[] = options.map((option) => ({
    id: String(option.value),
    label: option.label,
    checked: option.value === value,
    onSelect: () => onChange(option.value),
  }));

  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span
        id={`${id}-label`}
        className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle"
      >
        {label}
      </span>
      <Dropdown
        items={items}
        ariaLabel={label}
        minWidth={180}
        className="w-full"
        trigger={
          <Button
            variant="secondary"
            size="sm"
            block
            disabled={disabled}
            className="h-8 justify-between px-2.5 text-[11.5px] font-normal"
            aria-labelledby={`${id}-label`}
            trailingIcon={ChevronDown}
          >
            <span className="truncate">{current?.label ?? "—"}</span>
          </Button>
        }
      />
    </div>
  );
}

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  icon?: LucideIcon;
  iconOnly?: boolean;
}

interface SegmentedFieldProps<T extends string> {
  label: string;
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  disabled?: boolean;
}

export function SegmentedField<T extends string>({
  label,
  value,
  options,
  onChange,
  disabled = false,
}: SegmentedFieldProps<T>) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
        {label}
      </span>
      <div
        role="group"
        aria-label={label}
        className="flex rounded-field border border-line bg-surface-muted p-0.5"
      >
        {options.map((option) => {
          const active = option.value === value;
          const Icon = option.icon;
          return (
            <button
              key={option.value}
              type="button"
              disabled={disabled}
              aria-pressed={active}
              aria-label={option.iconOnly ? option.label : undefined}
              onClick={() => onChange(option.value)}
              className={cn(
                "flex h-7 flex-1 items-center justify-center gap-1 rounded-[6px] text-[10.5px] font-medium transition-[background-color,color,box-shadow] duration-150 disabled:opacity-45",
                active
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-subtle hover:text-ink",
              )}
            >
              {Icon ? <Icon className="size-3.5" aria-hidden="true" /> : null}
              {option.iconOnly ? (
                <span className="sr-only">{option.label}</span>
              ) : (
                <span>{option.label}</span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
