import type { Page, PageSize } from "@/types";
import { PageView } from "@/components/editor/canvas/PageView";
import { cn } from "@/lib/cn";

export type SpreadViewVariant = "edit" | "preview" | "thumbnail";

interface SpreadItem {
  page: Page;
  pageIndex: number;
  label?: string;
}

interface SpreadViewProps {
  items: SpreadItem[];
  pageSize: PageSize;
  scale: number;
  variant?: SpreadViewVariant;
  selectedElementId?: string | null;
  showLabels?: boolean;
  className?: string;
}

export function SpreadView({
  items,
  pageSize,
  scale,
  variant = "edit",
  selectedElementId = null,
  showLabels = false,
  className,
}: SpreadViewProps) {
  if (items.length === 0) return null;

  const interactive = variant === "edit";
  const decorative = variant === "thumbnail";
  const pageWidth = pageSize.w * scale;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative flex items-start">
        {items.map((item) => (
          <PageView
            key={item.page.id}
            page={item.page}
            pageSize={pageSize}
            scale={scale}
            interactive={interactive}
            selectedElementId={selectedElementId}
            decorative={decorative}
            className={cn(
              "rounded-[2px]",
              variant !== "thumbnail" && "shadow-paper",
            )}
          />
        ))}
        {items.length === 2 && variant !== "thumbnail" ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/[0.08] to-transparent"
          />
        ) : null}
      </div>
      {showLabels ? (
        <div className="mt-3 flex items-start">
          {items.map((item) => (
            <div
              key={item.page.id}
              className="whitespace-nowrap text-center text-[8px] font-medium uppercase tracking-[0.08em] text-ink-subtle sm:text-[10px] sm:tracking-[0.14em]"
              style={{
                width: pageWidth,
              }}
            >
              {item.label ?? `Page ${item.pageIndex + 1}`}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
