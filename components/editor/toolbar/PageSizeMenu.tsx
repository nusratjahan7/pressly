"use client";

import { ChevronDown, Ruler } from "lucide-react";
import { useEditorStore } from "@/store";
import { findPresetForSize, formatNumber } from "@/lib/units";
import { getSpineWidth } from "@/lib/binding";
import { getEditablePageCount } from "@/lib/spreads";
import { Button } from "@/components/ui/button";

/**
 * Toolbar entry point into the page setup dialog. The dialog owns all editing;
 * this control only shows the current trim and opens it.
 */
export function PageSizeMenu() {
  const project = useEditorStore((state) => state.project);
  const openPageSetup = useEditorStore((state) => state.openPageSetup);

  const preset = findPresetForSize(project.pageSize.w, project.pageSize.h);
  const spine = getSpineWidth(project.pageSize.binding, getEditablePageCount(project.pages));

  return (
    <Button
      variant="secondary"
      size="sm"
      className="h-7 gap-1.5 rounded-full border-line bg-surface-muted/70 px-2.5 text-[11px] font-medium"
      aria-label={`Page setup: ${preset?.label ?? "Custom"}, ${formatNumber(project.pageSize.w, 1)} by ${formatNumber(project.pageSize.h, 1)} millimetres`}
      trailingIcon={ChevronDown}
      onClick={() => openPageSetup("setup")}
    >
      <Ruler
        className="size-3.5 text-ink-subtle"
        strokeWidth={1.75}
        aria-hidden="true"
      />
      <span className="font-semibold text-ink">
        {preset?.label ?? "Custom"}
      </span>
      <span className="hidden text-ink-subtle xl:inline">
        {formatNumber(project.pageSize.w, 1)} ×{" "}
        {formatNumber(project.pageSize.h, 1)} mm
      </span>
      {spine > 0 ? (
        <span className="hidden text-ink-subtle 2xl:inline">
          · spine {formatNumber(spine, 1)} mm
        </span>
      ) : null}
    </Button>
  );
}
