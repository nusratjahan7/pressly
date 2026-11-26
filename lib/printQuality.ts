import type { ImageElement, Project } from "@/types";
import { MM_PER_INCH } from "@/lib/units";

export const MIN_PRINT_DPI = 200;

export interface ImageResolutionIssue {
  elementId: string;
  pageId: string;
  alt: string;
  /** Effective resolution once fitted into its frame. */
  dpi: number;
  naturalWidth: number;
  naturalHeight: number;
}

export interface ResolutionReport {
  issues: ImageResolutionIssue[];
  /** Images that could not be measured (missing source or failed decode). */
  unmeasured: number;
  imageCount: number;
}

const dimensionCache = new Map<string, { w: number; h: number } | null>();

function loadDimensions(
  src: string,
): Promise<{ w: number; h: number } | null> {
  const cached = dimensionCache.get(src);
  if (cached !== undefined) return Promise.resolve(cached);

  return new Promise((resolve) => {
    if (typeof window === "undefined" || !src) {
      resolve(null);
      return;
    }
    const image = new window.Image();
    image.onload = () => {
      const value = {
        w: image.naturalWidth,
        h: image.naturalHeight,
      };
      dimensionCache.set(src, value);
      resolve(value);
    };
    image.onerror = () => {
      dimensionCache.set(src, null);
      resolve(null);
    };
    image.src = src;
  });
}

/**
 * Resolution an image actually prints at, given the box it occupies.
 *
 * `cover` crops, so only the visible portion matters and both axes are
 * constrained; `contain` letterboxes, so the tighter of the two scales wins.
 * Either way the limiting axis gives the honest number.
 */
export function getEffectiveDpi(
  element: ImageElement,
  naturalWidth: number,
  naturalHeight: number,
): number {
  if (!naturalWidth || !naturalHeight) return 0;
  const boxWidthIn = element.width / MM_PER_INCH;
  const boxHeightIn = element.height / MM_PER_INCH;
  if (boxWidthIn <= 0 || boxHeightIn <= 0) return 0;

  const dpiX = naturalWidth / boxWidthIn;
  const dpiY = naturalHeight / boxHeightIn;
  return element.fit === "cover" ? Math.max(dpiX, dpiY) : Math.min(dpiX, dpiY);
}

export async function analyzePrintResolution(
  project: Project,
  threshold = MIN_PRINT_DPI,
): Promise<ResolutionReport> {
  const targets: { element: ImageElement; pageId: string }[] = [];
  for (const page of project.pages) {
    for (const element of page.elements) {
      if (element.type === "image" && element.src) {
        targets.push({ element, pageId: page.id });
      }
    }
  }

  const measured = await Promise.all(
    targets.map(async ({ element, pageId }) => {
      const size = await loadDimensions(element.src);
      if (!size) return { element, pageId, dpi: null as number | null };
      return {
        element,
        pageId,
        dpi: Math.round(getEffectiveDpi(element, size.w, size.h)),
      };
    }),
  );

  const issues: ImageResolutionIssue[] = [];
  let unmeasured = 0;
  for (const entry of measured) {
    if (entry.dpi === null) {
      unmeasured += 1;
      continue;
    }
    if (entry.dpi < threshold) {
      issues.push({
        elementId: entry.element.id,
        pageId: entry.pageId,
        alt: entry.element.alt || "Untitled image",
        dpi: entry.dpi,
        naturalWidth: 0,
        naturalHeight: 0,
      });
    }
  }

  return { issues, unmeasured, imageCount: targets.length };
}
