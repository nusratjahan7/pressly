"use client";

import { useMemo, useRef, useState } from "react";
import { AlertCircle, Loader2, Upload } from "lucide-react";
import type { ImageElement } from "@/types";
import { useEditorStore } from "@/store";
import { useActivePage } from "@/store/selectors";
import { getPageLabel } from "@/lib/spreads";
import { createImageElement } from "@/lib/elements";
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

function getImageDimensions(src: string): Promise<{ width: number; height: number }> {
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
  const selectElement = useEditorStore((state) => state.selectElement);
  const selectedElementId = useEditorStore(
    (state) => state.selection.elementId,
  );
  const { page, pageIndex } = useActivePage();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState(false);

  const images = useMemo(
    () =>
      project.pages.flatMap((candidate, candidateIndex) =>
        candidate.elements
          .filter((element): element is ImageElement => element.type === "image")
          .map((element) => ({
            element,
            pageId: candidate.id,
            pageIndex: candidateIndex,
          })),
      ),
    [project.pages],
  );

  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";

  const addFiles = async (fileList: FileList | File[]) => {
    if (!page) return;
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
      const created: ImageElement[] = [];
      const batch = imagesOnly.slice(0, MAX_FILES);

      for (const [index, file] of batch.entries()) {
        const src = await readAsDataUrl(file);
        const dimensions = await getImageDimensions(src);
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
        const alt = file.name
          .replace(/\.[^.]+$/, "")
          .replace(/[-_]+/g, " ")
          .trim();

        created.push(
          createImageElement(
            {
              x: Math.round(x * 10) / 10,
              y: Math.round(y * 10) / 10,
              width: Math.round(width * 10) / 10,
              height: Math.round(height * 10) / 10,
            },
            { src, alt: alt || "Untitled image", fit: "cover" },
          ),
        );
      }

      if (created.length > 0) {
        addElements(page.id, created);
        selectElement(page.id, created[created.length - 1]!.id);
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
      if (!page) return;
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

      {!page ? (
        <EmptyState
          title="No page selected"
          description="Select a page on the canvas to place images."
          compact
        />
      ) : images.length === 0 ? (
        <div
          {...dragHandlers}
          className={cn(
            "rounded-ui border border-dashed border-line-strong bg-surface-muted/30 transition-colors duration-150",
            dragActive && "border-accent bg-accent-soft/40",
          )}
        >
          <EmptyState
            title="Bring in photography"
            description="Drop JPG, PNG, or WebP files here, or browse your device. Images are placed at print resolution."
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
              {dragActive ? "Drop to place on this page" : "Drop more images here"}
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

          <PanelSection title={`Placed images · ${images.length}`}>
            <div className="grid grid-cols-2 gap-2">
              {images.map(({ element, pageId, pageIndex: imagePageIndex }) => {
                const selected = selectedElementId === element.id;
                return (
                  <button
                    key={element.id}
                    type="button"
                    onClick={() => selectElement(pageId, element.id)}
                    aria-label={`Select ${element.alt || "image"} on ${getPageLabel(imagePageIndex, project.pages)}`}
                    aria-pressed={selected}
                    className={cn(
                      "group relative aspect-square overflow-hidden rounded-field border bg-surface-muted text-left transition-[border-color,box-shadow] duration-150",
                      selected
                        ? "border-accent ring-2 ring-accent/25"
                        : "border-line hover:border-line-strong",
                    )}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={element.src}
                      alt=""
                      loading="lazy"
                      className="h-full w-full object-cover transition-transform duration-200 ease-out-soft group-hover:scale-[1.02]"
                    />
                    <span className="absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/65 to-transparent px-2 pb-1.5 pt-5 text-[10px] font-medium text-white">
                      {element.alt || "Image"}
                    </span>
                  </button>
                );
              })}
            </div>
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
