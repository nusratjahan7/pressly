"use client";

import type { CSSProperties } from "react";
import type { Page, PageSize } from "@/types";
import { getBackground } from "@/lib/backgrounds";
import { useEditorStore } from "@/store";
import { ElementView } from "@/components/editor/canvas/ElementView";
import { cn } from "@/lib/cn";

interface PageViewProps {
  page: Page;
  pageSize: PageSize;
  scale: number;
  interactive?: boolean;
  selectedElementId?: string | null;
  decorative?: boolean;
  className?: string;
}

export function PageView({
  page,
  pageSize,
  scale,
  interactive = false,
  selectedElementId = null,
  decorative = false,
  className,
}: PageViewProps) {
  const selectPage = useEditorStore((state) => state.selectPage);
  const background = getBackground(page.backgroundId);

  const width = pageSize.w * scale;
  const height = pageSize.h * scale;

  const backgroundStyle: CSSProperties = {
    ...background.style,
    width,
    height,
  };

  const elements = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);

  return (
    <div
      data-page-id={page.id}
      role={decorative ? undefined : "group"}
      aria-label={
        decorative ? undefined : `Page with ${page.elements.length} elements`
      }
      aria-hidden={decorative || undefined}
      className={cn(
        "relative shrink-0 overflow-hidden",
        interactive && "cursor-default",
        className,
      )}
      style={backgroundStyle}
      onPointerDown={
        interactive
          ? () => {
              selectPage(page.id);
            }
          : undefined
      }
    >
      {elements.map((element) => (
        <ElementView
          key={element.id}
          element={element}
          pageId={page.id}
          pageSize={pageSize}
          scale={scale}
          interactive={interactive}
          selected={selectedElementId === element.id}
        />
      ))}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-black/[0.06]"
      />
    </div>
  );
}
