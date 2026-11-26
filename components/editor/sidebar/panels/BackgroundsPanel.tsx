"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, ImagePlus, Palette, Trash2, Upload } from "lucide-react";
import type { PageBackground } from "@/types";
import { useEditorStore } from "@/store";
import { useActivePage, useCurrentSpread } from "@/store/selectors";
import {
  BACKGROUNDS,
  extractColorsFromPhoto,
  getProjectPhotoSources,
  loadRecentBgColors,
  recordRecentBgColor,
  resolvePageBackground,
} from "@/lib/backgrounds";
import { getPageLabel } from "@/lib/spreads";
import {
  generateClientThumbnail,
  saveOriginalMediaBlob,
} from "@/lib/mediaStorage";
import { createId } from "@/lib/id";
import { PageContext, PanelSection } from "@/components/editor/sidebar/PanelSection";
import { ColorPicker } from "@/components/ui/color-picker";
import { Slider } from "@/components/ui/slider";
import { EmptyState } from "@/components/editor/EmptyState";
import { cn } from "@/lib/cn";

type ApplyTarget = "page" | "spread" | "all";
type BgTab = "color" | "gradient" | "texture" | "image";

export function BackgroundsPanel() {
  const project = useEditorStore((state) => state.project);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const setPagesBackground = useEditorStore((state) => state.setPagesBackground);
  const addMediaAssets = useEditorStore((state) => state.addMediaAssets);
  const { page, pageIndex } = useActivePage();
  const { spread } = useCurrentSpread();

  const [applyTarget, setApplyTarget] = useState<ApplyTarget>("page");
  const [activeTab, setActiveTab] = useState<BgTab>("color");
  const [recentColors, setRecentColors] = useState<string[]>(() =>
    typeof window !== "undefined" ? loadRecentBgColors() : [],
  );
  const [docPalette, setDocPalette] = useState<string[]>([]);
  const [uploadingBg, setUploadingBg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editableInSpread = useMemo(
    () =>
      spread?.pageIndices
        .map((index) => project.pages[index])
        .filter(
          (candidate): candidate is NonNullable<typeof candidate> =>
            Boolean(candidate && !candidate.isEndPaper && !candidate.locked),
        ) ?? [],
    [spread, project.pages],
  );

  const allEditablePages = useMemo(
    () => project.pages.filter((p) => !p.isEndPaper && !p.locked),
    [project.pages],
  );

  const targets = useMemo(() => {
    if (applyTarget === "all") return allEditablePages;
    if (applyTarget === "spread") {
      return editableInSpread.length > 0
        ? editableInSpread
        : page && !page.isEndPaper && !page.locked
          ? [page]
          : [];
    }
    return page && !page.isEndPaper && !page.locked ? [page] : [];
  }, [applyTarget, allEditablePages, editableInSpread, page]);

  const targetIds = useMemo(() => targets.map((t) => t.id), [targets]);
  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";
  const resolved = page ? resolvePageBackground(page) : null;

  // Extract cohesive document palette from uploaded/placed project photos.
  const photoSourcesKey = useMemo(
    () => getProjectPhotoSources(project).join("|"),
    [project],
  );
  useEffect(() => {
    let alive = true;
    const sources = photoSourcesKey ? photoSourcesKey.split("|") : [];
    if (sources.length === 0) {
      setDocPalette([]);
      return;
    }
    void Promise.all(sources.slice(0, 8).map((s) => extractColorsFromPhoto(s))).then(
      (groups) => {
        if (!alive) return;
        const unique = Array.from(new Set(groups.flat())).slice(0, 10);
        setDocPalette(unique);
      },
    );
    return () => {
      alive = false;
    };
  }, [photoSourcesKey]);

  const solidPresets = useMemo(
    () => BACKGROUNDS.filter((b) => (b.category ?? "solid") === "solid"),
    [],
  );
  const gradientPresets = useMemo(
    () => BACKGROUNDS.filter((b) => b.category === "gradient"),
    [],
  );
  const paperPresets = useMemo(
    () => BACKGROUNDS.filter((b) => b.category === "paper"),
    [],
  );
  const patternPresets = useMemo(
    () => BACKGROUNDS.filter((b) => b.category === "pattern"),
    [],
  );

  const applyPreset = (backgroundId: string) => {
    if (targetIds.length === 0) return;
    const def = BACKGROUNDS.find((b) => b.id === backgroundId);
    if (def?.baseColor) {
      setRecentColors(recordRecentBgColor(def.baseColor));
    }
    setPagesBackground(targetIds, { backgroundId, background: undefined });
  };

  const applyCustomBackground = (
    next: PageBackground,
    commit = true,
  ) => {
    if (targetIds.length === 0) return;
    if (next.kind === "solid" && next.color) {
      setRecentColors(recordRecentBgColor(next.color));
    }
    setPagesBackground(targetIds, { background: next }, { commit });
  };

  const applySolidHex = (hex: string) => {
    setRecentColors(recordRecentBgColor(hex));
    applyCustomBackground({
      kind: "solid",
      color: hex,
      opacity: resolved?.opacity ?? 1,
      blur: resolved?.blur ?? 0,
    });
  };

  const updateOpacityOrBlur = (
    patch: { opacity?: number; blur?: number },
    commit: boolean,
  ) => {
    if (!page || !resolved || targetIds.length === 0) return;
    const existing = page.background;
    const baseKind: PageBackground["kind"] =
      existing?.kind ??
      (resolved.gradient
        ? "gradient"
        : resolved.kind === "paper" || resolved.kind === "pattern"
          ? resolved.kind
          : "solid");
    const nextBg: PageBackground = existing
      ? { ...existing, ...patch }
      : {
          kind: baseKind,
          color: resolved.baseColor,
          gradient: resolved.gradient,
          patternId:
            resolved.kind === "paper" || resolved.kind === "pattern"
              ? page.backgroundId
              : undefined,
          ...patch,
        };
    setPagesBackground(targetIds, { background: nextBg }, { commit });
  };

  const handleUploadBgImage = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    setUploadingBg(true);
    try {
      const assetId = createId();
      const { thumbSrc, width, height } = await generateClientThumbnail(
        file,
        320,
      );
      const src = await saveOriginalMediaBlob(assetId, file);
      const alt =
        file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim() || "Background image";
      addMediaAssets([
        {
          id: assetId,
          src,
          thumbSrc,
          alt,
          width,
          height,
          createdAt: Date.now(),
        },
      ]);
      applyCustomBackground({
        kind: "image",
        color: "#FFFFFF",
        imageSrc: src,
        imageAlt: alt,
        opacity: resolved?.opacity ?? 1,
        blur: resolved?.blur ?? 0,
      });
    } finally {
      setUploadingBg(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const currentGradient = resolved?.gradient ?? {
    from: "#FFF5EB",
    to: "#C3C8F2",
    angle: 135,
  };

  return (
    <div className="flex flex-col gap-4">
      <PageContext
        label={pageLabel}
        suffix={
          targetIds.length > 1 ? `${targetIds.length} pages` : undefined
        }
      />

      {/* Apply scope */}
      <div className="flex flex-col gap-1.5 rounded-field border border-line bg-surface-muted/45 p-2">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
          Apply changes to
        </span>
        <div
          role="group"
          aria-label="Background apply scope"
          className="grid grid-cols-3 gap-1 rounded-[7px] bg-surface-muted p-0.5"
        >
          {(
            [
              { id: "page", label: "Current page" },
              {
                id: "spread",
                label: "Spread",
                disabled: editableInSpread.length < 2,
              },
              { id: "all", label: "All pages" },
            ] as const
          ).map((opt) => {
            const active = applyTarget === opt.id;
            const disabled = "disabled" in opt ? opt.disabled : false;
            return (
              <button
                key={opt.id}
                type="button"
                disabled={disabled}
                onClick={() => setApplyTarget(opt.id)}
                className={cn(
                  "rounded-[6px] py-1 text-[10.5px] font-medium transition-colors disabled:opacity-40",
                  active
                    ? "bg-surface text-ink shadow-sm"
                    : "text-ink-muted hover:text-ink",
                )}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {!page || targetIds.length === 0 ? (
        <EmptyState
          title={page ? "Page is locked" : "No page selected"}
          description="Select an editable page to customize its background."
          compact
        />
      ) : (
        <>
          {/* Category sub-tabs */}
          <div className="grid grid-cols-4 gap-1 rounded-field border border-line bg-surface-muted p-0.5">
            {(
              [
                { id: "color", label: "Colors" },
                { id: "gradient", label: "Gradient" },
                { id: "texture", label: "Textures" },
                { id: "image", label: "Image" },
              ] as const
            ).map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "rounded-[6px] py-1.5 text-[10.5px] font-medium transition-colors",
                    active
                      ? "bg-surface text-ink shadow-sm"
                      : "text-ink-muted hover:text-ink",
                  )}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Color Tab */}
          {activeTab === "color" ? (
            <>
              <PanelSection title="Custom colour">
                <ColorPicker
                  value={resolved?.baseColor ?? "#FFFFFF"}
                  onChange={applySolidHex}
                  label="Custom background colour"
                />
              </PanelSection>

              {docPalette.length > 0 ? (
                <PanelSection
                  title="Document photo palette"
                  action={
                    <Palette
                      className="size-3 text-ink-subtle"
                      aria-hidden="true"
                    />
                  }
                >
                  <div className="flex flex-wrap gap-1.5">
                    {docPalette.map((hex) => (
                      <button
                        key={`doc-${hex}`}
                        type="button"
                        onClick={() => applySolidHex(hex)}
                        aria-label={`Apply photo palette color ${hex}`}
                        title={hex}
                        className="size-6 rounded-full border border-black/15 shadow-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </PanelSection>
              ) : null}

              {recentColors.length > 0 ? (
                <PanelSection title="Recent colours">
                  <div className="flex flex-wrap gap-1.5">
                    {recentColors.map((hex) => (
                      <button
                        key={`rec-${hex}`}
                        type="button"
                        onClick={() => applySolidHex(hex)}
                        aria-label={`Apply recent color ${hex}`}
                        title={hex}
                        className="size-6 rounded-full border border-black/15 shadow-sm transition-transform hover:scale-110"
                        style={{ backgroundColor: hex }}
                      />
                    ))}
                  </div>
                </PanelSection>
              ) : null}

              <PanelSection title="Solid swatches">
                <div className="grid grid-cols-4 gap-2">
                  {solidPresets.map((bg) => {
                    const selected =
                      !page.background &&
                      targets.every((t) => t.backgroundId === bg.id);
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => applyPreset(bg.id)}
                        title={bg.name}
                        aria-pressed={selected}
                        className={cn(
                          "relative aspect-square w-full rounded-field border shadow-sm transition-transform active:scale-95",
                          selected
                            ? "border-accent ring-2 ring-accent/30"
                            : "border-line hover:border-line-strong",
                        )}
                        style={bg.style}
                      >
                        {selected ? (
                          <span className="absolute right-1 top-1 flex size-4 items-center justify-center rounded-full bg-accent text-accent-ink">
                            <Check className="size-2.5" strokeWidth={2.5} />
                          </span>
                        ) : null}
                      </button>
                    );
                  })}
                </div>
              </PanelSection>
            </>
          ) : null}

          {/* Gradient Tab */}
          {activeTab === "gradient" ? (
            <>
              <PanelSection title="Gradient presets">
                <div className="grid grid-cols-3 gap-2">
                  {gradientPresets.map((bg) => {
                    const selected =
                      !page.background &&
                      targets.every((t) => t.backgroundId === bg.id);
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => applyPreset(bg.id)}
                        className="group flex flex-col gap-1 text-left"
                      >
                        <span
                          className={cn(
                            "relative aspect-[4/5] w-full rounded-field border shadow-sm",
                            selected
                              ? "border-accent ring-2 ring-accent/25"
                              : "border-line group-hover:border-line-strong",
                          )}
                          style={bg.style}
                        />
                        <span className="truncate text-[10px] font-medium text-ink-muted">
                          {bg.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PanelSection>

              <PanelSection title="Custom gradient">
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col gap-1">
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                      Start
                    </span>
                    <ColorPicker
                      value={currentGradient.from}
                      onChange={(from) =>
                        applyCustomBackground({
                          kind: "gradient",
                          color: from,
                          gradient: { ...currentGradient, from },
                          opacity: resolved?.opacity ?? 1,
                          blur: resolved?.blur ?? 0,
                        })
                      }
                      label="Gradient start colour"
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                      End
                    </span>
                    <ColorPicker
                      value={currentGradient.to}
                      onChange={(to) =>
                        applyCustomBackground({
                          kind: "gradient",
                          color: currentGradient.from,
                          gradient: { ...currentGradient, to },
                          opacity: resolved?.opacity ?? 1,
                          blur: resolved?.blur ?? 0,
                        })
                      }
                      label="Gradient end colour"
                    />
                  </div>
                </div>
                <Slider
                  label="Angle"
                  value={currentGradient.angle}
                  min={0}
                  max={360}
                  step={5}
                  formatValue={(v) => `${v}°`}
                  onStart={pushHistory}
                  onValueChange={(angle) =>
                    applyCustomBackground(
                      {
                        kind: "gradient",
                        color: currentGradient.from,
                        gradient: { ...currentGradient, angle },
                        opacity: resolved?.opacity ?? 1,
                        blur: resolved?.blur ?? 0,
                      },
                      false,
                    )
                  }
                />
              </PanelSection>
            </>
          ) : null}

          {/* Textures & Patterns Tab */}
          {activeTab === "texture" ? (
            <>
              <PanelSection title="Paper textures">
                <div className="grid grid-cols-3 gap-2">
                  {paperPresets.map((bg) => {
                    const selected =
                      (!page.background &&
                        targets.every((t) => t.backgroundId === bg.id)) ||
                      page.background?.patternId === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => applyPreset(bg.id)}
                        className="group flex flex-col gap-1 text-left"
                      >
                        <span
                          className={cn(
                            "relative aspect-[4/5] w-full rounded-field border shadow-sm",
                            selected
                              ? "border-accent ring-2 ring-accent/25"
                              : "border-line group-hover:border-line-strong",
                          )}
                          style={bg.style}
                        />
                        <span className="truncate text-[10px] font-medium text-ink-muted">
                          {bg.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PanelSection>

              <PanelSection title="Print patterns">
                <div className="grid grid-cols-3 gap-2">
                  {patternPresets.map((bg) => {
                    const selected =
                      (!page.background &&
                        targets.every((t) => t.backgroundId === bg.id)) ||
                      page.background?.patternId === bg.id;
                    return (
                      <button
                        key={bg.id}
                        type="button"
                        onClick={() => applyPreset(bg.id)}
                        className="group flex flex-col gap-1 text-left"
                      >
                        <span
                          className={cn(
                            "relative aspect-[4/5] w-full rounded-field border shadow-sm",
                            selected
                              ? "border-accent ring-2 ring-accent/25"
                              : "border-line group-hover:border-line-strong",
                          )}
                          style={bg.style}
                        />
                        <span className="truncate text-[10px] font-medium text-ink-muted">
                          {bg.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </PanelSection>

              {resolved?.pdfPattern ? (
                <PanelSection title="Paper base tint">
                  <ColorPicker
                    value={resolved.baseColor}
                    onChange={(tint) =>
                      applyCustomBackground({
                        kind: resolved.kind === "paper" ? "paper" : "pattern",
                        color: tint,
                        patternId:
                          page.background?.patternId ?? page.backgroundId,
                        opacity: resolved.opacity,
                        blur: resolved.blur,
                      })
                    }
                    label="Texture base colour"
                  />
                </PanelSection>
              ) : null}
            </>
          ) : null}

          {/* Image Tab */}
          {activeTab === "image" ? (
            <PanelSection
              title="Background image"
              description="Full-bleed photo layer beneath all elements."
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
                onChange={(e) => void handleUploadBgImage(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingBg}
                className="flex h-9 w-full items-center justify-center gap-1.5 rounded-field border border-dashed border-line-strong bg-surface-muted/45 text-[11px] font-medium text-ink transition-colors hover:border-accent hover:text-accent"
              >
                <Upload className="size-3.5" aria-hidden="true" />
                <span>{uploadingBg ? "Uploading…" : "Upload background photo"}</span>
              </button>

              {(project.mediaLibrary?.length ?? 0) > 0 ? (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  {project.mediaLibrary!.map((asset) => {
                    const active = page.background?.imageSrc === asset.src;
                    return (
                      <button
                        key={asset.id}
                        type="button"
                        onClick={() =>
                          applyCustomBackground({
                            kind: "image",
                            color: "#FFFFFF",
                            imageSrc: asset.src,
                            imageAlt: asset.alt,
                            opacity: resolved?.opacity ?? 1,
                            blur: resolved?.blur ?? 0,
                          })
                        }
                        className={cn(
                          "relative aspect-square overflow-hidden rounded-field border",
                          active
                            ? "border-accent ring-2 ring-accent/25"
                            : "border-line hover:border-line-strong",
                        )}
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={asset.thumbSrc ?? asset.src}
                          alt={asset.alt}
                          className="h-full w-full object-cover"
                        />
                      </button>
                    );
                  })}
                </div>
              ) : (
                <p className="flex items-center gap-1.5 text-[10.5px] text-ink-subtle">
                  <ImagePlus className="size-3.5 shrink-0" aria-hidden="true" />
                  Uploaded images also appear in your project library.
                </p>
              )}

              {page.background?.imageSrc ? (
                <button
                  type="button"
                  onClick={() => applyPreset("paper")}
                  className="inline-flex items-center gap-1 self-start text-[10.5px] font-medium text-danger hover:underline"
                >
                  <Trash2 className="size-3" />
                  Remove background image
                </button>
              ) : null}
            </PanelSection>
          ) : null}

          {/* Shared Opacity & Blur Controls */}
          <PanelSection title="Layer adjustments">
            <Slider
              label="Opacity"
              value={Math.round((resolved?.opacity ?? 1) * 100)}
              min={10}
              max={100}
              step={2}
              formatValue={(v) => `${v}%`}
              onStart={pushHistory}
              onValueChange={(v) =>
                updateOpacityOrBlur({ opacity: v / 100 }, false)
              }
            />
            <Slider
              label="Blur"
              value={resolved?.blur ?? 0}
              min={0}
              max={16}
              step={0.5}
              formatValue={(v) => `${v} px`}
              onStart={pushHistory}
              onValueChange={(v) => updateOpacityOrBlur({ blur: v }, false)}
            />
          </PanelSection>
        </>
      )}
    </div>
  );
}
