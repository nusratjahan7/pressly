"use client";

import { useMemo } from "react";
import type { Element, Page, PageSize } from "@/types";
import { usePageSnapshot } from "@/components/editor/thumbnails/usePageSnapshot";
import { PageView } from "@/components/editor/canvas/PageView";
import { cn } from "@/lib/cn";

interface PageThumbnailProps {
  page: Page;
  pageSize: PageSize;
  height: number;
  extraElements?: Element[];
  className?: string;
}

/**
 * Shows a cached canvas snapshot of the page. Until the snapshot exists (or if
 * rasterising fails) it falls back to the live DOM renderer, so the strip is
 * never blank.
 */
export function PageThumbnail({
  page,
  pageSize,
  height,
  extraElements = [],
  className,
}: PageThumbnailProps) {
  const width = Math.round((pageSize.w / pageSize.h) * height);
  const effectivePage = useMemo(
    () =>
      extraElements.length > 0 && !page.isEndPaper
        ? { ...page, elements: [...extraElements, ...page.elements] }
        : page,
    [page, extraElements],
  );
  const url = usePageSnapshot(effectivePage, pageSize, width);

  if (!url) {
    return (
      <PageView
        page={page}
        pageSize={pageSize}
        scale={height / pageSize.h}
        extraElements={extraElements}
        decorative
        className={className}
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={width}
      height={height}
      draggable={false}
      aria-hidden="true"
      className={cn("block select-none object-cover", className)}
      style={{ width, height }}
    />
  );
}
