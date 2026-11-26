import type { Page, Project } from "@/types";
import { getSpineWidth } from "@/lib/binding";
import {
  getEditablePageCount,
  getPageLabel,
  getShortSpreadLabel,
  getSpreads,
} from "@/lib/spreads";

export type PdfPreset = "print" | "digital";
export type PdfLayoutMode = "single" | "spreads";

export interface PdfExportOptions {
  preset?: PdfPreset;
  layoutMode?: PdfLayoutMode;
  includeBleed?: boolean;
  cropMarks?: boolean;
  dpi?: number;
  /** 0.5..1 or 50..100 (normalized automatically). */
  quality?: number;
  /** Empty = all sheets; e.g. "1-4, 6". */
  pageRange?: string;
}

export type PdfSheet =
  | {
      kind: "single";
      sheetNumber: number;
      label: string;
      page: Page;
      widthMm: number;
      heightMm: number;
      leftPartner?: Page;
    }
  | {
      kind: "spine";
      sheetNumber: number;
      label: string;
      coverPage: Page;
      spineWidthMm: number;
      heightMm: number;
    }
  | {
      kind: "spread-cover";
      sheetNumber: number;
      label: string;
      backPage: Page;
      frontPage: Page;
      spineWidthMm: number;
      pageWidthMm: number;
      heightMm: number;
    }
  | {
      kind: "spread-interior";
      sheetNumber: number;
      label: string;
      leftPage: Page | null;
      rightPage: Page | null;
      pageWidthMm: number;
      heightMm: number;
    };

export interface PdfExportPlan {
  allSheets: PdfSheet[];
  selectedSheets: PdfSheet[];
  spineWidthMm: number;
  dpi: number;
  quality: number;
  bleedMm: number;
  cropMarks: boolean;
  rangeError: string | null;
}

export function normalizeQuality(raw?: number): number {
  if (raw === undefined || !Number.isFinite(raw)) return 0.9;
  const pct = raw > 1 ? raw / 100 : raw;
  return Math.min(1, Math.max(0.5, pct));
}

export function parsePageRange(
  input: string,
  total: number,
): { indices: number[]; error: string | null } {
  const trimmed = input.trim();
  if (!trimmed) {
    return {
      indices: Array.from({ length: total }, (_, i) => i + 1),
      error: null,
    };
  }
  if (total <= 0) return { indices: [], error: null };

  const picked = new Set<number>();
  const tokens = trimmed.split(",").map((t) => t.trim()).filter(Boolean);
  if (tokens.length === 0) {
    return { indices: [], error: "Enter page numbers such as 1-4, 6." };
  }

  for (const token of tokens) {
    const singleMatch = /^(\d+)$/.exec(token);
    if (singleMatch) {
      const n = Number(singleMatch[1]);
      if (n < 1 || n > total) {
        return {
          indices: [],
          error: `Sheet ${n} is out of range (1–${total}).`,
        };
      }
      picked.add(n);
      continue;
    }
    const rangeMatch = /^(\d+)\s*-\s*(\d+)$/.exec(token);
    if (rangeMatch) {
      const start = Number(rangeMatch[1]);
      const end = Number(rangeMatch[2]);
      if (start < 1 || end > total || start > end) {
        return {
          indices: [],
          error: `Invalid range "${token}" (valid: 1–${total}).`,
        };
      }
      for (let i = start; i <= end; i += 1) picked.add(i);
      continue;
    }
    return {
      indices: [],
      error: `Could not parse "${token}". Use formats like 1-4, 6.`,
    };
  }

  return {
    indices: Array.from(picked).sort((a, b) => a - b),
    error: null,
  };
}

/**
 * Builds an ordered list of PDF sheets honoring:
 * - Single pages (Front cover, physical Spine if binding > 0, Pages 1..N, Back cover)
 * - Spreads (Wrap-around Cover [Back + Spine + Front], followed by interior spreads)
 * - Page range filtering
 */
