"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import type { Element, ImageElement, TextElement } from "@/types";
import { useEditorStore } from "@/store";
import { useCurrentSpread } from "@/store/selectors";
import { useElementSize } from "@/lib/useElementSize";
import { formatDimensions, formatNumber, ptToPx, round } from "@/lib/units";
import {
  getEditablePageCount,
  getPageLabel,
  getSpreadLabel,
} from "@/lib/spreads";
import { getCoverDisplaySpineWidth } from "@/lib/binding";
import { DEFAULT_FRAME_GAP_MM, getLayoutById } from "@/lib/layouts";
import {
  createImageElement,
  createQrElement,
  createShapeElement,
  createStickerElement,
  createTextElement,
} from "@/lib/elements";
import {
  generateClientThumbnail,
  saveOriginalMediaBlob,
} from "@/lib/mediaStorage";
import { ensureGoogleFontLoaded } from "@/lib/fonts";
import { createId } from "@/lib/id";
import {
  getFitScale,
  getPageOffsetX,
  getSpreadLayout,
  screenToSpread,
} from "@/lib/konva/geometry";
import { useStagePanZoom } from "@/components/editor/canvas/konva/useStagePanZoom";
import {
  CropControlBar,
  FrameContextMenu,
  PhotoPickerModal,
  QuickPageActions,
  type ContextMenuState,
} from "@/components/editor/canvas/CanvasOverlays";
import { TextToolbar } from "@/components/editor/canvas/TextToolbar";
import { EmptyState } from "@/components/editor/EmptyState";
import { Button } from "@/components/ui/button";

// Konva touches `window` at import time, so the stage must never run on the server.
const SpreadStage = dynamic(
  () =>
    import("@/components/editor/canvas/konva/SpreadStage").then(
      (module) => module.SpreadStage,
    ),
  { ssr: false },
);

