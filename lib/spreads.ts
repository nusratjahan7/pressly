import type { Page } from "@/types";

export interface Spread {
  index: number;
  /** Page array indices. A spread is normally a pair, but a final odd page stands alone. */
  pageIndices: number[];
  isCover: boolean;
}

export const PAGES_PER_SPREAD = 2;

export function getSpreads(pages: Page[]): Spread[] {
  const spreads: Spread[] = [];
  for (let i = 0; i < pages.length; i += PAGES_PER_SPREAD) {
    spreads.push({
      index: spreads.length,
      pageIndices: Array.from(
        { length: Math.min(PAGES_PER_SPREAD, pages.length - i) },
        (_, offset) => i + offset,
      ),
      isCover: i === 0,
    });
  }
  return spreads;
}

export function getSpreadIndexForPage(pageIndex: number) {
  return Math.floor(pageIndex / PAGES_PER_SPREAD);
}

export function clampSpreadIndex(spreadIndex: number, pages: Page[]) {
  const count = Math.max(1, Math.ceil(pages.length / PAGES_PER_SPREAD));
  return Math.min(Math.max(spreadIndex, 0), count - 1);
}

export function getSpreadLabel(spread: Spread, pages: Page[]) {
  if (spread.isCover) return "Cover spread";
  const nums = spread.pageIndices.map((index) => index + 1);
  return nums.length > 1 ? `Pages ${nums[0]}–${nums[1]}` : `Page ${nums[0]}`;
}

export function getShortSpreadLabel(spread: Spread) {
  if (spread.isCover) return "Cover";
  const first = spread.pageIndices[0] + 1;
  const last = spread.pageIndices[spread.pageIndices.length - 1] + 1;
  return first === last ? `Page ${first}` : `Pages ${first}–${last}`;
}

export function getPageLabel(pageIndex: number, pages: Page[]) {
  if (pages.length <= 2) return pageIndex === 0 ? "Front cover" : "Back cover";
  if (pageIndex === 0) return "Front cover";
  if (pageIndex === 1) return "Inside front cover";
  if (pageIndex === pages.length - 1) return "Back cover";
  if (pageIndex === pages.length - 2) return "Inside back cover";
  return `Page ${pageIndex + 1}`;
}