export function buildPdfExportPlan(
  project: Project,
  options: PdfExportOptions = {},
): PdfExportPlan {
  const preset: PdfPreset = options.preset ?? "print";
  const layoutMode: PdfLayoutMode = options.layoutMode ?? "single";
  const dpi = options.dpi ?? (preset === "digital" ? 150 : 300);
  const quality = normalizeQuality(
    options.quality ?? (preset === "digital" ? 0.8 : 0.92),
  );
  const bleedMm =
    preset === "digital" || options.includeBleed === false
      ? 0
      : Math.max(0, project.pageSize.bleed);
  const cropMarks =
    preset === "print" && bleedMm > 0 && Boolean(options.cropMarks);

  const pages = project.pages;
  const pageWidthMm = project.pageSize.w;
  const heightMm = project.pageSize.h;
  const editableCount = getEditablePageCount(pages);
  const spineWidthMm = getSpineWidth(project.pageSize.binding, editableCount);

  const spreads = getSpreads(pages);
  const coverSpread = spreads.find((s) => s.isCover);
  const interiorSpreads = spreads.filter((s) => !s.isCover);

  const rightToLeftPartner = new Map<string, Page>();
  for (const spread of spreads) {
    if (spread.pageIndices.length === 2) {
      const leftP = pages[spread.pageIndices[0]!];
      const rightP = pages[spread.pageIndices[1]!];
      if (leftP && rightP && !leftP.isEndPaper) {
        rightToLeftPartner.set(rightP.id, leftP);
      }
    }
  }

  const allSheets: PdfSheet[] = [];
  const pushSingle = (page: Page, label: string) => {
    allSheets.push({
      kind: "single",
      sheetNumber: allSheets.length + 1,
      label,
      page,
      widthMm: pageWidthMm,
      heightMm,
      leftPartner: rightToLeftPartner.get(page.id),
    });
  };

  if (layoutMode === "spreads") {
    if (coverSpread) {
      const coverPages = coverSpread.pageIndices
        .map((i) => pages[i])
        .filter((p): p is Page => Boolean(p));
      const backPage =
        coverPages.find((p) => p.coverSide === "back") ?? coverPages[0];
      const frontPage =
        coverPages.find((p) => p.coverSide === "front") ?? coverPages[1] ?? backPage;
      if (backPage && frontPage) {
        allSheets.push({
          kind: "spread-cover",
          sheetNumber: allSheets.length + 1,
          label:
            spineWidthMm > 0
              ? `Cover spread (${spineWidthMm} mm spine)`
              : "Cover spread",
          backPage,
          frontPage,
          spineWidthMm,
          pageWidthMm,
          heightMm,
        });
      }
    }

    for (const spread of interiorSpreads) {
      const leftRaw =
        spread.pageIndices[0] !== undefined
          ? (pages[spread.pageIndices[0]] ?? null)
          : null;
      const rightRaw =
        spread.pageIndices[1] !== undefined
          ? (pages[spread.pageIndices[1]] ?? null)
          : null;
      const hasEditable = Boolean(
        (leftRaw && !leftRaw.isEndPaper) || (rightRaw && !rightRaw.isEndPaper),
      );
      if (!hasEditable) continue;

      allSheets.push({
        kind: "spread-interior",
        sheetNumber: allSheets.length + 1,
        label: getShortSpreadLabel(spread, pages),
        leftPage: leftRaw,
        rightPage: rightRaw,
        pageWidthMm,
        heightMm,
      });
    }
  } else {
    // Single-page print order: Front Cover -> Spine (if binding has spine width) -> Pages 1..N -> Back Cover.
    const coverPages = coverSpread
      ? coverSpread.pageIndices
          .map((i) => pages[i])
          .filter((p): p is Page => Boolean(p))
      : [];
    const frontCover =
      coverPages.find((p) => p.coverSide === "front") ?? coverPages[1];
    const backCover =
      coverPages.find((p) => p.coverSide === "back") ?? coverPages[0];

    if (frontCover) {
      pushSingle(frontCover, "Front cover");
    }
    if (spineWidthMm > 0 && (frontCover || backCover)) {
      allSheets.push({
        kind: "spine",
        sheetNumber: allSheets.length + 1,
        label: `Cover spine (${spineWidthMm} mm)`,
        coverPage: (backCover ?? frontCover)!,
        spineWidthMm,
        heightMm,
      });
    }

    for (const spread of interiorSpreads) {
      for (const pageIndex of spread.pageIndices) {
        const page = pages[pageIndex];
        if (!page || page.isEndPaper) continue;
        pushSingle(page, getPageLabel(pageIndex, pages));
      }
    }

    if (backCover) {
      pushSingle(backCover, "Back cover");
    }
  }

  const parsed = parsePageRange(options.pageRange ?? "", allSheets.length);
  const pickSet = new Set(parsed.indices);
  const selectedSheets = allSheets.filter((sheet) =>
    pickSet.has(sheet.sheetNumber),
  );

  return {
    allSheets,
    selectedSheets,
    spineWidthMm,
    dpi,
    quality,
    bleedMm,
    cropMarks,
    rangeError: parsed.error,
  };
}

