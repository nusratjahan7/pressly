"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, Check, EyeOff, Loader2, Upload } from "lucide-react";
import type { ImageElement, MediaAsset } from "@/types";
import { useEditorStore } from "@/store";
import { useActivePage } from "@/store/selectors";
import { getPageLabel } from "@/lib/spreads";
import { createImageElement } from "@/lib/elements";
import { createId } from "@/lib/id";
import { EmptyState } from "@/components/editor/EmptyState";
import { Button } from "@/components/ui/button";
import { PageContext, PanelSection } from "@/components/editor/sidebar/PanelSection";
import { cn } from "@/lib/cn";

const MAX_FILES = 12;
const MAX_FILE_SIZE = 20 * 1024 * 1024;

function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}

function getImageDimensions(
  src: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () =>
      resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => reject(new Error("Unable to load image"));
    image.src = src;
  });
}

export function ImagesPanel() {
  const project = useEditorStore((state) => state.project);
  const addElements = useEditorStore((state) => state.addElements);
  const addMediaAssets = useEditorStore((state) => state.addMediaAssets);
  const fillFramePhoto = useEditorStore((state) => state.fillFramePhoto);
  const selectElement = useEditorStore((state) => state.selectElement);
  const selectedElementId = useEditorStore(
    (state) => state.selection.elementId,
  );
  const { page, pageIndex } = useActivePage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [hideUsed, setHideUsed] = useState(false);

  const usedSrcCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const candidate of project.pages) {
      for (const el of candidate.elements) {
        if (el.type === "image" && el.src) {
          counts.set(el.src, (counts.get(el.src) ?? 0) + 1);
        }
      }
    }
    return counts;
  }, [project.pages]);

  const allPhotos = useMemo(() => {
    const bySrc = new Map<
      string,
      {
        id: string;
        src: string;
        alt: string;
        usedCount: number;
      }
    >();

    for (const asset of project.mediaLibrary ?? []) {
      if (!asset.src) continue;
      bySrc.set(asset.src, {
        id: asset.id,
        src: asset.src,
        alt: asset.alt,
        usedCount: usedSrcCounts.get(asset.src) ?? 0,
      });
    }

    for (const candidate of project.pages) {
      for (const el of candidate.elements) {
        if (el.type === "image" && el.src && !bySrc.has(el.src)) {
          bySrc.set(el.src, {
            id: el.id,
            src: el.src,
            alt: el.alt,
            usedCount: usedSrcCounts.get(el.src) ?? 1,
          });
        }
      }
    }

    return Array.from(bySrc.values());
  }, [project.mediaLibrary, project.pages, usedSrcCounts]);

  const usedPhotoCount = allPhotos.filter((p) => p.usedCount > 0).length;
  const visiblePhotos = hideUsed
    ? allPhotos.filter((p) => p.usedCount === 0)
    : allPhotos;

  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";
  const pageEditable = Boolean(page && !page.isEndPaper && !page.locked);

  const placeOrFillPhoto = (photo: { src: string; alt: string }) => {
    if (!page || !pageEditable) return;

    // 1. If an image frame is selected on the current page, fill/replace it.
    if (selectedElementId) {
      const selected = page.elements.find(
        (el) => el.id === selectedElementId && el.type === "image",
      );
      if (selected) {
        fillFramePhoto(selected.id, photo);
        return;
      }
    }

    // 2. If the page has an empty photo frame, fill the largest empty frame.
    const emptyFrames = page.elements
      .filter((el): el is ImageElement => el.type === "image" && !el.src)
      .sort((a, b) => b.width * b.height - a.width * a.height);
    if (emptyFrames[0]) {
      fillFramePhoto(emptyFrames[0].id, photo);
      return;
    }

    // 3. Otherwise place as a centered new image frame.
    const width = Math.max(40, project.pageSize.w - 36);
    const height = Math.max(40, project.pageSize.h * 0.45);
    const placed = createImageElement(
      {
        x: Math.round(((project.pageSize.w - width) / 2) * 10) / 10,
        y: Math.round(((project.pageSize.h - height) / 2) * 10) / 10,
        width: Math.round(width * 10) / 10,
        height: Math.round(height * 10) / 10,
      },
      { src: photo.src, alt: photo.alt, fit: "cover" },
    );
    addElements(page.id, [placed]);
    selectElement(page.id, placed.id);
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    setError(null);

    const imagesOnly = files.filter((file) =>
      file.type.startsWith("image/"),
    );
    if (imagesOnly.length === 0) {
      setError("Choose JPG, PNG, WebP, or GIF images to place.");
      return;
    }
    const oversized = imagesOnly.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setError(`“${oversized.name}” is larger than 20 MB.`);
      return;
    }

    setBusy(true);
    try {
      const assets: MediaAsset[] = [];
      const created: ImageElement[] = [];
      const batch = imagesOnly.slice(0, MAX_FILES);

      for (const [index, file] of batch.entries()) {
        const src = await readAsDataUrl(file);
        const dimensions = await getImageDimensions(src);
        const alt =
          file.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]+/g, " ")
            .trim() || "Untitled image";

        assets.push({
          id: createId(),
          src,
          alt,
          width: dimensions.width,
          height: dimensions.height,
        });

        if (page && pageEditable) {
          const boxWidth = Math.max(40, project.pageSize.w - 36);
          const boxHeight = Math.max(40, project.pageSize.h - 52);
          const aspect = dimensions.width / Math.max(1, dimensions.height);
          let width = boxWidth;
          let height = width / aspect;
          if (height > boxHeight) {
            height = boxHeight;
            width = height * aspect;
          }
          const offset = (index % 3) * 5;
          const x = (project.pageSize.w - width) / 2 + offset;
          const y = (project.pageSize.h - height) / 2 + offset;

          created.push(
            createImageElement(
              {
                x: Math.round(x * 10) / 10,
                y: Math.round(y * 10) / 10,
                width: Math.round(width * 10) / 10,
                height: Math.round(height * 10) / 10,
              },
              { src, alt, fit: "cover" },
            ),
          );
        }
      }

      if (assets.length > 0) {
        addMediaAssets(assets);
      }

      if (page && pageEditable && created.length > 0) {
        // Fill empty layout frames on the active page first before adding loose elements.
        const emptyFrames = page.elements
          .filter((el): el is ImageElement => el.type === "image" && !el.src)
          .sort((a, b) => b.width * b.height - a.width * a.height);

        const toPlace: ImageElement[] = [];
        created.forEach((item, idx) => {
          const targetFrame = emptyFrames[idx];
          if (targetFrame) {
            fillFramePhoto(targetFrame.id, { src: item.src, alt: item.alt });
          } else {
            toPlace.push(item);
          }
        });

        if (toPlace.length > 0) {
          addElements(page.id, toPlace);
          selectElement(page.id, toPlace[toPlace.length - 1]!.id);
        }
      }
    } catch {
      setError("One of those images could not be read. Try another file.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const dragHandlers = {
    onDragEnter: (event: React.DragEvent) => {
      event.preventDefault();
      setDragActive(true);
    },
    onDragOver: (event: React.DragEvent) => {
      event.preventDefault();
    },
    onDragLeave: (event: React.DragEvent) => {
      if (event.currentTarget.contains(event.relatedTarget as Node)) return;
      setDragActive(false);
    },
    onDrop: (event: React.DragEvent) => {
      event.preventDefault();
      setDragActive(false);
      if (busy) return;
      void addFiles(event.dataTransfer.files);
    },
  };

  return (
    <div className="flex flex-col gap-4">
      <PageContext label={pageLabel} />

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        multiple
        className="sr-only"
        aria-label="Choose images"
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files);
        }}
      />

      {allPhotos.length === 0 ? (
        <div
          {...dragHandlers}
          className={cn(
            "rounded-ui border border-dashed border-line-strong bg-surface-muted/30 transition-colors duration-150",
            dragActive && "border-accent bg-accent-soft/40",
          )}
        >
          <EmptyState
            title="Bring in photography"
            description="Drop JPG, PNG, or WebP files here, or browse your device. Drag any photo onto a layout frame."
            className="border-0 bg-transparent py-7"
            action={
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={Upload}
                onClick={() => inputRef.current?.click()}
                disabled={busy}
              >
                Browse images
              </Button>
            }
          />
        </div>
      ) : (
        <>
          <div
            {...dragHandlers}
            className={cn(
              "flex items-center justify-between gap-3 rounded-field border border-dashed border-line-strong px-3 py-2.5 transition-colors duration-150",
              dragActive && "border-accent bg-accent-soft/40",
            )}
          >
            <p className="text-[11px] leading-4 text-ink-muted">
              {dragActive ? "Drop to add photos" : "Drop more images here"}
            </p>
            <Button
              variant="ghost"
              size="sm"
              leadingIcon={Upload}
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              Add
            </Button>
          </div>

          <div className="flex items-center justify-between gap-2 text-[10.5px] text-ink-muted">
            <span>
              {usedPhotoCount} used / {allPhotos.length} all
            </span>
            <button
              type="button"
              aria-pressed={hideUsed}
              onClick={() => setHideUsed((prev) => !prev)}
              className={cn(
                "inline-flex h-6 items-center gap-1 rounded-full border px-2 text-[10px] font-medium transition-colors",
                hideUsed
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line bg-surface text-ink-muted hover:border-line-strong",
              )}
            >
              <EyeOff className="size-3" aria-hidden="true" />
              Hide used
            </button>
          </div>

          <PanelSection
            title={
              hideUsed
                ? `Unused photos · ${visiblePhotos.length}`
                : `Photos · ${visiblePhotos.length}`
            }
          >
            {visiblePhotos.length === 0 ? (
              <p className="rounded-field border border-line bg-surface-muted/40 px-3 py-3 text-[11px] text-ink-subtle">
                All uploaded photos are currently placed on pages.
              </p>
            ) : (
              <div className="grid grid-cols-2 gap-2">
                {visiblePhotos.map((photo) => {
                  const isUsed = photo.usedCount > 0;
                  return (
                    <button
                      key={photo.id}
                      type="button"
                      draggable
                      onDragStart={(event) => {
                        event.dataTransfer.setData(
                          "application/x-pressly-image",
                          JSON.stringify({ src: photo.src, alt: photo.alt }),
                        );
                        event.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() =>
                        placeOrFillPhoto({ src: photo.src, alt: photo.alt })
                      }
                      disabled={!pageEditable}
                      aria-label={`Place ${photo.alt || "image"} on ${pageLabel}`}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-field border border-line bg-surface-muted text-left transition-[border-color,box-shadow] duration-150 hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60",
                      )}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={photo.src}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-200 ease-out-soft group-hover:scale-[1.03]"
                      />
                      {isUsed ? (
                        <span
                          aria-label="Used on page"
                          className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm"
                        >
                          <Check className="size-2.5" strokeWidth={2.8} />
                        </span>
                      ) : null}
                      <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-5 text-[10px] font-medium text-white">
                        {photo.alt || "Image"}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </PanelSection>
        </>
      )}

      {busy ? (
        <div
          role="status"
          className="flex items-center gap-2 rounded-field bg-surface-muted px-3 py-2 text-[11px] text-ink-muted"
        >
          <Loader2 className="size-3.5 animate-spin" aria-hidden="true" />
          Preparing images…
        </div>
      ) : null}

      {error ? (
        <div
          role="alert"
          className="flex items-start gap-2 rounded-field bg-danger-soft px-3 py-2 text-[11px] leading-4 text-danger"
        >
          <AlertCircle className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}
    </div>
  );
}
