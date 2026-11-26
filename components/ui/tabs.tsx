"use client";

import { useRef, type KeyboardEvent } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface TabItem {
  id: string;
  label: string;
  icon?: LucideIcon;
}

interface TabsProps<T extends string> {
  items: TabItem[];
  value: T;
  onChange: (value: T) => void;
  ariaLabel: string;
  orientation?: "horizontal" | "vertical";
  variant?: "rail" | "pill";
  panelId?: string;
  className?: string;
}

export function Tabs<T extends string>({
  items,
  value,
  onChange,
  ariaLabel,
  orientation = "horizontal",
  variant = "pill",
  panelId,
  className,
}: TabsProps<T>) {
  const refs = useRef<Array<HTMLButtonElement | null>>([]);

  const focusItem = (index: number) => {
    refs.current[index]?.focus();
  };

  const handleKeyDown = (
    event: KeyboardEvent<HTMLButtonElement>,
    index: number,
  ) => {
    const last = items.length - 1;
    let next = index;

    if (orientation === "vertical") {
      if (event.key === "ArrowDown") next = index === last ? 0 : index + 1;
      else if (event.key === "ArrowUp") next = index === 0 ? last : index - 1;
    } else {
      if (event.key === "ArrowRight") next = index === last ? 0 : index + 1;
      else if (event.key === "ArrowLeft") next = index === 0 ? last : index - 1;
    }

    if (event.key === "Home") next = 0;
    if (event.key === "End") next = last;

    if (next !== index) {
      event.preventDefault();
      focusItem(next);
      onChange(items[next]!.id as T);
    }
  };

  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      aria-orientation={orientation}
      className={cn(
        "flex",
        orientation === "vertical" ? "flex-col" : "flex-row",
        variant === "pill" && "gap-1 rounded-ui bg-surface-muted p-1",
        className,
      )}
    >
      {items.map((item, index) => {
        const active = item.id === value;
        const Icon = item.icon;
        return (
          <button
            key={item.id}
            ref={(node) => {
              refs.current[index] = node;
            }}
            role="tab"
            id={`tab-${item.id}`}
            aria-selected={active}
            aria-controls={panelId}
            tabIndex={active ? 0 : -1}
            type="button"
            onClick={() => onChange(item.id as T)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              "group relative inline-flex select-none items-center justify-center transition-colors duration-150 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface",
              variant === "pill" &&
                "h-8 flex-1 rounded-[8px] px-3 text-[12px] font-medium",
              variant === "pill" &&
                (active
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink"),
              variant === "rail" &&
                "w-16 flex-col gap-1.5 rounded-ui px-1 py-2.5 text-[9.5px] font-medium leading-[1.15]",
              variant === "rail" &&
                (active
                  ? "bg-accent-soft text-accent-strong"
                  : "text-ink-subtle hover:bg-surface-muted hover:text-ink"),
            )}
          >
            {Icon ? (
              <Icon
                className={cn(
                  "shrink-0",
                  variant === "rail" ? "size-[18px]" : "size-3.5",
                )}
                strokeWidth={active ? 2 : 1.75}
                aria-hidden="true"
              />
            ) : null}
            <span className={cn(variant === "rail" && "tracking-[0.01em]")}>
              {item.label}
            </span>
            {variant === "rail" && active ? (
              <span
                aria-hidden="true"
                className="absolute left-0 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-r-full bg-accent"
              />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
