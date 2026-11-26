"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { useEditorStore } from "@/store";
import { useActivePage } from "@/store/selectors";
import { getPageLabel } from "@/lib/spreads";
import { LAYOUT_PRESETS } from "@/lib/layouts";
import { PageView } from "@/components/editor/canvas/PageView";
import { PageContext, PanelSection } from "@/components/editor/sidebar/PanelSection";
import { EmptyState } from "@/components/editor/EmptyState";

const PREVIEW_WIDTH = 118;

export function LayoutsPanel() {
  const project = useEditorStore((state) => state.project);
  const addElements = useEditorStore((state) => state.addElements);
  const { page, pageIndex } = useActivePage();

  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";

  const previews = useMemo(
    () =>
      LAYOUT_PRESETS.map((preset) => ({
        preset,
        page: {
          id: `layout-preview-${preset.id}`,
          backgroundId: "paper",
          elements: preset.build({ pageSize: project.pageSize }),
        },
      })),
    [project.pageSize],
  );

  const scale = PREVIEW_WIDTH / project.pageSize.w;
  const previewHeight = project.pageSize.h * scale;

  return (
    <div className="flex flex-col gap-4">
      <PageContext label={pageLabel} />

      <div className="flex items-start gap-2 rounded-field border border-line bg-surface-muted/60 px-2.5 py-2 text-[10.5px] leading-4 text-ink-muted">
        <Info className="mt-0.5 size-3 shrink-0 text-ink-subtle" aria-hidden="true" />
        <p>Frames are added as shapes you can move, resize, or delete.</p>
      </div>

      {!page ? (
        <EmptyState
          title="No page selected"
          description="Select a page to add a frame layout."
          compact
        />
      ) : (
        <PanelSection>
          <div className="grid grid-cols-2 gap-2.5">
            {previews.map(({ preset, page: previewPage }) => (
              <button
                key={preset.id}
                type="button"
                onClick={() =>
                  addElements(
                    page.id,
                    previewPage.elements.map((element) => ({ ...element })),
                  )
                }
                aria-label={`Add ${preset.name} layout frames to ${pageLabel}`}
                className="group flex flex-col overflow-hidden rounded-ui border border-line bg-surface text-left transition-[border-color,box-shadow] duration-150 hover:border-line-strong hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
              >
                <span className="flex items-center justify-center bg-surface-muted/70 p-3">
                  <span
                    className="block overflow-hidden rounded-[2px] shadow-paper ring-1 ring-black/5 transition-transform duration-200 ease-out-soft group-hover:-translate-y-0.5"
                    style={{ width: PREVIEW_WIDTH, height: previewHeight }}
                  >
                    <PageView
                      page={previewPage}
                      pageSize={project.pageSize}
                      scale={scale}
                      decorative
                    />
                  </span>
                </span>
                <span className="flex flex-col gap-0.5 px-2.5 py-2">
                  <span className="text-[11.5px] font-semibold leading-4 text-ink">
                    {preset.name}
                  </span>
                  <span className="line-clamp-2 text-[10px] leading-3.5 text-ink-subtle">
                    {preset.description}
                  </span>
                </span>
              </button>
            ))}
          </div>
        </PanelSection>
      )}
    </div>
  );
}
