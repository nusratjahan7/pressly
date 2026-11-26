import type { BindingType } from "@/types";
import { round } from "@/lib/units";

/**
 * Assumed paper caliper: 100 gsm uncoated stock is roughly 0.1 mm per leaf.
 * A "leaf" is one physical sheet, i.e. two pages (front and back).
 */
export const PAPER_CALIPER_MM = 0.1;

/** Cover boards plus the hinge gap added to a hardcover spine. */
export const HARDBOARD_ALLOWANCE_MM = 6;

export interface BindingDefinition {
  id: BindingType;
  name: string;
  description: string;
}

export const BINDING_TYPES: BindingDefinition[] = [
  {
    id: "saddle-stitch",
    name: "Saddle stitch",
    description: "Stapled through the fold. No measurable spine.",
  },
  {
    id: "perfect-bound",
    name: "Perfect bound",
    description: "Glued square spine. Best for 40+ pages.",
  },
  {
    id: "hardcover",
    name: "Hardcover",
    description: "Sewn case binding with rigid boards.",
  },
];

export function getBinding(binding: BindingType): BindingDefinition {
  return BINDING_TYPES.find((entry) => entry.id === binding) ?? BINDING_TYPES[1]!;
}

/**
 * Spine thickness for a given binding and page count.
 *
 * Saddle stitch is folded rather than stacked, so it has no spine width.
 * The other two multiply the leaf count by the paper caliper; hardcover adds
 * the board allowance that the case adds on either side of the block.
 */
export function getSpineWidth(binding: BindingType, pageCount: number): number {
  const leaves = Math.max(0, Math.ceil(pageCount / 2));
  if (binding === "saddle-stitch") return 0;
  const block = leaves * PAPER_CALIPER_MM;
  if (binding === "perfect-bound") return round(block, 2);
  return round(block + HARDBOARD_ALLOWANCE_MM, 2);
}

/**
 * Visual spine width in millimetres for rendering Spread 0 as a single wide
 * wrap-around cover (back cover | spine | front cover) even on thin books.
 */
export function getCoverDisplaySpineWidth(
  binding: BindingType,
  pageCount: number,
): number {
  const physical = getSpineWidth(binding, pageCount);
  if (binding === "saddle-stitch") return Math.max(4, physical);
  return Math.max(10, physical);
}

/** Minimum page count the binding can physically handle. */
export function getBindingMinimumPages(binding: BindingType): number {
  return binding === "saddle-stitch" ? 4 : 32;
}

export interface BindingLimits {
  min: number;
  max: number;
  /**
   * Saddle stitch is folded from signatures, so pages must divide evenly into
   * groups of four. `null` means any even count is acceptable.
   */
  signature: number | null;
}

export const BINDING_LIMITS: Record<BindingType, BindingLimits> = {
  "saddle-stitch": { min: 4, max: 64, signature: 4 },
  "perfect-bound": { min: 32, max: 800, signature: null },
  hardcover: { min: 32, max: 500, signature: null },
};

export function getBindingLimits(binding: BindingType): BindingLimits {
  return BINDING_LIMITS[binding];
}

export type PageCountLevel = "ok" | "warning" | "error";

export interface PageCountStatus {
  level: PageCountLevel;
  message: string | null;
}

/**
 * Validates the page count against what the chosen binding can produce.
 * Messages are written for the editor, not for print engineers.
 */
export function validatePageCount(
  binding: BindingType,
  pageCount: number,
): PageCountStatus {
  const limits = getBindingLimits(binding);
  const name = getBinding(binding).name;

  if (pageCount < limits.min) {
    const short = limits.min - pageCount;
    return {
      level: "error",
      message: `${name} needs at least ${limits.min} pages. Add ${short} more.`,
    };
  }

  if (pageCount > limits.max) {
    const over = pageCount - limits.max;
    return {
      level: "error",
      message: `${name} supports at most ${limits.max} pages. Remove ${over}.`,
    };
  }

  if (limits.signature && pageCount % limits.signature !== 0) {
    const nextMultiple = Math.ceil(pageCount / limits.signature) * limits.signature;
    return {
      level: "warning",
      message: `${name} folds in groups of ${limits.signature}. ${pageCount} pages leaves a partial signature; ${nextMultiple} would be even.`,
    };
  }

  return { level: "ok", message: null };
}

export function canAddSpread(binding: BindingType, pageCount: number) {
  return pageCount + 2 <= getBindingLimits(binding).max;
}
