import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  rounded?: "sm" | "md" | "lg" | "full";
}

const roundedClasses = {
  sm: "rounded-[6px]",
  md: "rounded-[10px]",
  lg: "rounded-ui",
  full: "rounded-full",
};

export function Skeleton({ className, rounded = "md" }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "relative overflow-hidden bg-surface-muted",
        roundedClasses[rounded],
        className,
      )}
    >
      <div className="shimmer absolute inset-0 opacity-60" />
    </div>
  );
}
