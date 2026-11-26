import { cn } from "@/lib/cn";

export function PresslyMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex size-7 shrink-0 items-center justify-center rounded-[9px] bg-accent text-accent-ink shadow-sm",
        className,
      )}
    >
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
        className="size-[18px]"
      >
        <rect
          x="3.1"
          y="3.2"
          width="7.4"
          height="11.6"
          rx="1.2"
          fill="currentColor"
          opacity="0.55"
          transform="rotate(-7 3.1 3.2)"
        />
        <rect
          x="8.9"
          y="4.7"
          width="7.4"
          height="11.6"
          rx="1.2"
          fill="currentColor"
        />
        <path
          d="M11.1 7.7h2.9M11.1 10h2.9M11.1 12.3h2.1"
          stroke="var(--accent)"
          strokeWidth="0.9"
          strokeLinecap="round"
          opacity="0.9"
        />
      </svg>
    </span>
  );
}
