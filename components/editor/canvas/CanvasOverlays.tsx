"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Check,
  Eraser,
  ImagePlus,
  LayoutGrid,
  RefreshCw,
  RotateCcw,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type { Element, ImageElement, MediaAsset, Page, PageSize } from "@/types";
import { useEditorStore } from "@/store";
import {
  DEFAULT_FRAME_GAP_MM,
  getRelevantLayouts,
  type LayoutDefinition,
} from "@/lib/layouts";
import {
  generateClientThumbnail,
  resolveMediaUrl,
  saveOriginalMediaBlob,
} from "@/lib/mediaStorage";
import { createId } from "@/lib/id";
import { LayoutWireframe } from "@/components/editor/sidebar/panels/LayoutWireframe";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/cn";

export interface ContextMenuState {
  element: Element;
  pageId: string;
  x: number;
  y: number;
}

export function QuickPageActions({
  page,
  pageSize,
  side,
  topPx,
  anchorXPx,
  layoutOpen,
  onToggleLayout,
  onCloseLayout,
  onAddText,
}: {
  page: Page;
  pageSize: PageSize;
  side: "left" | "right";
  topPx: number;
  anchorXPx: number;
  layoutOpen: boolean;
  onToggleLayout: () => void;
  onCloseLayout: () => void;
  onAddText: () => void;
}) {
  const applyLayout = useEditorStore((state) => state.applyLayout);

  const photoCount = useMemo(() => {
    const filled = page.elements.filter(
      (el) => el.type === "image" && Boolean(el.src),
    ).length;
    if (filled > 0) return filled;
    const frames = page.elements.filter((el) => el.type === "image").length;
    return frames > 0 ? frames : 3;
  }, [page.elements]);

  const relevant = useMemo(
    () => getRelevantLayouts(photoCount, "page", 8),
    [photoCount],
  );

  const handleSelect = (layout: LayoutDefinition) => {
    applyLayout(page.id, layout, {
      gapMm: page.layoutMeta?.gapMm ?? DEFAULT_FRAME_GAP_MM,
      marginMm: page.layoutMeta?.marginMm ?? pageSize.safeMargin,
    });
    onCloseLayout();
  };

  return (
    <div
      className="pointer-events-auto absolute z-20 flex flex-col gap-1.5"
      style={{
        top: topPx,
        left: anchorXPx,
        transform: side === "left" ? "translateX(-100%)" : undefined,
      }}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <button
        type="button"
        onClick={onAddText}
        aria-label="Add text box"
        className="flex flex-col items-center gap-0.5 rounded-field border border-line bg-surface/95 px-2 py-1.5 text-[10px] font-medium text-ink shadow-sm backdrop-blur transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="text-[11px] font-bold leading-none">A+</span>
        <span>text</span>
      </button>

      <div className="relative">
        <button
          type="button"
          onClick={onToggleLayout}
          aria-expanded={layoutOpen}
          aria-label="Quick layouts"
          className={cn(
            "flex w-full flex-col items-center gap-0.5 rounded-field border border-line bg-surface/95 px-2 py-1.5 text-[10px] font-medium text-ink shadow-sm backdrop-blur transition-colors hover:border-accent hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
            layoutOpen && "border-accent text-accent",
          )}
        >
          <LayoutGrid className="size-3.5" aria-hidden="true" />
          <span>layout</span>
        </button>

        {layoutOpen ? (
          <div
            role="dialog"
            aria-label="Relevant layouts"
            className={cn(
              "absolute top-0 z-30 w-56 rounded-card border border-line bg-surface p-2.5 shadow-panel",
              side === "left" ? "left-full ml-2" : "right-full mr-2",
            )}
          >
            <div className="mb-2 flex items-center justify-between">
              <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
                Quick layouts ({photoCount}{" "}
                {photoCount === 1 ? "photo" : "photos"})
              </span>
              <button
                type="button"
                onClick={onCloseLayout}
                aria-label="Close quick layouts"
                className="rounded p-0.5 text-ink-subtle hover:bg-surface-muted hover:text-ink"
              >
                <X className="size-3" />
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {relevant.map((layout) => {
                const active = page.layoutMeta?.layoutId === layout.id;
                return (
                  <button
                    key={layout.id}
                    type="button"
                    onClick={() => handleSelect(layout)}
                    aria-label={`Apply ${layout.name}`}
                    className={cn(
                      "flex items-center justify-center rounded-[6px] border bg-white p-1.5 transition-colors hover:border-accent",
                      active ? "border-accent ring-1 ring-accent" : "border-line",
                    )}
                  >
                    <LayoutWireframe
                      layout={layout}
                      pageSize={pageSize}
                      maxWidth={68}
                      maxHeight={56}
                    />
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function FrameContextMenu({
  menu,
  onClose,
  onReplacePhoto,
}: {
  menu: ContextMenuState | null;
  onClose: () => void;
  onReplacePhoto: (elementId: string, pageId: string) => void;
}) {
  const clearFramePhoto = useEditorStore((state) => state.clearFramePhoto);
  const updateElement = useEditorStore((state) => state.updateElement);
  const removeElement = useEditorStore((state) => state.removeElement);

  useEffect(() => {
    if (!menu) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const handlePointer = () => onClose();
    window.addEventListener("keydown", handleKey);
    window.addEventListener("pointerdown", handlePointer);
    return () => {
      window.removeEventListener("keydown", handleKey);
      window.removeEventListener("pointerdown", handlePointer);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const { element, pageId } = menu;
  const isImage = element.type === "image";
  const hasPhoto = isImage && Boolean(element.src);
  const hasText =
    element.type === "text" &&
    !element.isPlaceholder &&
    element.text.trim().length > 0;

  return (
    <div
      role="menu"
      aria-label="Frame actions"
      onPointerDown={(event) => event.stopPropagation()}
      className="fixed z-50 min-w-44 rounded-ui border border-line bg-surface p-1 shadow-panel"
      style={{
        left: Math.min(menu.x, (typeof window !== "undefined" ? window.innerWidth : 1200) - 196),
        top: Math.min(menu.y, (typeof window !== "undefined" ? window.innerHeight : 800) - 180),
      }}
    >
      {isImage ? (
        <button
          type="button"
          role="menuitem"
          onClick={() => {
            onReplacePhoto(element.id, pageId);
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-field px-2.5 py-1.5 text-left text-[11.5px] font-medium text-ink hover:bg-surface-muted"
        >
          <RefreshCw className="size-3.5 text-ink-muted" aria-hidden="true" />
          {hasPhoto ? "Replace photo…" : "Choose photo…"}
        </button>
      ) : null}

      {isImage ? (
        <button
          type="button"
          role="menuitem"
          disabled={!hasPhoto}
          onClick={() => {
            clearFramePhoto(element.id);
            onClose();
          }}
          className="flex w-full items-center gap-2 rounded-field px-2.5 py-1.5 text-left text-[11.5px] font-medium text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Eraser className="size-3.5 text-ink-muted" aria-hidden="true" />
          Remove photo
        </button>
      ) : null}

      <button
        type="button"
        role="menuitem"
        disabled={!hasPhoto && !hasText}
        onClick={() => {
          if (isImage) {
            clearFramePhoto(element.id);
          } else if (element.type === "text") {
            updateElement(element.id, {
              text: "text",
              color: "#D4A3B8",
              isPlaceholder: true,
            });
          }
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-field px-2.5 py-1.5 text-left text-[11.5px] font-medium text-ink hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ImagePlus className="size-3.5 text-ink-muted" aria-hidden="true" />
        Clear frame
      </button>

      <div className="my-1 h-px bg-line" />

      <button
        type="button"
        role="menuitem"
        onClick={() => {
          removeElement(element.id);
          onClose();
        }}
        className="flex w-full items-center gap-2 rounded-field px-2.5 py-1.5 text-left text-[11.5px] font-medium text-danger hover:bg-danger-soft"
      >
        <Trash2 className="size-3.5" aria-hidden="true" />
        Delete frame
      </button>
    </div>
  );
}

function PickerThumb({
  src,
  thumbSrc,
  alt,
}: {
  src: string;
  thumbSrc?: string;
  alt: string;
}) {
  const [url, setUrl] = useState(thumbSrc || (src.startsWith("idb:") ? "" : src));
  useEffect(() => {
    if (thumbSrc) {
      setUrl(thumbSrc);
      return;
    }
    let cancelled = false;
    void resolveMediaUrl(src).then((next) => {
      if (!cancelled && next) setUrl(next);
    });
    return () => {
      cancelled = true;
    };
  }, [src, thumbSrc]);
  if (!url) return <div className="h-full w-full animate-pulse bg-surface-muted" />;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={url}
      alt={alt}
      className="h-full w-full object-cover transition-transform duration-150 group-hover:scale-[1.03]"
    />
  );
}

export function PhotoPickerModal({
  targetElementId,
  onClose,
}: {
  targetElementId: string | null;
  onClose: () => void;
}) {
  const project = useEditorStore((state) => state.project);
  const fillFramePhoto = useEditorStore((state) => state.fillFramePhoto);
  const addMediaAssets = useEditorStore((state) => state.addMediaAssets);
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  const usedSrcs = useMemo(() => {
    const set = new Set<string>();
    for (const p of project.pages) {
      for (const el of p.elements) {
        if (el.type === "image" && el.src) set.add(el.src);
      }
    }
    return set;
  }, [project.pages]);

  const photos = useMemo(() => {
    const bySrc = new Map<
      string,
      { id: string; src: string; thumbSrc?: string; alt: string; used: boolean }
    >();
    for (const asset of project.mediaLibrary ?? []) {
      if (!asset.src) continue;
      bySrc.set(asset.src, {
        id: asset.id,
        src: asset.src,
        thumbSrc: asset.thumbSrc,
        alt: asset.alt,
        used: usedSrcs.has(asset.src),
      });
    }
    for (const p of project.pages) {
      for (const el of p.elements) {
        if (el.type === "image" && el.src && !bySrc.has(el.src)) {
          bySrc.set(el.src, {
            id: el.id,
            src: el.src,
            alt: el.alt,
            used: true,
          });
        }
      }
    }
    // Unused photos first for fast placement.
    return Array.from(bySrc.values()).sort((a, b) => Number(a.used) - Number(b.used));
  }, [project.mediaLibrary, project.pages, usedSrcs]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || !targetElementId) return;
    const valid = Array.from(files).filter(
      (f) =>
        f.type.startsWith("image/") ||
        /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name),
    );
    if (valid.length === 0) return;

    setBusy(true);
    try {
      const assets: MediaAsset[] = [];
      for (const file of valid.slice(0, 12)) {
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
              .trim() || "Untitled image";
          assets.push({
            id: assetId,
            src,
            thumbSrc,
            alt,
            width,
            height,
            createdAt: Date.now(),
          });
        } catch {
          /* skip undecodable file */
        }
      }
      if (assets.length > 0) {
        addMediaAssets(assets);
        fillFramePhoto(targetElementId, {
          src: assets[0]!.src,
          alt: assets[0]!.alt,
        });
        onClose();
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={Boolean(targetElementId)}
      onClose={onClose}
      title="Choose a photo"
      description="Pick an uploaded photo or add new ones from your device."
      size="md"
      footer={
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
            multiple
            className="sr-only"
            onChange={(event) => void handleUpload(event.target.files)}
          />
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={Upload}
            loading={busy}
            onClick={() => inputRef.current?.click()}
          >
            Upload photo…
          </Button>
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
        </>
      }
    >
      {photos.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-ui border border-dashed border-line-strong bg-surface-muted/40 py-8 text-center">
          <p className="text-[12px] text-ink-muted">
            No photos in your project yet.
          </p>
          <Button
            variant="primary"
            size="sm"
            leadingIcon={Upload}
            onClick={() => inputRef.current?.click()}
          >
            Browse device
          </Button>
        </div>
      ) : (
        <div className="grid max-h-[50dvh] grid-cols-3 gap-2.5 overflow-y-auto p-0.5">
          {photos.map((photo) => (
            <button
              key={photo.id}
              type="button"
              onClick={() => {
                if (!targetElementId) return;
                fillFramePhoto(targetElementId, {
                  src: photo.src,
                  alt: photo.alt,
                });
                onClose();
              }}
              className="group relative aspect-square overflow-hidden rounded-field border border-line bg-surface-muted text-left hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <PickerThumb
                src={photo.src}
                thumbSrc={photo.thumbSrc}
                alt={photo.alt || "Photo"}
              />
              <span
                className={cn(
                  "absolute left-1.5 top-1.5 rounded-full px-1.5 py-0.5 text-[9px] font-semibold",
                  photo.used
                    ? "bg-black/55 text-white"
                    : "bg-accent text-accent-ink",
                )}
              >
                {photo.used ? "Used" : "Unused"}
              </span>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

export function CropControlBar({
  element,
  onDone,
}: {
  element: ImageElement;
  onDone: () => void;
}) {
  const updateElement = useEditorStore((state) => state.updateElement);
  const pushHistory = useEditorStore((state) => state.pushHistory);

  return (
    <div
      onPointerDown={(event) => event.stopPropagation()}
      className="absolute bottom-12 left-1/2 z-30 flex -translate-x-1/2 items-center gap-3 rounded-full border border-line bg-surface/95 px-3.5 py-1.5 shadow-panel backdrop-blur"
    >
      <span className="text-[10.5px] font-semibold text-ink-muted">
        Drag image to pan
      </span>
      <div className="w-32">
        <Slider
          label="Zoom"
          value={Math.round((element.cropScale ?? 1) * 100)}
          min={100}
          max={300}
          step={5}
          formatValue={(v) => `${(v / 100).toFixed(1)}×`}
          onStart={pushHistory}
          onValueChange={(v) =>
            updateElement(
              element.id,
              { cropScale: v / 100 },
              { commit: false },
            )
          }
        />
      </div>
      <Button
        variant="ghost"
        size="sm"
        leadingIcon={RotateCcw}
        onClick={() => updateElement(element.id, { cropScale: 1, cropX: 0, cropY: 0 })}
      >
        Reset
      </Button>
      <Button
        variant="primary"
        size="sm"
        leadingIcon={Check}
        onClick={onDone}
      >
        Done
      </Button>
    </div>
  );
}
