"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowRight,
  Circle,
  Clock,
  Hexagon,
  Minus,
  QrCode,
  Search,
  Sparkles,
  Square,
  Star,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import type {
  CustomStickerAsset,
  ShapeKind,
  StickerCategory,
} from "@/types";
import { useEditorStore } from "@/store";
import { useActivePage } from "@/store/selectors";
import { getPageLabel } from "@/lib/spreads";
import {
  loadCustomStickers,
  loadRecentStickerIds,
  recordRecentSticker,
  saveCustomStickers,
  STICKER_CATEGORIES,
  STICKERS,
  type StickerDefinition,
} from "@/lib/stickers";
import {
  createQrElement,
  createShapeElement,
  createStickerElement,
  DEFAULT_ACCENT,
  DEFAULT_TEXT_COLOR,
} from "@/lib/elements";
import {
  deleteOriginalMediaBlob,
  generateClientThumbnail,
  saveOriginalMediaBlob,
} from "@/lib/mediaStorage";
import { createId } from "@/lib/id";
import { round } from "@/lib/units";
import { StickerArt } from "@/components/editor/canvas/StickerArt";
import { PageContext, PanelSection } from "@/components/editor/sidebar/PanelSection";
import { ColorPicker } from "@/components/ui/color-picker";
import { EmptyState } from "@/components/editor/EmptyState";
import { cn } from "@/lib/cn";

const PAGE_SIZE = 24;

type FilterCategory = "All" | "Uploaded" | StickerCategory;

const SHAPE_TOOLS: Array<{
  kind: ShapeKind;
  label: string;
  icon: typeof Square;
}> = [
  { kind: "rectangle", label: "Rect", icon: Square },
  { kind: "ellipse", label: "Ellipse", icon: Circle },
  { kind: "line", label: "Line", icon: Minus },
  { kind: "arrow", label: "Arrow", icon: ArrowRight },
  { kind: "polygon", label: "Polygon", icon: Hexagon },
  { kind: "star", label: "Star", icon: Star },
];

