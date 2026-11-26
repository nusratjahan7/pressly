# Pressly — Magazine & Photobook Studio

A spread-based browser studio for composing, laying out, and exporting print-ready magazines, lookbooks, and photobooks directly to PDF.

## Features

- **Physical Book Spreads**: Wrap-around cover (`Back cover | Spine | Front cover`), non-editable end papers, and interior facing spreads with binding rules (`Saddle stitch`, `Perfect bound`, `Hardcover`), dynamic spine calculation, bleed, and safe margins.
- **Konva Spread Canvas**: Millimetre-accurate interactive stage with pan/zoom (`Space + Drag`, scroll wheel, two-finger tablet pinch), multi-select (`Shift + Click`), snap guides, interactive layout gutter handles, inline text editing, and double-click photo panning & zooming.
- **Libraries & Assets**:
  - **Images**: Multi-file upload (JPG, PNG, WebP, HEIC, GIF, AVIF, SVG) & URL import stored full-resolution in IndexedDB (`pressly-media`), auto-fill unused photos, crop zoom/pan, filters (brightness, contrast, saturation, grayscale, blur), borders, and shadows.
  - **Templates**: Full-magazine JSON templates (`lib/templates.json`) with theme filters, live scaling across trim sizes, and replace-book vs. apply-to-spread confirmation.
  - **Layouts**: Single-page and cross-spine spread grids with photo reflow, favorites, live gutter/margin sliders, and quick on-canvas layout switching.
  - **Backgrounds**: Solid colors, custom gradients, vector patterns, paper textures, custom image layers, opacity, blur, recent colors, and automatic document photo color extraction.
  - **Stickers, Shapes & Vector QR**: 300+ SVG & PNG stickers organized by category with infinite scroll, custom PNG/SVG sticker upload, parametric vector shapes (rectangle, ellipse, line, arrow, polygon, star) with gradients, and crisp vector QR codes.
- **Inspector & Spread Layers**: Right-side contextual panel with `mm` coordinates, rotation, opacity, lock, alignment, distribution, flipping, z-order, plus a **Layers** tab for the current spread supporting rename, hide/show, lock/unlock, and drag-to-reorder.
- **50-Step Command Undo / Redo**: Every element, layout, template, background, and page/spread operation runs through reversible `EditorCommand` objects (`lib/history/commands.ts`).
- **Multi-Project IndexedDB Autosave & JSON Archives**: Automatic local persistence (`pressly` + `pressly-media`), live `Saved` indicator, and a **Projects Dashboard** for creating, opening, renaming, duplicating, deleting, and importing/exporting portable `.pressly.json` archives.
- **Print-Ready PDF Export (`pdf-lib`)**:
  - Presets for **Print-ready (300 DPI + bleed + optional crop/fold marks)** and **Digital (150 DPI)**.
  - **Single pages** (reading/print order with separate cover & spine sheets) or **Spreads** (wrap-around cover with spine width + facing spreads).
  - Pre-flight check for low-resolution images, empty frames, text outside safe margin, and missing fonts with **Jump to issue**.
  - Subsetted TTF font embedding via `@pdf-lib/fontkit`, vector paths for shapes/SVG stickers/QR codes, Web Worker raster offloading, cooperative chunking, and live progress/cancel modal.

## Setup

### Prerequisites
- Node.js 20+
- `pnpm`

### Install & Run

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in Chrome, Firefox, or Safari.

### Build & Typecheck

```bash
pnpm typecheck
pnpm build
```

## Architecture Notes

- **Canonical Geometry (`types/index.ts`, `lib/units.ts`)**: All coordinates, trim sizes, bleed, safe margins, and frame bounds are stored internally in **millimetres (`mm`)**. Viewport transforms (`lib/konva/geometry.ts`) and PDF output (`mmToPt`) convert from this canonical model.
- **State & Command History (`store/`)**: Zustand slices (`projectSlice`, `pagesSlice`, `elementsSlice`, `selectionSlice`, `historySlice`, `uiSlice`) route mutations through `executeCommand` or continuous-gesture `pushHistory`/`commitHistory` baselines capped at 50 commands.
- **IndexedDB Storage Split (`lib/projectStorage.ts`, `lib/mediaStorage.ts`)**: Document JSONs live in IndexedDB store `"pressly" / "documents"`, while original full-resolution media Blobs live in `"pressly-media" / "media-originals"` referenced by `idb:<assetId>`. Keeping separate `idb-keyval` DB names ensures stores initialize cleanly on every browser.
- **Viewport-Gated Thumbnails (`components/editor/thumbnails/`)**: `PageThumbnail` uses `IntersectionObserver` (`rootMargin: "240px"`) and a max-2 concurrency render queue keyed by content hashes (`lib/thumbnailCache.ts`) to stay responsive on 40+ page projects.
- **PDF Engine (`lib/pdf/`)**: `plan.ts` computes sheet order, spine width (`lib/binding.ts`), custom page ranges, and byte size estimates; `preflight.ts` audits print readiness; `rasterWorker.ts` offloads pixel resampling/encoding to an `OffscreenCanvas` Web Worker with main-thread fallback; `exportProject.ts` renders vectors and high-DPI rasters into `pdf-lib` with `AbortSignal` cancellation.
