import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

interface PanelSectionProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function PanelSection({
  title,
  description,
  action,
  children,
  className,
}: PanelSectionProps) {
  return (
    <section className={cn("flex flex-col gap-2.5", className)}>
      {title || action ? (
        <div className="flex items-center justify-between gap-3">
          {title ? (
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
              {title}
            </h3>
          ) : (
            <span />
          )}
          {action}
        </div>
      ) : null}
      {description ? (
        <p className="text-[11px] leading-4 text-ink-muted">{description}</p>
      ) : null}
      {children}
    </section>
  );
}

interface PageContextProps {
  label: string;
  suffix?: string;
}

export function PageContext({ label, suffix }: PageContextProps) {
  return (
    <div className="flex items-center gap-1.5 rounded-field border border-line bg-surface-muted/60 px-2.5 py-2 text-[11px]">
      <span className="text-ink-subtle">On page</span>
      <span className="font-medium text-ink">{label}</span>
      {suffix ? (
        <>
          <span aria-hidden="true" className="size-0.5 rounded-full bg-line-strong" />
          <span className="text-ink-subtle">{suffix}</span>
        </>
      ) : null}
    </div>
  );
}