export function StickersPanel() {
  const project = useEditorStore((state) => state.project);
  const addElement = useEditorStore((state) => state.addElement);
  const { page, pageIndex } = useActivePage();

  const [color, setColor] = useState(DEFAULT_TEXT_COLOR);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<FilterCategory>("All");
  const [qrInput, setQrInput] = useState("");
  const [recentIds, setRecentIds] = useState<string[]>(() =>
    typeof window !== "undefined" ? loadRecentStickerIds() : [],
  );
  const [customStickers, setCustomStickers] = useState<CustomStickerAsset[]>(
    () => (typeof window !== "undefined" ? loadCustomStickers() : []),
  );
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [uploading, setUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const sentinelRef = useRef<HTMLDivElement>(null);

  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";
  const pageEditable = Boolean(page && !page.isEndPaper && !page.locked);

  // Merge custom uploaded SVG/PNG stickers with built-in catalog items.
  const allItems = useMemo(() => {
    const customDefs: StickerDefinition[] = customStickers.map((asset) => ({
      id: asset.id,
      name: asset.name,
      category: asset.category,
      keywords: `uploaded custom ${asset.format} ${asset.name.toLowerCase()}`,
      format: asset.format,
      src: asset.src,
      viewBox: "0 0 24 24",
      paths: [],
    }));
    return [...customDefs, ...STICKERS];
  }, [customStickers]);

  const itemMap = useMemo(
    () => new Map(allItems.map((item) => [item.id, item])),
    [allItems],
  );

  const recentItems = useMemo(
    () =>
      recentIds
        .map((id) => itemMap.get(id))
        .filter((item): item is StickerDefinition => Boolean(item))
        .slice(0, 9),
    [recentIds, itemMap],
  );

  const filteredItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    const customIdSet = new Set(customStickers.map((c) => c.id));
    return allItems.filter((item) => {
      if (category === "Uploaded") {
        if (!customIdSet.has(item.id)) return false;
      } else if (category !== "All" && item.category !== category) {
        return false;
      }
      if (!q) return true;
      return (
        item.name.toLowerCase().includes(q) ||
        item.category.toLowerCase().includes(q) ||
        item.keywords.toLowerCase().includes(q)
      );
    });
  }, [allItems, customStickers, category, search]);

  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [category, search]);

  useEffect(() => {
    const root = scrollContainerRef.current;
    const target = sentinelRef.current;
    if (!root || !target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setVisibleCount((prev) =>
            prev < filteredItems.length
              ? Math.min(filteredItems.length, prev + PAGE_SIZE)
              : prev,
          );
        }
      },
      { root, rootMargin: "120px" },
    );
    observer.observe(target);
    return () => observer.disconnect();
  }, [filteredItems.length, visibleCount]);

  const visibleItems = useMemo(
    () => filteredItems.slice(0, visibleCount),
    [filteredItems, visibleCount],
  );

  const insertShape = (shape: ShapeKind) => {
    if (!page || !pageEditable) return;
    const isLinear = shape === "line" || shape === "arrow";
    const w = isLinear ? 56 : 36;
    const h = isLinear ? 10 : 36;
    addElement(
      page.id,
      createShapeElement(
        {
          x: round((project.pageSize.w - w) / 2, 1),
          y: round((project.pageSize.h - h) / 2, 1),
          width: w,
          height: h,
        },
        { shape },
      ),
    );
  };

  const insertQr = () => {
    if (!page || !pageEditable) return;
    const size = 32;
    addElement(
      page.id,
      createQrElement(
        {
          x: round((project.pageSize.w - size) / 2, 1),
          y: round((project.pageSize.h - size) / 2, 1),
          width: size,
          height: size,
        },
        { value: qrInput.trim() },
      ),
    );
  };

  const insertSticker = (sticker: StickerDefinition) => {
    if (!page || !pageEditable) return;
    const w = Math.max(20, Math.min(38, project.pageSize.w * 0.16));
    const h = sticker.aspectRatio ? round(w / sticker.aspectRatio, 1) : w;
    addElement(
      page.id,
      createStickerElement(
        {
          x: round((project.pageSize.w - w) / 2, 1),
          y: round((project.pageSize.h - h) / 2, 1),
          width: round(w, 1),
          height: round(h, 1),
        },
        {
          stickerId: sticker.id,
          color,
          src: sticker.format === "png" || sticker.src ? sticker.src : undefined,
          kind: sticker.format,
        },
      ),
    );
    setRecentIds(recordRecentSticker(sticker.id));
  };

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    setUploading(true);
    try {
      const nextAssets: CustomStickerAsset[] = [];
      for (const file of Array.from(fileList)) {
        const isSvg =
          file.type === "image/svg+xml" || /\.svg$/i.test(file.name);
        const isPng =
          file.type === "image/png" || /\.png$/i.test(file.name);
        if (!isSvg && !isPng) continue;

        const id = `custom-${createId()}`;
        const src = await saveOriginalMediaBlob(id, file);
        let thumbSrc: string | undefined;
        try {
          const generated = await generateClientThumbnail(file, 200);
          thumbSrc = generated.thumbSrc;
        } catch {
          /* SVG or fallback uses src directly */
        }
        nextAssets.push({
          id,
          name:
            file.name
              .replace(/\.[^.]+$/, "")
              .replace(/[-_]+/g, " ")
              .trim() || "Custom sticker",
          src,
          thumbSrc,
          format: isSvg ? "svg" : "png",
          category: "Vintage",
          createdAt: Date.now(),
        });
      }
      if (nextAssets.length > 0) {
        const merged = [...nextAssets, ...customStickers];
        saveCustomStickers(merged);
        setCustomStickers(merged);
        setCategory("Uploaded");
      }
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeleteCustom = (assetId: string) => {
    const next = customStickers.filter((item) => item.id !== assetId);
    saveCustomStickers(next);
    setCustomStickers(next);
    void deleteOriginalMediaBlob(assetId);
    if (next.length === 0 && category === "Uploaded") setCategory("All");
  };

  return (
    <div ref={scrollContainerRef} className="h-full overflow-y-auto px-4 py-4">
      <div className="flex flex-col gap-4 pb-4">
        <PageContext label={pageLabel} />

        {!pageEditable ? (
          <EmptyState
            title={page ? "Page is locked" : "No page selected"}
            description="Select an editable page on the canvas to add shapes, QR codes, or stickers."
            compact
          />
        ) : (
          <>
            {/* Shapes */}
            <PanelSection
              title="Shapes"
              description="Fill, gradients, stroke, corners, shadow & flip."
            >
              <div className="grid grid-cols-3 gap-1.5">
                {SHAPE_TOOLS.map((tool) => {
                  const Icon = tool.icon;
                  return (
                    <button
                      key={tool.kind}
                      type="button"
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData(
                          "application/x-pressly-shape",
                          JSON.stringify({ shape: tool.kind }),
                        );
                        e.dataTransfer.effectAllowed = "copy";
                      }}
                      onClick={() => insertShape(tool.kind)}
                      className="flex flex-col items-center justify-center gap-1 rounded-field border border-line bg-surface py-2 text-[10px] font-medium text-ink-muted transition-colors hover:border-accent hover:bg-accent-soft/30 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <Icon className="size-4" strokeWidth={1.7} aria-hidden="true" />
                      <span>{tool.label}</span>
                    </button>
                  );
                })}
              </div>
            </PanelSection>

            {/* Vector QR Code */}
            <PanelSection
              title="QR code"
              description="Vector modules stay sharp at any print size."
            >
              <div className="flex items-center gap-1.5">
                <input
                  type="text"
                  value={qrInput}
                  onChange={(e) => setQrInput(e.target.value)}
                  placeholder="Enter URL or text…"
                  aria-label="QR code URL or text"
                  className="h-8 min-w-0 flex-1 rounded-field border border-line bg-surface px-2.5 text-[11px] text-ink outline-none placeholder:text-ink-subtle focus:border-accent"
                />
                <button
                  type="button"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData(
                      "application/x-pressly-qr",
                      JSON.stringify({ value: qrInput }),
                    );
                    e.dataTransfer.effectAllowed = "copy";
                  }}
                  onClick={insertQr}
                  className="inline-flex h-8 shrink-0 items-center gap-1.5 rounded-field bg-accent px-2.5 text-[11px] font-medium text-accent-ink transition-opacity hover:opacity-90"
                >
                  <QrCode className="size-3.5" aria-hidden="true" />
                  Add
                </button>
              </div>
            </PanelSection>

            {/* Upload custom PNG/SVG sticker */}
            <div className="flex items-center gap-2">
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png,image/svg+xml,.png,.svg"
                multiple
                onChange={(e) => void handleUploadFiles(e.target.files)}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
                className="flex h-8 flex-1 items-center justify-center gap-1.5 rounded-field border border-dashed border-line-strong bg-surface-muted/50 px-3 text-[11px] font-medium text-ink transition-colors hover:border-accent hover:bg-accent-soft/20 hover:text-accent disabled:opacity-50"
              >
                <Upload className="size-3.5" aria-hidden="true" />
                <span>{uploading ? "Uploading…" : "Upload custom PNG / SVG"}</span>
              </button>
            </div>

            {/* Search & Categories */}
            <PanelSection
              title="Stickers library"
              description={`${filteredItems.length} SVG & PNG stickers`}
            >
              <div className="relative">
                <Search
                  className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-ink-subtle"
                  aria-hidden="true"
                />
                <input
                  type="search"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search travel, stamp, heart, tape…"
                  aria-label="Search stickers"
                  className="h-8 w-full rounded-field border border-line bg-surface pl-8 pr-7 text-[11px] text-ink outline-none placeholder:text-ink-subtle focus:border-accent"
                />
                {search ? (
                  <button
                    type="button"
                    aria-label="Clear sticker search"
                    onClick={() => setSearch("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-ink-subtle hover:text-ink"
                  >
                    <X className="size-3.5" />
                  </button>
                ) : null}
              </div>

              <div className="flex flex-wrap gap-1">
                {(
                  [
                    "All",
                    ...STICKER_CATEGORIES,
                    ...(customStickers.length > 0 ? (["Uploaded"] as const) : []),
                  ] as FilterCategory[]
                ).map((cat) => {
                  const active = category === cat;
                  return (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      aria-pressed={active}
                      className={cn(
                        "rounded-full border px-2.5 py-0.5 text-[10px] font-medium transition-colors",
                        active
                          ? "border-accent bg-accent text-accent-ink"
                          : "border-line bg-surface text-ink-muted hover:border-line-strong hover:text-ink",
                      )}
                    >
                      {cat}
                    </button>
                  );
                })}
              </div>

              {/* SVG Ink Colour */}
              <div className="flex items-center justify-between gap-2 pt-0.5">
                <span className="flex items-center gap-1 text-[10px] text-ink-subtle">
                  <Sparkles className="size-3" aria-hidden="true" />
                  SVG ink
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setColor(DEFAULT_TEXT_COLOR)}
                    aria-label="Ink dark navy"
                    className="size-4 rounded-full border border-line-strong bg-[#122056]"
                  />
                  <button
                    type="button"
                    onClick={() => setColor(DEFAULT_ACCENT)}
                    aria-label="Ink accent indigo"
                    className="size-4 rounded-full border border-line-strong bg-[#5B65DC]"
                  />
                  <ColorPicker
                    value={color}
                    onChange={setColor}
                    label="SVG sticker ink colour"
                  />
                </div>
              </div>
            </PanelSection>

            {/* Recently used */}
            {recentItems.length > 0 && !search && category === "All" ? (
              <PanelSection
                title="Recently used"
                action={
                  <Clock className="size-3 text-ink-subtle" aria-hidden="true" />
                }
              >
                <div className="grid grid-cols-3 gap-2">
                  {recentItems.map((sticker) => (
                    <StickerCard
                      key={`recent-${sticker.id}`}
                      sticker={sticker}
                      color={color}
                      onInsert={() => insertSticker(sticker)}
                      onDragStart={() => setRecentIds(recordRecentSticker(sticker.id))}
                    />
                  ))}
                </div>
              </PanelSection>
            ) : null}

            {/* Lazy-loaded infinite scroll grid */}
            <div className="grid grid-cols-3 gap-2">
              {visibleItems.map((sticker) => {
                const isCustom = customStickers.some((c) => c.id === sticker.id);
                const thumbUrl = isCustom
                  ? customStickers.find((c) => c.id === sticker.id)?.thumbSrc ??
                    sticker.src
                  : sticker.src;
                return (
                  <StickerCard
                    key={sticker.id}
                    sticker={sticker}
                    color={color}
                    thumbSrc={thumbUrl}
                    onInsert={() => insertSticker(sticker)}
                    onDelete={
                      isCustom ? () => handleDeleteCustom(sticker.id) : undefined
                    }
                    onDragStart={() => setRecentIds(recordRecentSticker(sticker.id))}
                  />
                );
              })}
            </div>

            {filteredItems.length === 0 ? (
              <EmptyState
                title="No matching stickers"
                description="Try another keyword or clear your category filter."
                compact
              />
            ) : null}

            {visibleCount < filteredItems.length ? (
              <div
                ref={sentinelRef}
                className="flex h-10 items-center justify-center text-[10.5px] text-ink-subtle"
              >
                Loading more stickers ({visibleCount} of {filteredItems.length})…
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function StickerCard({
  sticker,
  color,
  thumbSrc,
  onInsert,
  onDelete,
  onDragStart,
}: {
  sticker: StickerDefinition;
  color: string;
  thumbSrc?: string;
  onInsert: () => void;
  onDelete?: () => void;
  onDragStart?: () => void;
}) {
  return (
    <div className="group relative">
      <button
        type="button"
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            "application/x-pressly-sticker",
            JSON.stringify({
              stickerId: sticker.id,
              color,
              src: sticker.format === "png" || sticker.src ? sticker.src : undefined,
              kind: sticker.format,
              aspectRatio: sticker.aspectRatio,
            }),
          );
          e.dataTransfer.effectAllowed = "copy";
          onDragStart?.();
        }}
        onClick={onInsert}
        title={sticker.name}
        aria-label={`Add ${sticker.name} sticker`}
        className="flex aspect-square w-full flex-col items-center justify-center gap-1 rounded-field border border-line bg-surface p-1.5 transition-[border-color,box-shadow,background-color] duration-150 hover:border-accent hover:bg-surface-muted/70 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span className="flex size-12 items-center justify-center rounded-[6px] bg-[#FAFAFD] p-1">
          <span
            className="block size-10 transition-transform duration-200 group-hover:scale-105"
            style={{ color }}
          >
            <StickerArt
              stickerId={sticker.id}
              color={color}
              src={thumbSrc ?? sticker.src}
              name={sticker.name}
            />
          </span>
        </span>
        <span className="w-full truncate text-center text-[9px] font-medium text-ink-subtle">
          {sticker.name}
        </span>
      </button>
      {onDelete ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          aria-label={`Delete ${sticker.name}`}
          className="absolute right-1 top-1 hidden size-5 items-center justify-center rounded-full bg-surface/90 text-ink-subtle shadow-sm hover:text-danger group-hover:flex"
        >
          <Trash2 className="size-3" />
        </button>
      ) : null}
    </div>
  );
}
