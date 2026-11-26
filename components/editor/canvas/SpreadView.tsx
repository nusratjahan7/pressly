import type { Page, PageSize } from "@/types";
import { getBackground } from "@/lib/backgrounds";
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
  isCover?: boolean;
  spineWidth?: number;
  spineText?: string;
  className?: string;
}

export function SpreadView({
  items,
  pageSize,
  scale,
  variant = "edit",
  selectedElementId = null,
  showLabels = false,
  isCover = false,
  spineWidth = 0,
  spineText = "",
  className,
}: SpreadViewProps) {
  if (items.length === 0) return null;

  const interactive = variant === "edit";
  const decorative = variant === "thumbnail";
  const pageWidth = pageSize.w * scale;
  const pageHeight = pageSize.h * scale;
  const spinePx = isCover && spineWidth > 0 ? Math.max(4, spineWidth * scale) : 0;
  const spineBg = items[0] ? getBackground(items[0].page.backgroundId) : null;
  const spineColor = spineBg?.baseColor ?? "#122056";
  const spineCreaseClass =
    spineBg?.tone === "dark" ? "border-white/15" : "border-[#122056]/15";
  const spineTextClass =
    spineBg?.tone === "dark" ? "text-white/70" : "text-[#122056]/65";
  const showFadedBlankHalf = !isCover && items.length === 1;

  return (
    <div className={cn("flex flex-col items-center", className)}>
      <div className="relative flex items-start">
        {items[0] ? (
          <PageView
            key={items[0].page.id}
            page={items[0].page}
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
        ) : null}

        {spinePx > 0 ? (
          <div
            aria-hidden="true"
            className={cn(
              "relative flex shrink-0 items-center justify-center overflow-hidden border-x",
              spineCreaseClass,
            )}
            style={{
              width: spinePx,
              height: pageHeight,
              backgroundColor: spineColor,
              backgroundImage:
                "linear-gradient(to right, rgba(0,0,0,0.22), rgba(255,255,255,0.08) 50%, rgba(0,0,0,0.22))",
            }}
          >
            {spinePx >= 10 && spineText ? (
              <span
                className={cn(
                  "truncate whitespace-nowrap text-[8px] font-semibold tracking-[0.08em]",
                  spineTextClass,
                )}
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  maxHeight: pageHeight * 0.72,
                  fontSize: Math.min(10, Math.max(6, spinePx * 0.55)),
                }}
              >
                {spineText}
              </span>
            ) : null}
          </div>
        ) : null}

        {items[1] ? (
          <PageView
            key={items[1].page.id}
            page={items[1].page}
            pageSize={pageSize}
            scale={scale}
            interactive={interactive}
            selectedElementId={selectedElementId}
            decorative={decorative}
            extraElements={
              items[0] && !items[0].page.isEndPaper
                ? items[0].page.elements
                    .filter((el) => el.spanSpread)
                    .map((el) => ({ ...el, x: el.x - pageSize.w }))
                : []
            }
            className={cn(
              "rounded-[2px]",
              variant !== "thumbnail" && "shadow-paper",
            )}
          />
        ) : showFadedBlankHalf ? (
          <div
            aria-hidden="true"
            className="shrink-0 rounded-[2px] border border-dashed border-white/15 bg-[#262A3C]/30"
            style={{ width: pageWidth, height: pageHeight }}
          />
        ) : null}

        {(items.length === 2 || showFadedBlankHalf) &&
        spinePx === 0 &&
        variant !== "thumbnail" ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-y-0 left-1/2 w-12 -translate-x-1/2 bg-gradient-to-r from-transparent via-black/[0.08] to-transparent"
          />
        ) : null}
      </div>
      {showLabels ? (
        <div className="mt-3 flex items-start">
          {items[0] ? (
            <div
              key={items[0].page.id}
              className="whitespace-nowrap text-center text-[8px] font-medium uppercase tracking-[0.08em] text-ink-subtle sm:text-[10px] sm:tracking-[0.14em]"
              style={{ width: pageWidth }}
            >
              {items[0].label ?? `Page ${items[0].pageIndex + 1}`}
            </div>
          ) : null}
          {spinePx > 0 ? (
            <div style={{ width: spinePx }} aria-hidden="true" />
          ) : null}
          {items[1] ? (
            <div
              key={items[1].page.id}
              className="whitespace-nowrap text-center text-[8px] font-medium uppercase tracking-[0.08em] text-ink-subtle sm:text-[10px] sm:tracking-[0.14em]"
              style={{ width: pageWidth }}
            >
              {items[1].label ?? `Page ${items[1].pageIndex + 1}`}
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
