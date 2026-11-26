"use client";

import type { Page, PageSize } from "@/types";
import { usePageSnapshot } from "@/components/editor/thumbnails/usePageSnapshot";
import { PageView } from "@/components/editor/canvas/PageView";
import { cn } from "@/lib/cn";

interface PageThumbnailProps {
  page: Page;
  pageSize: PageSize;
  height: number;
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
  className,
}: PageThumbnailProps) {
  const width = Math.round((pageSize.w / pageSize.h) * height);
  const url = usePageSnapshot(page, pageSize, width);

  if (!url) {
    return (
      <PageView
        page={page}
        pageSize={pageSize}
        scale={height / pageSize.h}
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
