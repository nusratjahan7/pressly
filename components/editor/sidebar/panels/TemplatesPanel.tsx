"use client";

import { useMemo } from "react";
import { Info } from "lucide-react";
import { useEditorStore } from "@/store";
import { useActivePage } from "@/store/selectors";
import { getPageLabel } from "@/lib/spreads";
import { PAGE_TEMPLATES } from "@/lib/templates";
import { PageView } from "@/components/editor/canvas/PageView";
import { PageContext, PanelSection } from "@/components/editor/sidebar/PanelSection";
import { EmptyState } from "@/components/editor/EmptyState";

const PREVIEW_WIDTH = 118;

export function TemplatesPanel() {
  const project = useEditorStore((state) => state.project);
  const applyPageTemplate = useEditorStore((state) => state.applyPageTemplate);
  const { page, pageIndex } = useActivePage();

  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";

  const previews = useMemo(
    () =>
      PAGE_TEMPLATES.map((template) => ({
        template,
        page: {
          id: `template-preview-${template.id}`,
          backgroundId: template.backgroundId,
          elements: template.build({
            projectName: project.name,
            pageSize: project.pageSize,
          }),
        },
      })),
    [project.name, project.pageSize],
  );

  const scale = PREVIEW_WIDTH / project.pageSize.w;
  const previewHeight = project.pageSize.h * scale;

  return (
    <div className="flex flex-col gap-4">
      <PageContext label={pageLabel} />

      <div className="flex items-start gap-2 rounded-field border border-line bg-surface-muted/60 px-2.5 py-2 text-[10.5px] leading-4 text-ink-muted">
        <Info className="mt-0.5 size-3 shrink-0 text-ink-subtle" aria-hidden="true" />
        <p>
          Applying a template replaces this page. Undo is always available.
        </p>
      </div>

      {!page || page.isEndPaper || page.locked ? (
        <EmptyState
          title={page ? "Page is locked" : "No page selected"}
          description="Select an editable page to apply a template."
          compact
        />
      ) : (
        <PanelSection>
          <div className="grid grid-cols-2 gap-2.5">
            {previews.map(({ template, page: previewPage }) => (
              <button
                key={template.id}
                type="button"
                onClick={() => applyPageTemplate(page.id, template)}
                aria-label={`Apply ${template.name} template to ${pageLabel}`}
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
                    {template.name}
                  </span>
                  <span className="line-clamp-2 text-[10px] leading-3.5 text-ink-subtle">
                    {template.description}
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
