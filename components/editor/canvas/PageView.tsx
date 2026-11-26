"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type { Element, Page, PageSize } from "@/types";
import { resolvePageBackground } from "@/lib/backgrounds";
import { getCachedMediaUrl, resolveMediaUrl } from "@/lib/mediaStorage";
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
  extraElements?: Element[];
  className?: string;
}

export function PageView({
  page,
  pageSize,
  scale,
  interactive = false,
  selectedElementId = null,
  decorative = false,
  extraElements = [],
  className,
}: PageViewProps) {
  const selectPage = useEditorStore((state) => state.selectPage);
  const background = resolvePageBackground(page);
  const isEndPaper = Boolean(page.isEndPaper);
  const isLocked = Boolean(page.locked || isEndPaper);

  const [bgImgUrl, setBgImgUrl] = useState<string>(() =>
    background.imageSrc ? (getCachedMediaUrl(background.imageSrc) ?? "") : "",
  );
  useEffect(() => {
    let alive = true;
    if (!background.imageSrc) {
      setBgImgUrl("");
      return;
    }
    void resolveMediaUrl(background.imageSrc).then((url) => {
      if (alive) setBgImgUrl(url);
    });
    return () => {
      alive = false;
    };
  }, [background.imageSrc]);

  const width = pageSize.w * scale;
  const height = pageSize.h * scale;

  const backgroundStyle: CSSProperties = isEndPaper
    ? {
        backgroundColor: "#262A3C",
        width,
        height,
      }
    : {
        backgroundColor: "#FFFFFF",
        width,
        height,
      };

  const elements = isEndPaper
    ? []
    : [...extraElements, ...page.elements]
        .filter((el) => !el.hidden)
        .sort((a, b) => a.zIndex - b.zIndex);
  const canInteract = interactive && !isLocked;

  return (
    <div
      data-page-id={page.id}
      role={decorative ? undefined : "group"}
      aria-label={
        decorative
          ? undefined
          : isEndPaper
            ? "Inside cover end paper, not editable"
            : `Page with ${page.elements.length} elements`
      }
      aria-hidden={decorative || undefined}
      className={cn(
        "relative shrink-0 overflow-hidden",
        canInteract && "cursor-default",
        className,
      )}
      style={backgroundStyle}
      onPointerDown={
        canInteract
          ? () => {
              selectPage(page.id);
            }
          : undefined
      }
    >
      {!isEndPaper ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{
            ...background.style,
            opacity: background.opacity,
            filter:
              background.blur > 0
                ? `blur(${Math.max(0.5, background.blur * scale * 0.35)}px)`
                : undefined,
            transform: background.blur > 0 ? "scale(1.06)" : undefined,
          }}
        >
          {bgImgUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={bgImgUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : null}
        </div>
      ) : null}
      {elements.map((element) => (
        <ElementView
          key={element.id}
          element={element}
          pageId={page.id}
          pageSize={pageSize}
          scale={scale}
          interactive={canInteract}
          selected={selectedElementId === element.id}
        />
      ))}
      {isLocked ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 flex select-none items-center justify-center px-3 text-center",
            !isEndPaper && "bg-[#122056]/[0.08]",
          )}
        >
          <span
            className={cn(
              "font-medium leading-tight",
              isEndPaper ? "text-[#EEF0FE]/60" : "text-[#565E8E]/85",
            )}
            style={{ fontSize: Math.max(7, Math.round(pageSize.w * scale * 0.048)) }}
          >
            {isEndPaper ? "This page can not be edited" : "This page is locked"}
          </span>
        </div>
      ) : null}
      <span
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 ring-1 ring-inset",
          isEndPaper ? "ring-white/[0.08]" : "ring-black/[0.06]",
        )}
      />
    </div>
  );
}
