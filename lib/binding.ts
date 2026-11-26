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

/** Minimum page count the binding can physically handle. */
export function getBindingMinimumPages(binding: BindingType): number {
  return binding === "saddle-stitch" ? 4 : 32;
}
