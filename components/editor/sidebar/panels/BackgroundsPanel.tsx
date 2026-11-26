"use client";

import { useState } from "react";
import { Check } from "lucide-react";
import { useEditorStore } from "@/store";
import { useActivePage, useCurrentSpread } from "@/store/selectors";
import { BACKGROUNDS } from "@/lib/backgrounds";
import { getPageLabel } from "@/lib/spreads";
import { PageContext, PanelSection } from "@/components/editor/sidebar/PanelSection";
import { Toggle } from "@/components/ui/toggle";
import { cn } from "@/lib/cn";

export function BackgroundsPanel() {
  const project = useEditorStore((state) => state.project);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const setPageBackground = useEditorStore((state) => state.setPageBackground);
  const { page, pageIndex } = useActivePage();
  const { spread } = useCurrentSpread();
  const [applyToSpread, setApplyToSpread] = useState(false);

  const editableInSpread =
    spread?.pageIndices
      .map((index) => project.pages[index])
      .filter(
        (candidate): candidate is NonNullable<typeof candidate> =>
          Boolean(candidate && !candidate.isEndPaper && !candidate.locked),
      ) ?? [];

  const canApplyToSpread = editableInSpread.length >= 2;

  const targets =
    applyToSpread && canApplyToSpread
      ? editableInSpread
      : page && !page.isEndPaper && !page.locked
        ? [page]
        : [];

  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";

  const apply = (backgroundId: string) => {
    if (targets.length === 0) return;
    const changed = targets.filter(
      (target) => target.backgroundId !== backgroundId,
    );
    if (changed.length === 0) return;
    pushHistory();
    changed.forEach((target) =>
      setPageBackground(target.id, backgroundId, { commit: false }),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageContext
        label={pageLabel}
        suffix={
          targets.length > 1 ? `${targets.length} pages` : undefined
        }
      />

      <PanelSection
        title="Paper & pattern"
        description="Backgrounds sit beneath every element and print edge to edge."
      >
        <div className="grid grid-cols-3 gap-2">
          {BACKGROUNDS.map((background) => {
            const selected =
              targets.length > 0 &&
              targets.every((target) => target.backgroundId === background.id);
            return (
              <button
                key={background.id}
                type="button"
                onClick={() => apply(background.id)}
                aria-pressed={selected}
                aria-label={`Apply ${background.name} background`}
                className={cn(
                  "group flex flex-col gap-1.5 rounded-field text-left transition-transform duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface active:scale-[0.99]",
                )}
              >
                <span
                  className={cn(
                    "relative flex aspect-[4/5] w-full items-center justify-center overflow-hidden rounded-field border shadow-sm transition-[border-color,box-shadow] duration-150",
                    selected
                      ? "border-accent ring-2 ring-accent/25"
                      : "border-line group-hover:border-line-strong",
                  )}
                  style={background.style}
                >
                  {selected ? (
                    <span className="absolute right-1.5 top-1.5 flex size-5 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm">
                      <Check className="size-3" strokeWidth={2.5} aria-hidden="true" />
                    </span>
                  ) : null}
                </span>
                <span
                  className={cn(
                    "truncate text-[11px] font-medium",
                    selected ? "text-ink" : "text-ink-muted",
                  )}
                >
                  {background.name}
                </span>
              </button>
            );
          })}
        </div>
      </PanelSection>

      <div className="rounded-field border border-line bg-surface-muted/50 p-3">
        <Toggle
          label="Apply to entire spread"
          description={
            canApplyToSpread
              ? "Changes both pages in this spread together."
              : "This spread has only one editable page."
          }
          checked={applyToSpread && canApplyToSpread}
          onCheckedChange={setApplyToSpread}
          disabled={!canApplyToSpread}
        />
      </div>
    </div>
  );
}
