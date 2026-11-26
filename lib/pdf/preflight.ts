import type { ImageElement, Page, Project, TextElement } from "@/types";
import { fetchFontBytesForPdf } from "@/lib/fonts";
import { getEffectiveDpi, loadImageDimensions } from "@/lib/printQuality";
import { getPageLabel, getSpreads } from "@/lib/spreads";

export type PreflightIssueKind =
  | "low-resolution"
  | "empty-frame"
  | "safe-margin"
  | "missing-font";

export interface PreflightIssue {
  id: string;
  kind: PreflightIssueKind;
  severity: "warning" | "error";
  title: string;
  detail: string;
  pageId: string;
  pageIndex: number;
  pageLabel: string;
  elementId: string;
}

export interface PreflightReport {
  issues: PreflightIssue[];
  counts: Record<PreflightIssueKind, number>;
  checkedPages: number;
}

export async function runPdfPreflight(
  project: Project,
  options: { targetDpi?: number } = {},
): Promise<PreflightReport> {
  const targetDpi = options.targetDpi ?? 300;
  const minDpi = targetDpi >= 250 ? 200 : 120;
  const issues: PreflightIssue[] = [];
  const safe = Math.max(0, project.pageSize.safeMargin);

  const spreads = getSpreads(project.pages);
  const pagePartners = new Map<string, boolean>();
  for (const s of spreads) {
    if (s.pageIndices.length === 2) {
      const left = project.pages[s.pageIndices[0]!];
      if (left) pagePartners.set(left.id, true);
    }
  }

  const fontUsers = new Map<
    string,
    {
      fontFamily: string;
      fontWeight: number;
      italic: boolean;
      pageId: string;
      pageIndex: number;
      pageLabel: string;
      elementId: string;
    }
  >();

  const imageChecks: Array<{
    element: ImageElement;
    page: Page;
    pageIndex: number;
    pageLabel: string;
  }> = [];

  let checkedPages = 0;

  for (let pageIndex = 0; pageIndex < project.pages.length; pageIndex += 1) {
    const page = project.pages[pageIndex]!;
    if (page.isEndPaper) continue;
    checkedPages += 1;
    const pageLabel = getPageLabel(pageIndex, project.pages);
    const hasRightPartner = Boolean(pagePartners.get(page.id));

    for (const el of page.elements) {
      if (el.hidden) continue;

      if (el.type === "image") {
        if (!el.src) {
          issues.push({
            id: `empty-${el.id}`,
            kind: "empty-frame",
            severity: "warning",
            title: "Empty photo frame",
            detail: `${pageLabel} has an unfilled image frame (${Math.round(el.width)}×${Math.round(el.height)} mm).`,
            pageId: page.id,
            pageIndex,
            pageLabel,
            elementId: el.id,
          });
        } else {
          imageChecks.push({ element: el, page, pageIndex, pageLabel });
        }
        continue;
      }

      if (el.type === "text") {
        const txt = el as TextElement;
        if (txt.isPlaceholder || !txt.text.trim()) continue;

        // Safe margin check (in mm). Full-spread boxes compare right edge to 2x trim width.
        const maxRight =
          txt.spanSpread && hasRightPartner
            ? project.pageSize.w * 2 - safe
            : project.pageSize.w - safe;
        if (
          safe > 0 &&
          (txt.x < safe - 0.15 ||
            txt.y < safe - 0.15 ||
            txt.x + txt.width > maxRight + 0.15 ||
            txt.y + txt.height > project.pageSize.h - safe + 0.15)
        ) {
          const preview = txt.text.trim().slice(0, 28);
          issues.push({
            id: `safe-${txt.id}`,
            kind: "safe-margin",
            severity: "warning",
            title: "Text outside safe margin",
            detail: `"${preview}${txt.text.trim().length > 28 ? "…" : ""}" on ${pageLabel} crosses the ${safe} mm safe margin.`,
            pageId: page.id,
            pageIndex,
            pageLabel,
            elementId: txt.id,
          });
        }

        const italic = txt.fontStyle === "italic";
        const fontKey = `${txt.fontFamily}:${txt.fontWeight}:${italic ? "i" : "n"}`;
        if (!fontUsers.has(fontKey)) {
          fontUsers.set(fontKey, {
            fontFamily: txt.fontFamily,
            fontWeight: txt.fontWeight,
            italic,
            pageId: page.id,
            pageIndex,
            pageLabel,
            elementId: txt.id,
          });
        }
      }
    }
  }

  // Check image effective DPI in parallel.
  const imgResults = await Promise.all(
    imageChecks.map(async (item) => {
      const dims = await loadImageDimensions(item.element.src);
      return { item, dims };
    }),
  );

  for (const { item, dims } of imgResults) {
    if (!dims) {
      issues.push({
        id: `broken-${item.element.id}`,
        kind: "low-resolution",
        severity: "error",
        title: "Unreadable image source",
        detail: `${item.element.alt || "Photo"} on ${item.pageLabel} could not be decoded for export.`,
        pageId: item.page.id,
        pageIndex: item.pageIndex,
        pageLabel: item.pageLabel,
        elementId: item.element.id,
      });
      continue;
    }
    const dpi = Math.round(getEffectiveDpi(item.element, dims.w, dims.h));
    if (dpi < minDpi) {
      issues.push({
        id: `dpi-${item.element.id}`,
        kind: "low-resolution",
        severity: dpi < 120 ? "error" : "warning",
        title: `Low resolution (${dpi} DPI)`,
        detail: `${item.element.alt || "Photo"} on ${item.pageLabel} prints at ${dpi} DPI (recommended ≥ ${minDpi} DPI).`,
        pageId: item.page.id,
        pageIndex: item.pageIndex,
        pageLabel: item.pageLabel,
        elementId: item.element.id,
      });
    }
  }

  // Verify font TTF availability for embedding.
  const fontChecks = await Promise.all(
    Array.from(fontUsers.entries()).map(async ([key, usage]) => {
      const bytes = await fetchFontBytesForPdf(
        usage.fontFamily,
        usage.fontWeight,
        usage.italic,
      );
      return { key, usage, ok: Boolean(bytes) };
    }),
  );

  for (const entry of fontChecks) {
    if (!entry.ok) {
      issues.push({
        id: `font-${entry.key}`,
        kind: "missing-font",
        severity: "warning",
        title: `Missing font: ${entry.usage.fontFamily}`,
        detail: `Could not fetch embeddable font bytes for "${entry.usage.fontFamily}" (${entry.usage.fontWeight}${entry.usage.italic ? " italic" : ""}) used on ${entry.usage.pageLabel}; Helvetica fallback will be used.`,
        pageId: entry.usage.pageId,
        pageIndex: entry.usage.pageIndex,
        pageLabel: entry.usage.pageLabel,
        elementId: entry.usage.elementId,
      });
    }
  }

  const counts: Record<PreflightIssueKind, number> = {
    "low-resolution": 0,
    "empty-frame": 0,
    "safe-margin": 0,
    "missing-font": 0,
  };
  for (const issue of issues) {
    counts[issue.kind] += 1;
  }

  return { issues, counts, checkedPages };
}
