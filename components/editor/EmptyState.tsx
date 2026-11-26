import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

function PaperIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 140 96"
      fill="none"
      aria-hidden="true"
      className={cn("h-24 w-32", className)}
    >
      <rect
        x="34"
        y="10"
        width="66"
        height="78"
        rx="3"
        fill="var(--surface)"
        stroke="var(--line)"
      />
      <rect
        x="20"
        y="18"
        width="66"
        height="78"
        rx="3"
        fill="var(--surface)"
        stroke="var(--line-strong)"
        transform="rotate(-5 20 18)"
      />
      <rect
        x="40"
        y="26"
        width="54"
        height="34"
        rx="2"
        fill="var(--surface-muted)"
      />
      <circle cx="55" cy="38" r="5" fill="var(--line)" />
      <path
        d="M40 58l15-13 12 10 9-7 18 14v-2H40Z"
        fill="var(--line-strong)"
      />
      <rect x="40" y="68" width="30" height="3" rx="1.5" fill="var(--line-strong)" />
      <rect x="40" y="75" width="42" height="3" rx="1.5" fill="var(--line)" />
      <path
        d="M100 8c5.6 1 9 4.4 10 10 1-5.6 4.4-9 10-10-5.6-1-9-4.4-10-10-1 5.6-4.4 9-10 10Z"
        fill="var(--accent)"
        opacity="0.85"
      />
      <circle
        cx="112"
        cy="74"
        r="12"
        stroke="var(--accent)"
        strokeWidth="1.2"
        opacity="0.45"
      />
    </svg>
  );
}

interface EmptyStateProps {
  title: string;
  description: string;
  action?: ReactNode;
  illustration?: ReactNode;
  className?: string;
  compact?: boolean;
}

export function EmptyState({
  title,
  description,
  action,
  illustration,
  className,
  compact = false,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center text-center",
        compact ? "gap-3 py-6" : "gap-4 rounded-ui border border-dashed border-line-strong bg-surface-muted/40 px-5 py-9",
        className,
      )}
    >
      {illustration ?? (
        <PaperIllustration className={compact ? "h-16 w-24" : undefined} />
      )}
      <div className="flex max-w-[240px] flex-col gap-1.5">
        <p className="text-[13px] font-semibold leading-5 text-ink">{title}</p>
        <p className="text-[11.5px] leading-4 text-ink-muted">{description}</p>
      </div>
      {action ? <div className="pt-0.5">{action}</div> : null}
    </div>
  );
}