/**
 * Estimates final PDF size in bytes from page count, DPI, quality slider,
 * image coverage, rich backgrounds, stickers, and embedded font subsets.
 */
export function estimatePdfFileSizeBytes(
  project: Project,
  options: PdfExportOptions = {},
): number {
  const plan = buildPdfExportPlan(project, options);
  const sheets = plan.selectedSheets;
  if (sheets.length === 0) return 0;

  const dpiScale = Math.pow(plan.dpi / 150, 1.85);
  const qualityFactor = 0.28 + Math.pow(plan.quality, 2.2) * 0.85;

  let bytes = 0;
  const seenFonts = new Set<string>();

  const inspectPage = (page: Page | null | undefined) => {
    if (!page || page.isEndPaper) return;
    // Base vector stream + page dict (~6 KB).
    bytes += 6 * 1024;
    if (page.background && page.background.kind !== "solid") {
      bytes += Math.round(95 * 1024 * dpiScale * qualityFactor);
    }

    for (const el of page.elements) {
      if (el.hidden || el.opacity <= 0) continue;
      if (el.type === "image" && el.src) {
        const areaRatio = Math.max(
          0.04,
          (el.width * el.height) / Math.max(1, project.pageSize.w * project.pageSize.h),
        );
        // Compressible JPEG at qualityFactor unless rounded alpha requires PNG.
        const alphaPenalty = el.radius > 0 ? 1.75 : 1;
        bytes += Math.round(
          260 * 1024 * areaRatio * dpiScale * qualityFactor * alphaPenalty,
        );
      } else if (el.type === "sticker") {
        bytes += Math.round(32 * 1024 * (plan.dpi / 200));
      } else if (el.type === "shape" && el.fillGradient?.enabled) {
        bytes += Math.round(28 * 1024 * (plan.dpi / 200));
      } else if (el.type === "text" && !el.isPlaceholder && el.text.trim()) {
        seenFonts.add(`${el.fontFamily}:${el.fontWeight}:${el.fontStyle ?? "normal"}`);
        if (el.curvedText) {
          bytes += Math.round(35 * 1024 * (plan.dpi / 200));
        } else {
          bytes += 450;
        }
      } else if (el.type === "qr" || el.type === "shape") {
        bytes += 600;
      }
    }
  };

  for (const sheet of sheets) {
    if (sheet.kind === "single") {
      inspectPage(sheet.page);
    } else if (sheet.kind === "spine") {
      bytes += 4 * 1024;
    } else if (sheet.kind === "spread-cover") {
      inspectPage(sheet.backPage);
      inspectPage(sheet.frontPage);
    } else {
      inspectPage(sheet.leftPage);
      inspectPage(sheet.rightPage);
    }
  }

  // Subetted TTF fonts embedded once per face (~38 KB avg subset).
  bytes += seenFonts.size * 38 * 1024;
  return bytes;
}

export function formatFileSize(bytes: number): string {
  if (bytes <= 0) return "0 KB";
  if (bytes < 1024 * 1024) {
    return `~${Math.max(1, Math.round(bytes / 1024))} KB`;
  }
  return `~${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
