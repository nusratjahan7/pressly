import type { Page } from "@/types";

/**
 * A printed book spread.
 *
 * Layout of the page array (never stored separately — always derived):
 *   [0] back cover   [1] front cover        → spread 0, "Cover"
 *   [2] end paper    [3] page 1             → spread 1, "Page 1"
 *   [4] page 2       [5] page 3             → spread 2, "Pages 2–3"
 *   …
 *   [n-2] page N     [n-1] end paper        → final spread, "Page N"
 */
export interface Spread {
  index: number;
  /** Page array indices. Two for a normal spread, one for a lone page. */
  pageIndices: number[];
  isCover: boolean;
  /** The first interior spread, which carries the inside front end paper. */
  isFirstContent: boolean;
  /** The final spread, which carries the inside back end paper. */
  isLast: boolean;
}

export const PAGES_PER_SPREAD = 2;
/** Back cover + front cover. */
export const COVER_PAGE_COUNT = 2;
/** Inside front and inside back end papers. */
export const END_PAPER_COUNT = 2;

/**
 * Derives spreads from the page array. This is the single source of truth for
 * spread structure — nothing stores spread boundaries.
 */
export function getSpreads(pages: Page[]): Spread[] {
  const spreads: Spread[] = [];
  for (let i = 0; i < pages.length; i += PAGES_PER_SPREAD) {
    const pageIndices = Array.from(
      { length: Math.min(PAGES_PER_SPREAD, pages.length - i) },
      (_, offset) => i + offset,
    );
    spreads.push({
      index: spreads.length,
      pageIndices,
      isCover: i === 0,
      isFirstContent: i === COVER_PAGE_COUNT,
      isLast: false,
    });
  }
  if (spreads.length > 0) {
    const last = spreads[spreads.length - 1]!;
    if (!last.isCover) last.isLast = true;
  }
  return spreads;
}

/**
 * Page number printed on a page, or null for the cover and end papers.
 *
 * Numbering is computed from index among editable content pages: page 1 is the
 * right side of spread 1, followed sequentially through page N on the left side
 * of the final spread.
 */
export function getPageNumber(pageIndex: number, pages: Page[]): number | null {
  const page = pages[pageIndex];
  if (!page) return null;
  if (page.coverSide || page.isEndPaper) return null;

  let number = 0;
  for (let i = 0; i <= pageIndex; i += 1) {
    const candidate = pages[i];
    if (candidate && !candidate.coverSide && !candidate.isEndPaper) {
      number += 1;
    }
  }
  return number > 0 ? number : null;
}

/** Number of editable content pages, excluding cover and end papers. */
export function getEditablePageCount(pages: Page[]) {
  return pages.filter((page) => !page.isEndPaper && !page.coverSide).length;
}

export function getSpreadIndexForPage(pageIndex: number) {
  return Math.floor(pageIndex / PAGES_PER_SPREAD);
}

export function clampSpreadIndex(spreadIndex: number, pages: Page[]) {
  const count = Math.max(1, Math.ceil(pages.length / PAGES_PER_SPREAD));
  return Math.min(Math.max(spreadIndex, 0), count - 1);
}

function spreadPageNumbers(spread: Spread, pages: Page[]) {
  return spread.pageIndices
    .map((index) => getPageNumber(index, pages))
    .filter((value): value is number => value !== null);
}

/** Display label, e.g. "Cover spread", "Page 1", "Pages 2–3". */
export function getSpreadLabel(spread: Spread, pages: Page[]) {
  if (spread.isCover) return "Cover spread";
  const numbers = spreadPageNumbers(spread, pages);
  if (numbers.length === 0) return "End papers";
  const first = numbers[0]!;
  const last = numbers[numbers.length - 1]!;
  return first === last ? `Page ${first}` : `Pages ${first}–${last}`;
}

/** Compact label used in the thumbnail strip. */
export function getShortSpreadLabel(spread: Spread, pages: Page[]) {
  if (spread.isCover) return "Cover";
  const numbers = spreadPageNumbers(spread, pages);
  if (numbers.length === 0) return "End papers";
  const first = numbers[0]!;
  const last = numbers[numbers.length - 1]!;
  return first === last ? `Page ${first}` : `Pages ${first}–${last}`;
}

export function getPageLabel(pageIndex: number, pages: Page[]) {
  const page = pages[pageIndex];
  if (!page) return "a page";
  if (page.coverSide === "back") return "Back cover";
  if (page.coverSide === "front") return "Front cover";
  if (page.isEndPaper) {
    return pageIndex < pages.length / 2
      ? "Inside front cover"
      : "Inside back cover";
  }
  const number = getPageNumber(pageIndex, pages);
  return number === null ? "Page" : `Page ${number}`;
}
