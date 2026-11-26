"use client";

import { useEffect, useMemo, useState } from "react";
import { BookOpen, Layers, Sparkles } from "lucide-react";
import { ensureGoogleFontLoaded } from "@/lib/fonts";
import { useEditorStore } from "@/store";
import { useCurrentSpread } from "@/store/selectors";
import { getSpreadLabel, getSpreads } from "@/lib/spreads";
import {
  MAGAZINE_TEMPLATES,
  TEMPLATE_THEMES,
  type MagazineTemplate,
  type TemplateTheme,
} from "@/lib/templates";
import { PageView } from "@/components/editor/canvas/PageView";
import { PanelSection } from "@/components/editor/sidebar/PanelSection";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

type ThemeFilter = "All" | TemplateTheme;

const COVER_THUMB_W = 84;
const SPREAD_PAGE_THUMB_W = 56;

export function TemplatesPanel() {
  const project = useEditorStore((state) => state.project);
  const applyMagazineTemplate = useEditorStore(
    (state) => state.applyMagazineTemplate,
  );
  const { spread, spreadIndex } = useCurrentSpread();

  const [themeFilter, setThemeFilter] = useState<ThemeFilter>("All");
  const [confirmTemplate, setConfirmTemplate] =
    useState<MagazineTemplate | null>(null);
  const [selectedTplSpreadIdx, setSelectedTplSpreadIdx] = useState<number>(0);

  useEffect(() => {
    for (const tpl of MAGAZINE_TEMPLATES) {
      const front = tpl.project.pages[1];
      if (!front) continue;
      for (const el of front.elements) {
        if (el.type === "text") {
          ensureGoogleFontLoaded(
            el.fontFamily,
            el.fontWeight,
            el.fontStyle === "italic",
          );
        }
      }
    }
  }, []);

  const filtered = useMemo(() => {
    if (themeFilter === "All") return MAGAZINE_TEMPLATES;
    return MAGAZINE_TEMPLATES.filter((t) => t.theme === themeFilter);
  }, [themeFilter]);

  const currentSpreadEditable = useMemo(() => {
    if (!spread) return false;
    return spread.pageIndices.some((idx) => {
      const p = project.pages[idx];
      return Boolean(p && !p.isEndPaper && !p.locked);
    });
  }, [spread, project.pages]);

  const openConfirm = (template: MagazineTemplate) => {
    const tplSpreads = getSpreads(template.project.pages);
    const defaultIdx = spread?.isCover
      ? 0
      : Math.min(Math.max(1, spreadIndex), Math.max(0, tplSpreads.length - 1));
    setSelectedTplSpreadIdx(defaultIdx);
    setConfirmTemplate(template);
  };

  const confirmTplSpreads = useMemo(
    () => (confirmTemplate ? getSpreads(confirmTemplate.project.pages) : []),
    [confirmTemplate],
  );

  const scaleCover = COVER_THUMB_W / (confirmTemplate?.project.pageSize.w ?? 210);
  const scaleSpreadHalf = SPREAD_PAGE_THUMB_W / 210;

  return (
    <div className="flex flex-col gap-4">
      {/* Theme chips */}
      <div className="flex flex-wrap gap-1.5">
        {(["All", ...TEMPLATE_THEMES] as ThemeFilter[]).map((theme) => {
          const active = themeFilter === theme;
          return (
            <button
              key={theme}
              type="button"
              onClick={() => setThemeFilter(theme)}
              aria-pressed={active}
              className={cn(
                "rounded-full border px-2.5 py-1 text-[10.5px] font-medium transition-colors",
                active
                  ? "border-accent bg-accent text-accent-ink"
                  : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
              )}
            >
              {theme}
            </button>
          );
        })}
      </div>

      <PanelSection
        title="Magazine themes"
        description={`${filtered.length} full issues · Cover + inner spreads`}
      >
        <div className="grid grid-cols-2 gap-2.5">
          {filtered.map((template) => {
            const tplPages = template.project.pages;
            const backCover = tplPages[0];
            const frontCover = tplPages[1] ?? tplPages[0]!;
            const tplSize = template.project.pageSize;
            const covScale = 96 / tplSize.w;

            return (
              <button
                key={template.id}
                type="button"
                onClick={() => openConfirm(template)}
                className="group flex flex-col overflow-hidden rounded-ui border border-line bg-surface text-left transition-[border-color,box-shadow] duration-150 hover:border-accent hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              >
                <div className="flex items-center justify-center bg-surface-muted/65 px-2 py-3">
                  {/* Front cover mini with spine bar */}
                  <div className="flex overflow-hidden rounded-[2px] shadow-paper ring-1 ring-black/10 transition-transform duration-200 group-hover:-translate-y-0.5">
                    <span
                      aria-hidden="true"
                      className="w-1.5 shrink-0 border-r border-black/10"
                      style={{
                        backgroundColor:
                          template.palette[0] ??
                          (backCover?.backgroundId === "ink" ? "#122056" : "#EFE7DC"),
                      }}
                    />
                    <div
                      style={{
                        width: 96,
                        height: tplSize.h * covScale,
                      }}
                    >
                      <PageView
                        page={frontCover}
                        pageSize={tplSize}
                        scale={covScale}
                        decorative
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-col gap-0.5 px-2.5 py-2">
                  <span className="truncate text-[11px] font-semibold text-ink">
                    {template.name}
                  </span>
                  <div className="flex items-center justify-between gap-1">
                    <span className="truncate text-[9px] font-medium text-ink-subtle">
                      {template.theme}
                    </span>
                    <span className="flex shrink-0 items-center gap-0.5">
                      {template.palette.slice(0, 3).map((hex, i) => (
                        <span
                          key={`${template.id}-swatch-${i}`}
                          className="size-2 rounded-full ring-1 ring-black/15"
                          style={{ backgroundColor: hex }}
                          aria-hidden="true"
                        />
                      ))}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </PanelSection>

      {/* Confirm apply dialog (Replace issue vs. Apply to current spread only) */}
      <Modal
        open={Boolean(confirmTemplate)}
        onClose={() => setConfirmTemplate(null)}
        title={confirmTemplate?.name ?? "Apply template"}
        description={
          confirmTemplate
            ? `${confirmTemplate.theme} · ${confirmTemplate.typography}`
            : undefined
        }
        size="md"
        footer={
          confirmTemplate ? (
            <div className="flex w-full flex-wrap items-center justify-between gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setConfirmTemplate(null)}
              >
                Cancel
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  leadingIcon={Layers}
                  disabled={!currentSpreadEditable}
                  onClick={() => {
                    applyMagazineTemplate(confirmTemplate.id, "spread", {
                      targetSpreadIndex: spreadIndex,
                      templateSpreadIndex: selectedTplSpreadIdx,
                    });
                    setConfirmTemplate(null);
                  }}
                >
                  Apply to current spread only
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  leadingIcon={BookOpen}
                  onClick={() => {
                    applyMagazineTemplate(confirmTemplate.id, "replace");
                    setConfirmTemplate(null);
                  }}
                >
                  Replace entire issue
                </Button>
              </div>
            </div>
          ) : null
        }
      >
        {confirmTemplate ? (
          <div className="flex flex-col gap-3.5">
            <div className="flex items-center justify-center gap-4 rounded-ui border border-line bg-surface-muted/50 p-3.5">
              <div
                className="overflow-hidden rounded-[2px] shadow-paper ring-1 ring-black/10"
                style={{
                  width: COVER_THUMB_W,
                  height: confirmTemplate.project.pageSize.h * scaleCover,
                }}
              >
                <PageView
                  page={
                    confirmTemplate.project.pages[1] ??
                    confirmTemplate.project.pages[0]!
                  }
                  pageSize={confirmTemplate.project.pageSize}
                  scale={scaleCover}
                  decorative
                />
              </div>
              {confirmTemplate.project.pages[4] &&
              confirmTemplate.project.pages[5] ? (
                <div className="flex overflow-hidden rounded-[2px] shadow-paper ring-1 ring-black/10">
                  <PageView
                    page={confirmTemplate.project.pages[4]}
                    pageSize={confirmTemplate.project.pageSize}
                    scale={scaleSpreadHalf}
                    decorative
                  />
                  <PageView
                    page={confirmTemplate.project.pages[5]}
                    pageSize={confirmTemplate.project.pageSize}
                    scale={scaleSpreadHalf}
                    extraElements={confirmTemplate.project.pages[4].elements
                      .filter((el) => Boolean(el.spanSpread))
                      .map((el) => ({
                        ...el,
                        x: el.x - confirmTemplate.project.pageSize.w,
                      }))}
                    decorative
                  />
                </div>
              ) : null}
            </div>

            <div className="flex items-center justify-between gap-2 text-[11px] text-ink-muted">
              <span className="flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-accent" aria-hidden="true" />
                Cohesive palette &amp; font pairing included
              </span>
              <span className="flex items-center gap-1">
                {confirmTemplate.palette.map((hex, i) => (
                  <span
                    key={`modal-swatch-${i}`}
                    className="size-3 rounded-full ring-1 ring-black/15"
                    style={{ backgroundColor: hex }}
                  />
                ))}
              </span>
            </div>

            {currentSpreadEditable && confirmTplSpreads.length > 0 ? (
              <div className="flex flex-col gap-1.5 rounded-field border border-line bg-surface-muted/40 p-2.5">
                <span className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                  If applying to{" "}
                  {spread
                    ? getSpreadLabel(spread, project.pages)
                    : "current spread"}
                  , use template spread:
                </span>
                <div className="flex flex-wrap gap-1">
                  {confirmTplSpreads.map((sp, idx) => {
                    const label = sp.isCover
                      ? "Cover"
                      : sp.isFirstContent
                        ? "Page 1"
                        : `Spread ${idx}`;
                    const active = selectedTplSpreadIdx === idx;
                    return (
                      <button
                        key={`tpl-sp-${idx}`}
                        type="button"
                        onClick={() => setSelectedTplSpreadIdx(idx)}
                        className={cn(
                          "rounded-field border px-2 py-1 text-[10.5px] font-medium transition-colors",
                          active
                            ? "border-accent bg-accent text-accent-ink"
                            : "border-line bg-surface text-ink-muted hover:text-ink",
                        )}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            ) : null}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
