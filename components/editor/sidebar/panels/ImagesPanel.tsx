"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  EyeOff,
  Link2,
  Loader2,
  Sparkles,
  Trash2,
  Upload,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import type { ImageElement, MediaAsset } from "@/types";
import { useEditorStore } from "@/store";
import { useActivePage } from "@/store/selectors";
import { getPageLabel } from "@/lib/spreads";
import { createImageElement } from "@/lib/elements";
import { createId } from "@/lib/id";
import {
  generateClientThumbnail,
  resolveMediaUrl,
  saveOriginalMediaBlob,
} from "@/lib/mediaStorage";
import { EmptyState } from "@/components/editor/EmptyState";
import { Button } from "@/components/ui/button";
import { PageContext } from "@/components/editor/sidebar/PanelSection";
import { cn } from "@/lib/cn";

const MAX_FILES = 24;
const MAX_FILE_SIZE = 30 * 1024 * 1024;
type SortOrder = "earliest" | "latest" | "name";

function isSupportedImageFile(file: File): boolean {
  if (file.type.startsWith("image/")) return true;
  return /\.(jpe?g|png|webp|gif|heic|heif|avif|bmp|svg)$/i.test(file.name);
}

function AssetThumbnail({
  src,
  thumbSrc,
  alt,
  className,
}: {
  src: string;
  thumbSrc?: string;
  alt: string;
  className?: string;
}) {
  const [resolved, setResolved] = useState<string>(thumbSrc || (src.startsWith("idb:") ? "" : src));

  useEffect(() => {
    if (thumbSrc) {
      setResolved(thumbSrc);
      return;
    }
    let cancelled = false;
    void resolveMediaUrl(src).then((url) => {
      if (!cancelled && url) setResolved(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src, thumbSrc]);

  if (!resolved) {
    return <div className={cn("h-full w-full animate-pulse bg-surface-muted", className)} />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      loading="lazy"
      className={className}
    />
  );
}

export function ImagesPanel() {
  const project = useEditorStore((state) => state.project);
  const addElements = useEditorStore((state) => state.addElements);
  const addMediaAssets = useEditorStore((state) => state.addMediaAssets);
  const removeMediaAssets = useEditorStore((state) => state.removeMediaAssets);
  const autofillUnusedPhotos = useEditorStore(
    (state) => state.autofillUnusedPhotos,
  );
  const fillFramePhoto = useEditorStore((state) => state.fillFramePhoto);
  const selectElement = useEditorStore((state) => state.selectElement);
  const selectedElementId = useEditorStore(
    (state) => state.selection.elementId,
  );
  const { page, pageIndex } = useActivePage();

  const inputRef = useRef<HTMLInputElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [urlOpen, setUrlOpen] = useState(false);
  const [urlInput, setUrlInput] = useState("");
  const [progress, setProgress] = useState<{
    done: number;
    total: number;
    label: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const [sortOrder, setSortOrder] = useState<SortOrder>("earliest");
  const [columns, setColumns] = useState<2 | 3 | 4>(2);
  const [hideUsed, setHideUsed] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

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
        thumbSrc?: string;
        alt: string;
        createdAt: number;
        order: number;
        usedCount: number;
      }
    >();

    let order = 0;
    for (const asset of project.mediaLibrary ?? []) {
      if (!asset.src) continue;
      bySrc.set(asset.src, {
        id: asset.id,
        src: asset.src,
        thumbSrc: asset.thumbSrc,
        alt: asset.alt,
        createdAt: asset.createdAt ?? order,
        order: order++,
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
            createdAt: order,
            order: order++,
            usedCount: usedSrcCounts.get(el.src) ?? 1,
          });
        }
      }
    }

    return Array.from(bySrc.values());
  }, [project.mediaLibrary, project.pages, usedSrcCounts]);

  const sortedAndFiltered = useMemo(() => {
    const filtered = hideUsed
      ? allPhotos.filter((p) => p.usedCount === 0)
      : [...allPhotos];

    filtered.sort((a, b) => {
      if (sortOrder === "latest") return b.order - a.order;
      if (sortOrder === "name") return a.alt.localeCompare(b.alt);
      return a.order - b.order;
    });
    return filtered;
  }, [allPhotos, hideUsed, sortOrder]);

  const usedPhotoCount = allPhotos.filter((p) => p.usedCount > 0).length;
  const unusedPhotoCount = allPhotos.length - usedPhotoCount;
  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";
  const pageEditable = Boolean(page && !page.isEndPaper && !page.locked);

  const placeOrFillPhoto = (photo: { src: string; alt: string }) => {
    if (!page || !pageEditable) return;

    if (selectedElementId) {
      const selected = page.elements.find(
        (el) => el.id === selectedElementId && el.type === "image",
      );
      if (selected) {
        fillFramePhoto(selected.id, photo);
        return;
      }
    }

    const emptyFrames = page.elements
      .filter((el): el is ImageElement => el.type === "image" && !el.src)
      .sort((a, b) => b.width * b.height - a.width * a.height);
    if (emptyFrames[0]) {
      fillFramePhoto(emptyFrames[0].id, photo);
      return;
    }

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

  const ingestBlobs = async (
    items: Array<{ blob: Blob; name: string }>,
  ) => {
    const assets: MediaAsset[] = [];
    const failed: string[] = [];

    for (let index = 0; index < items.length; index += 1) {
      const { blob, name } = items[index]!;
      setProgress({
        done: index,
        total: items.length,
        label: `Processing ${index + 1} of ${items.length}…`,
      });

      try {
        const assetId = createId();
        const { thumbSrc, width, height } = await generateClientThumbnail(blob, 320);
        const src = await saveOriginalMediaBlob(assetId, blob);
        const alt =
          name
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
          createdAt: Date.now() + index,
        });
      } catch {
        failed.push(name);
      }
    }

    setProgress({
      done: items.length,
      total: items.length,
      label: "Finishing…",
    });

    if (assets.length > 0) {
      addMediaAssets(assets);
    }

    if (failed.length > 0) {
      const hasHeic = failed.some((n) => /\.(heic|heif)$/i.test(n));
      setError(
        hasHeic
          ? `This browser cannot decode HEIC natively (${failed[0]}). Try JPG, PNG, or WebP.`
          : `Could not decode ${failed.join(", ")}.`,
      );
    }
  };

  const addFiles = async (fileList: FileList | File[]) => {
    const files = Array.from(fileList);
    setError(null);

    const imagesOnly = files.filter(isSupportedImageFile);
    if (imagesOnly.length === 0) {
      setError("Choose JPG, PNG, WebP, or HEIC images.");
      return;
    }
    const oversized = imagesOnly.find((file) => file.size > MAX_FILE_SIZE);
    if (oversized) {
      setError(`“${oversized.name}” exceeds 30 MB.`);
      return;
    }

    const batch = imagesOnly.slice(0, MAX_FILES);
    try {
      await ingestBlobs(batch.map((file) => ({ blob: file, name: file.name })));
    } finally {
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const importFromUrl = async () => {
    const raw = urlInput.trim();
    if (!raw) return;
    setError(null);
    setProgress({ done: 0, total: 1, label: "Fetching image…" });

    try {
      const parsed = new URL(raw);
      const response = await fetch(parsed.toString(), { mode: "cors" });
      if (!response.ok) throw new Error("Failed to fetch URL");
      const blob = await response.blob();
      if (!blob.type.startsWith("image/")) {
        throw new Error("URL did not return an image");
      }
      const filename = parsed.pathname.split("/").pop() || "imported-image";
      await ingestBlobs([{ blob, name: filename }]);
      setUrlInput("");
      setUrlOpen(false);
    } catch {
      setError(
        "Could not import from that URL (check CORS/public access and image format).",
      );
    } finally {
      setProgress(null);
    }
  };

  const toggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id],
    );
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    removeMediaAssets(selectedIds);
    setSelectedIds([]);
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
      if (progress) return;
      void addFiles(event.dataTransfer.files);
    },
  };

  const pct = progress
    ? Math.round((progress.done / Math.max(1, progress.total)) * 100)
    : 0;

  return (
    <div className="flex flex-col gap-3">
      <PageContext label={pageLabel} />

      <input
        ref={inputRef}
        type="file"
        accept="image/*,.heic,.heif"
        multiple
        className="sr-only"
        aria-label="Choose images"
        onChange={(event) => {
          if (event.target.files) void addFiles(event.target.files);
        }}
      />

      {/* Top primary buttons matching reference: Add more photos + Autofill */}
      <div className="relative flex flex-col gap-1.5">
        <div className="flex items-stretch">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={Upload}
            className="flex-1 justify-center rounded-r-none border-r-0"
            onClick={() => inputRef.current?.click()}
            disabled={Boolean(progress)}
          >
            Add more photos
          </Button>
          <button
            type="button"
            aria-label="More import options"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((prev) => !prev)}
            className="inline-flex items-center justify-center rounded-r-field border border-line bg-surface px-2 text-ink-muted hover:bg-surface-muted hover:text-ink"
          >
            <ChevronDown className="size-3.5" aria-hidden="true" />
          </button>
        </div>

        {menuOpen ? (
          <div className="flex flex-col rounded-field border border-line bg-surface p-1 shadow-sm">
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                inputRef.current?.click();
              }}
              className="flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[11px] font-medium text-ink hover:bg-surface-muted"
            >
              <Upload className="size-3.5 text-ink-muted" />
              Upload files (JPG, PNG, WebP, HEIC)
            </button>
            <button
              type="button"
              onClick={() => {
                setMenuOpen(false);
                setUrlOpen((prev) => !prev);
              }}
              className="flex items-center gap-2 rounded-[6px] px-2.5 py-1.5 text-left text-[11px] font-medium text-ink hover:bg-surface-muted"
            >
              <Link2 className="size-3.5 text-ink-muted" />
              Import from URL…
            </button>
          </div>
        ) : null}

        {urlOpen ? (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void importFromUrl();
            }}
            className="flex items-center gap-1.5 rounded-field border border-line bg-surface-muted/40 p-1.5"
          >
            <input
              type="url"
              value={urlInput}
              onChange={(event) => setUrlInput(event.target.value)}
              placeholder="https://example.com/photo.jpg"
              aria-label="Image URL"
              className="h-7 min-w-0 flex-1 rounded-[6px] border border-line bg-surface px-2 text-[11px] text-ink outline-none focus:border-accent"
            />
            <Button
              type="submit"
              variant="primary"
              size="sm"
              disabled={!urlInput.trim() || Boolean(progress)}
            >
              Import
            </Button>
          </form>
        ) : null}

        <Button
          variant="secondary"
          size="sm"
          block
          leadingIcon={Sparkles}
          onClick={() => autofillUnusedPhotos()}
          disabled={unusedPhotoCount === 0}
        >
          Autofill ({unusedPhotoCount} unused)
        </Button>
      </div>

      {/* Upload / thumbnail progress */}
      {progress ? (
        <div
          role="status"
          className="flex flex-col gap-1.5 rounded-field border border-line bg-surface-muted/60 px-3 py-2"
        >
          <div className="flex items-center justify-between text-[10.5px] text-ink-muted">
            <span className="flex items-center gap-1.5">
              <Loader2 className="size-3 animate-spin" aria-hidden="true" />
              {progress.label}
            </span>
            <span className="font-mono tabular-nums">{pct}%</span>
          </div>
          <div className="h-1.5 w-full overflow-hidden rounded-full bg-line">
            <div
              className="h-full bg-accent transition-[width] duration-150"
              style={{ width: `${pct}%` }}
            />
          </div>
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
            description="Drop JPG, PNG, WebP, or HEIC files here. Originals stay in IndexedDB for 300 DPI print."
            className="border-0 bg-transparent py-6"
            action={
              <Button
                variant="secondary"
                size="sm"
                leadingIcon={Upload}
                onClick={() => inputRef.current?.click()}
              >
                Browse photos
              </Button>
            }
          />
        </div>
      ) : (
        <>
          {/* Controls bar: thumb zoom, sort, hide used, counter */}
          <div className="flex flex-col gap-2 rounded-field border border-line bg-surface-muted/40 p-2">
            <div className="flex items-center justify-between gap-2">
              {/* Thumbnail size zoom */}
              <div className="flex items-center gap-1" aria-label="Thumbnail size">
                <button
                  type="button"
                  aria-label="Smaller thumbnails"
                  disabled={columns === 4}
                  onClick={() =>
                    setColumns((prev) => (prev === 2 ? 3 : 4))
                  }
                  className="inline-flex size-6 items-center justify-center rounded border border-line bg-surface text-ink-muted hover:text-ink disabled:opacity-40"
                >
                  <ZoomOut className="size-3" />
                </button>
                <button
                  type="button"
                  aria-label="Larger thumbnails"
                  disabled={columns === 2}
                  onClick={() =>
                    setColumns((prev) => (prev === 4 ? 3 : 2))
                  }
                  className="inline-flex size-6 items-center justify-center rounded border border-line bg-surface text-ink-muted hover:text-ink disabled:opacity-40"
                >
                  <ZoomIn className="size-3" />
                </button>
              </div>

              {/* Sort dropdown */}
              <select
                aria-label="Sort photos"
                value={sortOrder}
                onChange={(event) =>
                  setSortOrder(event.target.value as SortOrder)
                }
                className="h-6 rounded border border-line bg-surface px-1.5 text-[10.5px] font-medium text-ink outline-none focus:border-accent"
              >
                <option value="earliest">Earliest added</option>
                <option value="latest">Latest added</option>
                <option value="name">Name (A–Z)</option>
              </select>

              <button
                type="button"
                aria-pressed={hideUsed}
                onClick={() => setHideUsed((prev) => !prev)}
                className={cn(
                  "inline-flex h-6 items-center gap-1 rounded border px-1.5 text-[10px] font-medium transition-colors",
                  hideUsed
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-ink-muted hover:text-ink",
                )}
              >
                <EyeOff className="size-2.5" aria-hidden="true" />
                Hide used
              </button>
            </div>

            <div className="flex items-center justify-between text-[10.5px] text-ink-muted">
              <span>
                {usedPhotoCount} used photos / {allPhotos.length} all
              </span>
              {selectedIds.length > 0 ? (
                <button
                  type="button"
                  onClick={handleBulkDelete}
                  className="inline-flex items-center gap-1 rounded bg-danger-soft px-1.5 py-0.5 text-[10px] font-semibold text-danger hover:opacity-90"
                >
                  <Trash2 className="size-2.5" aria-hidden="true" />
                  Delete ({selectedIds.length})
                </button>
              ) : (
                <span className="text-[10px] text-ink-subtle">
                  Drag onto a frame
                </span>
              )}
            </div>
          </div>

          {/* Drop zone + grid */}
          <div
            {...dragHandlers}
            className={cn(
              "rounded-field border border-transparent transition-colors",
              dragActive && "border-dashed border-accent bg-accent-soft/20 p-1",
            )}
          >
            {sortedAndFiltered.length === 0 ? (
              <p className="rounded-field border border-line bg-surface-muted/40 px-3 py-4 text-center text-[11px] text-ink-subtle">
                All uploaded photos are placed on pages.
              </p>
            ) : (
              <div
                className={cn(
                  "grid gap-2",
                  columns === 2 && "grid-cols-2",
                  columns === 3 && "grid-cols-3",
                  columns === 4 && "grid-cols-4",
                )}
              >
                {sortedAndFiltered.map((photo) => {
                  const isUsed = photo.usedCount > 0;
                  const isSelected = selectedIds.includes(photo.id);
                  return (
                    <div
                      key={photo.id}
                      className={cn(
                        "group relative aspect-square overflow-hidden rounded-field border bg-surface-muted transition-[border-color,box-shadow] duration-150",
                        isSelected
                          ? "border-danger ring-2 ring-danger/30"
                          : "border-line hover:border-accent",
                      )}
                    >
                      <button
                        type="button"
                        draggable
                        onDragStart={(event) => {
                          event.dataTransfer.setData(
                            "application/x-pressly-image",
                            JSON.stringify({
                              src: photo.src,
                              alt: photo.alt,
                            }),
                          );
                          event.dataTransfer.effectAllowed = "copy";
                        }}
                        onClick={() =>
                          placeOrFillPhoto({ src: photo.src, alt: photo.alt })
                        }
                        disabled={!pageEditable}
                        aria-label={`Place ${photo.alt || "image"} on ${pageLabel}`}
                        className="block h-full w-full text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        <AssetThumbnail
                          src={photo.src}
                          thumbSrc={photo.thumbSrc}
                          alt=""
                          className="h-full w-full object-cover transition-transform duration-200 ease-out-soft group-hover:scale-[1.03]"
                        />
                      </button>

                      {/* Multi-select checkbox for bulk delete */}
                      <button
                        type="button"
                        aria-label={`Select ${photo.alt || "photo"} for deletion`}
                        aria-pressed={isSelected}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleSelectId(photo.id);
                        }}
                        className={cn(
                          "absolute left-1.5 top-1.5 flex size-4 items-center justify-center rounded border text-white transition-opacity",
                          isSelected
                            ? "border-danger bg-danger opacity-100"
                            : "border-white/80 bg-black/35 opacity-0 group-hover:opacity-100 focus:opacity-100",
                        )}
                      >
                        {isSelected ? (
                          <Check className="size-2.5" strokeWidth={3} />
                        ) : null}
                      </button>

                      {isUsed ? (
                        <span
                          aria-label="Used on page"
                          className="pointer-events-none absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-accent-ink shadow-sm"
                        >
                          <Check className="size-2.5" strokeWidth={2.8} />
                        </span>
                      ) : null}

                      {columns <= 3 ? (
                        <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/65 to-transparent px-1.5 pb-1 pt-4 text-[9.5px] font-medium text-white">
                          {photo.alt || "Image"}
                        </span>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