export function CanvasWorkspace() {
  const project = useEditorStore((state) => state.project);
  const showSafeMargin = useEditorStore((state) => state.ui.showSafeMargin);
  const showBleed = useEditorStore((state) => state.ui.showBleed);
  const layoutAnimSeq = useEditorStore((state) => state.ui.layoutAnimSeq);
  const layoutAnimPageIds = useEditorStore(
    (state) => state.ui.layoutAnimPageIds,
  );
  const setViewCenter = useEditorStore((state) => state.setViewCenter);
  const addSpread = useEditorStore((state) => state.addSpread);
  const selectedElementId = useEditorStore(
    (state) => state.selection.elementId,
  );
  const selectedElementIds = useEditorStore(
    (state) => state.selection.elementIds,
  );
  const spineSelected = useEditorStore((state) =>
    Boolean(state.selection.spineSelected),
  );
  const selectPage = useEditorStore((state) => state.selectPage);
  const selectSpine = useEditorStore((state) => state.selectSpine);
  const setSpineText = useEditorStore((state) => state.setSpineText);
  const applyLayout = useEditorStore((state) => state.applyLayout);
  const fillFramePhoto = useEditorStore((state) => state.fillFramePhoto);
  const addElement = useEditorStore((state) => state.addElement);
  const addMediaAssets = useEditorStore((state) => state.addMediaAssets);
  const updateElement = useEditorStore((state) => state.updateElement);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const { spread, spreads, spreadIndex } = useCurrentSpread();
  const { ref, size, element } = useElementSize<HTMLDivElement>();

  const [editingSpine, setEditingSpine] = useState(false);
  const [spineDraft, setSpineDraft] = useState("");
  const [quickLayoutPageId, setQuickLayoutPageId] = useState<string | null>(
    null,
  );
  const [photoPickerElementId, setPhotoPickerElementId] = useState<
    string | null
  >(null);
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null);
  const [croppingElementId, setCroppingElementId] = useState<string | null>(
    null,
  );
  const [editingText, setEditingText] = useState<{
    elementId: string;
    pageId: string;
    pageOffsetX: number;
    value: string;
  } | null>(null);
  const [dropHighlightPageId, setDropHighlightPageId] = useState<string | null>(
    null,
  );

  const pages = useMemo(
    () =>
      spread?.pageIndices
        .map((pageIndex) => project.pages[pageIndex])
        .filter((page): page is NonNullable<typeof page> => Boolean(page)) ?? [],
    [spread, project.pages],
  );

  const isCover = Boolean(spread?.isCover);
  const spineWidth = useMemo(
    () =>
      isCover
        ? getCoverDisplaySpineWidth(
            project.pageSize.binding,
            getEditablePageCount(project.pages),
          )
        : 0,
    [isCover, project.pageSize.binding, project.pages],
  );

  const pageLabels = useMemo(
    () =>
      spread?.pageIndices.map((pageIndex) =>
        getPageLabel(pageIndex, project.pages).toLowerCase(),
      ) ?? [],
    [spread, project.pages],
  );

  const displayPageCount = isCover ? pages.length : Math.max(2, pages.length);
  const layout = useMemo(
    () => getSpreadLayout(project.pageSize, displayPageCount, spineWidth),
    [project.pageSize, displayPageCount, spineWidth],
  );

  const fitScale = useMemo(
    () => getFitScale(layout, size.width, size.height),
    [layout, size.width, size.height],
  );

  const centredFor = useRef<string | null>(null);
  useEffect(() => {
    if (size.width === 0 || size.height === 0) return;
    const key = `${spreadIndex}:${layout.spreadWidth}x${layout.spreadHeight}`;
    if (centredFor.current === key) return;
    centredFor.current = key;
    setViewCenter({
      x: layout.spreadWidth / 2,
      y: layout.spreadHeight / 2,
    });
  }, [
    size.width,
    size.height,
    spreadIndex,
    layout.spreadWidth,
    layout.spreadHeight,
    setViewCenter,
  ]);

  useEffect(() => {
    setQuickLayoutPageId(null);
    setCroppingElementId(null);
    setEditingText(null);
    setContextMenu(null);
    if (!isCover) setEditingSpine(false);
  }, [spreadIndex, isCover]);

  useEffect(() => {
    if (!croppingElementId) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" || event.key === "Enter") {
        event.preventDefault();
        setCroppingElementId(null);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [croppingElementId]);

  const { transform, cursor, handlers } = useStagePanZoom({
    container: element,
    layout,
    fitScale,
    containerWidth: size.width,
    containerHeight: size.height,
  });

  const spreadLabel = spread
    ? getSpreadLabel(spread, project.pages)
    : "No spread";
  const resolvedSpineText = project.spineText ?? project.name;
  const ready = pages.length > 0 && size.width > 0 && size.height > 0;

  const openSpineEditor = () => {
    if (!isCover) return;
    selectSpine();
    setSpineDraft(resolvedSpineText);
    setEditingSpine(true);
  };

  const commitSpineEditor = () => {
    setSpineText(spineDraft);
    setEditingSpine(false);
  };

  const croppingElement = useMemo((): ImageElement | null => {
    if (!croppingElementId) return null;
    for (const p of pages) {
      const found = p.elements.find(
        (el): el is ImageElement =>
          el.id === croppingElementId && el.type === "image" && Boolean(el.src),
      );
      if (found) return found;
    }
    return null;
  }, [croppingElementId, pages]);

  const selectedTextContext = useMemo((): {
    element: TextElement;
    pageId: string;
    pageOffsetX: number;
  } | null => {
    const targetId = editingText?.elementId ?? selectedElementId;
    if (!targetId) return null;
    for (let index = 0; index < pages.length; index += 1) {
      const p = pages[index]!;
      const found = p.elements.find(
        (el): el is TextElement => el.id === targetId && el.type === "text",
      );
      if (found) {
        return {
          element: found,
          pageId: p.id,
          pageOffsetX: getPageOffsetX(index, layout),
        };
      }
    }
    return null;
  }, [editingText?.elementId, selectedElementId, pages, layout]);

  const addAndEditText = (pageId: string, localX?: number, localY?: number) => {
    const indexInSpread = pages.findIndex((p) => p.id === pageId);
    if (indexInSpread < 0) return;
    const page = pages[indexInSpread]!;
    if (page.isEndPaper || page.locked) return;

    const w = Math.min(110, project.pageSize.w * 0.6);
    const h = 16;
    const x =
      localX !== undefined
        ? Math.max(4, Math.min(project.pageSize.w - w - 4, localX - w / 2))
        : (project.pageSize.w - w) / 2;
    const y =
      localY !== undefined
        ? Math.max(4, Math.min(project.pageSize.h - h - 4, localY - h / 2))
        : project.pageSize.h * 0.25;

    const created = createTextElement(
      { x: round(x, 1), y: round(y, 1), width: round(w, 1), height: h },
      {
        text: "Your text here",
        fontSize: 20,
        fontWeight: 600,
        align: "center",
        boxMode: "auto",
      },
    );
    addElement(pageId, created);
    setEditingText({
      elementId: created.id,
      pageId,
      pageOffsetX: getPageOffsetX(indexInSpread, layout),
      value: created.text,
    });
  };

  const hitTestSpread = (clientX: number, clientY: number) => {
    if (!element) return null;
    const rect = element.getBoundingClientRect();
    const pt = screenToSpread(
      clientX - rect.left,
      clientY - rect.top,
      transform,
    );
    for (let index = 0; index < pages.length; index += 1) {
      const candidate = pages[index]!;
      if (candidate.isEndPaper || candidate.locked) continue;
      const offsetX = getPageOffsetX(index, layout);
      if (
        pt.x >= offsetX &&
        pt.x <= offsetX + layout.pageWidth &&
        pt.y >= 0 &&
        pt.y <= layout.pageHeight
      ) {
        const localX = pt.x - offsetX;
        const localY = pt.y;
        const imageFrame = [...candidate.elements]
          .sort((a, b) => b.zIndex - a.zIndex)
          .find(
            (el): el is ImageElement =>
              el.type === "image" &&
              localX >= el.x &&
              localX <= el.x + el.width &&
              localY >= el.y &&
              localY <= el.y + el.height,
          );
        return { page: candidate, localX, localY, imageFrame };
      }
    }
    return null;
  };

  const handleWorkspaceDragOver = (event: React.DragEvent<HTMLElement>) => {
    const types = Array.from(event.dataTransfer.types);
    const accepts =
      types.includes("application/x-pressly-layout") ||
      types.includes("application/x-pressly-image") ||
      types.includes("application/x-pressly-sticker") ||
      types.includes("application/x-pressly-shape") ||
      types.includes("application/x-pressly-qr") ||
      types.includes("Files");
    if (!accepts) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    const hit = hitTestSpread(event.clientX, event.clientY);
    setDropHighlightPageId(hit?.page.id ?? null);
  };

  const handleWorkspaceDrop = async (event: React.DragEvent<HTMLElement>) => {
    setDropHighlightPageId(null);
    const layoutId = event.dataTransfer.getData("application/x-pressly-layout");
    const imageJson = event.dataTransfer.getData("application/x-pressly-image");
    const stickerJson = event.dataTransfer.getData("application/x-pressly-sticker");
    const shapeJson = event.dataTransfer.getData("application/x-pressly-shape");
    const qrJson = event.dataTransfer.getData("application/x-pressly-qr");
    const files = event.dataTransfer.files;

    if (
      !layoutId &&
      !imageJson &&
      !stickerJson &&
      !shapeJson &&
      !qrJson &&
      (!files || files.length === 0)
    ) {
      return;
    }
    event.preventDefault();

    const hit = hitTestSpread(event.clientX, event.clientY);
    const targetPage =
      hit?.page ??
      pages.find((candidate) => !candidate.isEndPaper && !candidate.locked);
    if (!targetPage) return;

    if (stickerJson) {
      try {
        const parsed = JSON.parse(stickerJson) as {
          stickerId: string;
          color?: string;
          src?: string;
          kind?: "svg" | "png";
          aspectRatio?: number;
        };
        const w = Math.max(20, Math.min(38, project.pageSize.w * 0.16));
        const h = parsed.aspectRatio ? round(w / parsed.aspectRatio, 1) : w;
        const x = hit
          ? Math.max(0, Math.min(project.pageSize.w - w, hit.localX - w / 2))
          : (project.pageSize.w - w) / 2;
        const y = hit
          ? Math.max(0, Math.min(project.pageSize.h - h, hit.localY - h / 2))
          : (project.pageSize.h - h) / 2;
        addElement(
          targetPage.id,
          createStickerElement(
            { x: round(x, 1), y: round(y, 1), width: round(w, 1), height: round(h, 1) },
            {
              stickerId: parsed.stickerId,
              color: parsed.color ?? "#122056",
              src: parsed.src,
              kind: parsed.kind,
            },
          ),
        );
      } catch {
        /* ignore malformed sticker drag payload */
      }
      return;
    }

    if (shapeJson) {
      try {
        const parsed = JSON.parse(shapeJson) as {
          shape: "rectangle" | "ellipse" | "line" | "arrow" | "polygon" | "star";
        };
        const isLinear = parsed.shape === "line" || parsed.shape === "arrow";
        const w = isLinear ? 56 : 36;
        const h = isLinear ? 10 : 36;
        const x = hit
          ? Math.max(0, Math.min(project.pageSize.w - w, hit.localX - w / 2))
          : (project.pageSize.w - w) / 2;
        const y = hit
          ? Math.max(0, Math.min(project.pageSize.h - h, hit.localY - h / 2))
          : (project.pageSize.h - h) / 2;
        addElement(
          targetPage.id,
          createShapeElement(
            { x: round(x, 1), y: round(y, 1), width: w, height: h },
            { shape: parsed.shape },
          ),
        );
      } catch {
        /* ignore malformed shape drag payload */
      }
      return;
    }

    if (qrJson) {
      try {
        const parsed = JSON.parse(qrJson) as { value?: string };
        const sizeMm = 32;
        const x = hit
          ? Math.max(0, Math.min(project.pageSize.w - sizeMm, hit.localX - sizeMm / 2))
          : (project.pageSize.w - sizeMm) / 2;
        const y = hit
          ? Math.max(0, Math.min(project.pageSize.h - sizeMm, hit.localY - sizeMm / 2))
          : (project.pageSize.h - sizeMm) / 2;
        addElement(
          targetPage.id,
          createQrElement(
            { x: round(x, 1), y: round(y, 1), width: sizeMm, height: sizeMm },
            { value: parsed.value || "https://pressly.studio" },
          ),
        );
      } catch {
        /* ignore malformed qr drag payload */
      }
      return;
    }

    if (layoutId) {
      const def = getLayoutById(layoutId);
      if (!def) return;
      applyLayout(targetPage.id, def, {
        gapMm: targetPage.layoutMeta?.gapMm ?? DEFAULT_FRAME_GAP_MM,
        marginMm: targetPage.layoutMeta?.marginMm ?? project.pageSize.safeMargin,
      });
      return;
    }

    const placePhoto = (photo: { src: string; alt: string }) => {
      if (hit?.imageFrame) {
        fillFramePhoto(hit.imageFrame.id, photo);
        return;
      }
      const emptyFrame = targetPage.elements
        .filter((el): el is ImageElement => el.type === "image" && !el.src)
        .sort((a, b) => b.width * b.height - a.width * a.height)[0];
      if (emptyFrame) {
        fillFramePhoto(emptyFrame.id, photo);
        return;
      }
      const w = Math.min(80, project.pageSize.w * 0.45);
      const h = Math.min(80, project.pageSize.h * 0.35);
      const x = hit
        ? Math.max(0, Math.min(project.pageSize.w - w, hit.localX - w / 2))
        : (project.pageSize.w - w) / 2;
      const y = hit
        ? Math.max(0, Math.min(project.pageSize.h - h, hit.localY - h / 2))
        : (project.pageSize.h - h) / 2;
      addElement(
        targetPage.id,
        createImageElement(
          { x, y, width: w, height: h },
          { src: photo.src, alt: photo.alt, fit: "cover" },
        ),
      );
    };

    if (imageJson) {
      try {
        const parsed = JSON.parse(imageJson) as { src: string; alt: string };
        if (parsed.src) placePhoto(parsed);
      } catch {
        /* ignore malformed drag payload */
      }
      return;
    }

    if (files && files.length > 0) {
      const imageFile = Array.from(files).find(
        (f) =>
          f.type.startsWith("image/") ||
          /\.(jpe?g|png|webp|gif|heic|heif)$/i.test(f.name),
      );
      if (!imageFile) return;
      try {
        const assetId = createId();
        const { thumbSrc, width, height } = await generateClientThumbnail(
          imageFile,
          320,
        );
        const src = await saveOriginalMediaBlob(assetId, imageFile);
        const alt =
          imageFile.name
            .replace(/\.[^.]+$/, "")
            .replace(/[-_]+/g, " ")
            .trim() || "Dropped image";
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
        placePhoto({ src, alt });
      } catch {
        /* ignore undecodable file */
      }
    }
  };

  const handleDoubleClickFrame = (frame: Element, pageId: string) => {
    if (frame.type === "image" && frame.src) {
      setCroppingElementId(frame.id);
      return;
    }
    if (frame.type === "text") {
      const pageIndexInSpread = pages.findIndex((p) => p.id === pageId);
      if (pageIndexInSpread < 0) return;
      ensureGoogleFontLoaded(frame.fontFamily);
      setEditingText({
        elementId: frame.id,
        pageId,
        pageOffsetX: getPageOffsetX(pageIndexInSpread, layout),
        value: frame.isPlaceholder ? "" : frame.text,
      });
    }
  };

  const commitInlineText = (value: string) => {
    if (!editingText) return;
    const trimmed = value.trim();
    updateElement(editingText.elementId, {
      text: trimmed.length > 0 ? value : "text",
      color:
        trimmed.length > 0
          ? selectedTextContext?.element.isPlaceholder
            ? "#122056"
            : (selectedTextContext?.element.color ?? "#122056")
          : "#D4A3B8",
      isPlaceholder: trimmed.length === 0,
    });
    setEditingText(null);
  };

  const spineCenterLeft =
    layout.spineX !== null
      ? Math.max(
          110,
          Math.min(
            size.width - 110,
            transform.panX +
              (layout.spineX + layout.spineWidth / 2) * transform.scale,
          ),
        )
      : size.width / 2;
  const spineCenterTop = Math.max(
    48,
    Math.min(
      size.height - 48,
      transform.panY + (layout.spreadHeight / 2) * transform.scale,
    ),
  );

  const spreadTopPx = Math.max(56, transform.panY + 12);

  return (
    <section
      ref={ref}
      aria-label="Canvas workspace"
      className="dotted-canvas relative min-h-0 flex-1 overflow-hidden overscroll-contain"
      style={{ cursor }}
      onDragOver={handleWorkspaceDragOver}
      onDragLeave={() => setDropHighlightPageId(null)}
      onDrop={(event) => void handleWorkspaceDrop(event)}
      {...handlers}
    >
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex max-w-[calc(100%-2rem)] items-center gap-2 rounded-full border border-line bg-surface/85 px-3 py-1.5 text-[11px] shadow-sm backdrop-blur">
        <span className="truncate font-semibold text-ink">{spreadLabel}</span>
        <span
          aria-hidden="true"
          className="size-1 shrink-0 rounded-full bg-line-strong"
        />
        <span className="whitespace-nowrap text-ink-muted">
          {formatDimensions(project.pageSize.w, project.pageSize.h)}
        </span>
        <span
          aria-hidden="true"
          className="hidden size-1 rounded-full bg-line-strong md:inline-block"
        />
        <span className="hidden text-ink-subtle md:inline">
          Bleed {formatNumber(project.pageSize.bleed, 1)} mm
        </span>
      </div>

      {ready ? (
        <SpreadStage
          width={size.width}
          height={size.height}
          panX={transform.panX}
          panY={transform.panY}
          scale={transform.scale}
          pageSize={project.pageSize}
          pages={pages}
          pageLabels={pageLabels}
          spineText={resolvedSpineText}
          isCover={isCover}
          spineWidth={spineWidth}
          spineSelected={spineSelected && isCover}
          showSafeMargin={showSafeMargin}
          showBleed={showBleed}
          selectedElementId={selectedElementId}
          selectedElementIds={selectedElementIds}
          croppingElementId={croppingElementId}
          dropHighlightPageId={dropHighlightPageId}
          animSeq={layoutAnimSeq}
          animPageIds={layoutAnimPageIds}
          onSelectPage={(id) => {
            setCroppingElementId(null);
            setEditingText(null);
            selectPage(id);
          }}
          onDoubleClickEmptyPage={(pageId, localX, localY) => {
            addAndEditText(pageId, localX, localY);
          }}
          onSelectSpine={() => {
            setCroppingElementId(null);
            setEditingText(null);
            selectSpine();
          }}
          onEditSpine={openSpineEditor}
          onClearSelection={() => {
            setEditingSpine(false);
            setCroppingElementId(null);
            setQuickLayoutPageId(null);
            setContextMenu(null);
            setEditingText(null);
            clearSelection();
          }}
          onOpenPhotoPicker={(elementId) => setPhotoPickerElementId(elementId)}
          onDoubleClickFrame={handleDoubleClickFrame}
          onContextMenuFrame={(frame, pageId, clientX, clientY) =>
            setContextMenu({
              element: frame,
              pageId,
              x: clientX,
              y: clientY,
            })
          }
        />
      ) : pages.length === 0 ? (
        <div className="flex h-full items-center justify-center">
          <EmptyState
            title="A blank issue"
            description="Add a spread to begin composing your publication."
            action={
              <Button variant="primary" size="sm" onClick={addSpread}>
                Add spread
              </Button>
            }
          />
        </div>
      ) : null}

      {/* Quick "A+ text" & "layout" buttons beside each editable page */}
      {ready
        ? pages.map((page, index) => {
            if (page.isEndPaper || page.locked) return null;
            const side = index === 0 ? "left" : "right";
            const anchorXPx =
              side === "left"
                ? Math.max(64, transform.panX - 10)
                : Math.min(
                    size.width - 64,
                    transform.panX + layout.spreadWidth * transform.scale + 10,
                  );
            return (
              <QuickPageActions
                key={`quick-actions-${page.id}`}
                page={page}
                pageSize={project.pageSize}
                side={side}
                topPx={spreadTopPx}
                anchorXPx={anchorXPx}
                layoutOpen={quickLayoutPageId === page.id}
                onToggleLayout={() =>
                  setQuickLayoutPageId((prev) =>
                    prev === page.id ? null : page.id,
                  )
                }
                onCloseLayout={() => setQuickLayoutPageId(null)}
                onAddText={() => addAndEditText(page.id)}
              />
            );
          })
        : null}

      {/* Floating Text Toolbar when any text element is selected or edited inline */}
      {ready && selectedTextContext
        ? (() => {
            const elTopPx =
              transform.panY + selectedTextContext.element.y * transform.scale;
            const elBottomPx =
              transform.panY +
              (selectedTextContext.element.y +
                selectedTextContext.element.height) *
                transform.scale;
            const placeBelow = elTopPx < 104;
            const anchorTopPx = placeBelow
              ? Math.min(size.height - 64, elBottomPx + 14)
              : elTopPx - 14;

            return (
              <TextToolbar
                element={selectedTextContext.element}
                pageId={selectedTextContext.pageId}
                pageWidthMm={project.pageSize.w}
                pageHeightMm={project.pageSize.h}
                anchorTopPx={anchorTopPx}
                placeBelow={placeBelow}
              />
            );
          })()
        : null}

      {/* Inline spine editor */}
      {editingSpine && isCover ? (
        <div
          className="absolute z-20 -translate-x-1/2 -translate-y-1/2 rounded-field border border-accent bg-surface p-1.5 shadow-panel"
          style={{ left: spineCenterLeft, top: spineCenterTop }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <input
            type="text"
            autoFocus
            value={spineDraft}
            maxLength={80}
            aria-label="Edit spine text"
            placeholder="Spine text"
            onChange={(event) => setSpineDraft(event.target.value)}
            onBlur={commitSpineEditor}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitSpineEditor();
              } else if (event.key === "Escape") {
                event.preventDefault();
                setEditingSpine(false);
              }
            }}
            className="h-7 w-44 rounded-[6px] border border-line bg-surface-muted/50 px-2 text-center text-[11.5px] font-medium text-ink outline-none focus:border-accent"
          />
        </div>
      ) : null}

      {/* Inline text editor directly over the canvas element */}
      {editingText && selectedTextContext ? (
        <div
          className="absolute z-20 rounded-[2px] border border-accent bg-surface/95 shadow-sm"
          style={{
            left:
              transform.panX +
              (editingText.pageOffsetX + selectedTextContext.element.x) *
                transform.scale,
            top:
              transform.panY + selectedTextContext.element.y * transform.scale,
            width: Math.max(
              90,
              selectedTextContext.element.width * transform.scale,
            ),
            minHeight: Math.max(
              28,
              selectedTextContext.element.height * transform.scale,
            ),
          }}
          onPointerDown={(event) => event.stopPropagation()}
        >
          <textarea
            autoFocus
            value={editingText.value}
            placeholder="Type here…"
            onChange={(event) => {
              const val = event.target.value;
              setEditingText((prev) =>
                prev ? { ...prev, value: val } : null,
              );
              const el = selectedTextContext.element;
              const patch: Partial<TextElement> = {
                text: val,
                isPlaceholder: false,
              };
              if (el.boxMode !== "fixed") {
                const approxHeightMm = Math.max(
                  10,
                  round(
                    event.target.scrollHeight / Math.max(transform.scale, 0.1),
                    1,
                  ),
                );
                if (Math.abs(approxHeightMm - el.height) > 1) {
                  patch.height = approxHeightMm;
                }
              }
              updateElement(el.id, patch, { commit: false });
            }}
            onBlur={() => commitInlineText(editingText.value)}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                event.preventDefault();
                commitInlineText(editingText.value);
              }
            }}
            style={{
              fontFamily: `"${selectedTextContext.element.fontFamily}", var(--font-montserrat), sans-serif`,
              fontSize: ptToPx(
                selectedTextContext.element.fontSize,
                transform.scale,
              ),
              fontWeight: selectedTextContext.element.fontWeight,
              fontStyle: selectedTextContext.element.fontStyle ?? "normal",
              textDecoration:
                selectedTextContext.element.textDecoration ?? "none",
              textTransform:
                selectedTextContext.element.textTransform ?? "none",
              lineHeight: selectedTextContext.element.lineHeight,
              letterSpacing: ptToPx(
                selectedTextContext.element.letterSpacing,
                transform.scale,
              ),
              color: selectedTextContext.element.isPlaceholder
                ? "#122056"
                : selectedTextContext.element.color,
              textAlign: selectedTextContext.element.align,
              minHeight: Math.max(
                28,
                selectedTextContext.element.height * transform.scale,
              ),
            }}
            className="w-full resize-none bg-transparent p-0.5 outline-none"
          />
        </div>
      ) : null}

      {/* Crop pan/zoom bar when double-clicking a filled frame */}
      {croppingElement ? (
        <CropControlBar
          element={croppingElement}
          onDone={() => setCroppingElementId(null)}
        />
      ) : null}

      {/* Right-click frame menu */}
      <FrameContextMenu
        menu={contextMenu}
        onClose={() => setContextMenu(null)}
        onReplacePhoto={(elementId) => setPhotoPickerElementId(elementId)}
      />

      {/* Photo picker modal */}
      <PhotoPickerModal
        targetElementId={photoPickerElementId}
        onClose={() => setPhotoPickerElementId(null)}
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-4 right-5 hidden items-center gap-2 font-mono text-[10px] uppercase tracking-[0.16em] text-ink-subtle lg:flex"
      >
        <span>
          Spread {spreadIndex + 1} of {spreads.length}
        </span>
      </div>
    </section>
  );
}
