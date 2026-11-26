"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Element, Page, PageSize } from "@/types";
import { usePageSnapshot } from "@/components/editor/thumbnails/usePageSnapshot";
import { PageView } from "@/components/editor/canvas/PageView";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";

interface PageThumbnailProps {
  page: Page;
  pageSize: PageSize;
  height: number;
  extraElements?: Element[];
  className?: string;
}

/**
 * Shows a cached canvas snapshot of the page. Rasterisation is gated by
 * IntersectionObserver so 40+ page issues only render thumbnails near the
 * viewport without blocking initial startup or scrolling.
 */
export function PageThumbnail({
  page,
  pageSize,
  height,
  extraElements = [],
  className,
}: PageThumbnailProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [nearViewport, setNearViewport] = useState(
    () => typeof IntersectionObserver === "undefined",
  );

  useEffect(() => {
    const node = hostRef.current;
    if (!node || typeof IntersectionObserver === "undefined") {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: "240px" },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const width = Math.round((pageSize.w / pageSize.h) * height);
  const effectivePage = useMemo(
    () =>
      extraElements.length > 0 && !page.isEndPaper
        ? { ...page, elements: [...extraElements, ...page.elements] }
        : page,
    [page, extraElements],
  );
  const url = usePageSnapshot(effectivePage, pageSize, width, nearViewport);

  if (!nearViewport) {
    return (
      <div
        ref={hostRef}
        aria-hidden="true"
        className={cn("overflow-hidden bg-surface-muted", className)}
        style={{ width, height }}
      >
        <Skeleton className="h-full w-full" rounded="sm" />
      </div>
    );
  }

  if (!url) {
    return (
      <div ref={hostRef} className={cn("shrink-0", className)}>
        <PageView
          page={page}
          pageSize={pageSize}
          scale={height / pageSize.h}
          extraElements={extraElements}
          decorative
          className={className}
        />
      </div>
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt=""
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      draggable={false}
      aria-hidden="true"
      className={cn("block select-none object-cover", className)}
      style={{ width, height }}
    />
  );
}
