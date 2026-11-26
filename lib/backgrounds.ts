import type { CSSProperties } from "react";
import type { Page, PageBackground, Project } from "@/types";
import { resolveMediaUrl } from "@/lib/mediaStorage";

export type BackgroundPattern =
  | "dots"
  | "ruled"
  | "grid"
  | "hatch"
  | "checker"
  | "waves"
  | "terrazzo"
  | "linen"
  | "cotton"
  | "kraft-grain"
  | "watercolor-wash"
  | "marble";

export interface BackgroundDefinition {
  id: string;
  name: string;
  /** Base colour also used by the PDF renderer. */
  baseColor: string;
  tone: "light" | "dark";
  category?: "solid" | "gradient" | "pattern" | "paper";
  style: CSSProperties;
  gradient?: {
    from: string;
    to: string;
    angle: number;
  };
  pdfPattern?: {
    kind: BackgroundPattern;
    color: string;
    opacity: number;
    spacingMm: number;
  };
}

const solid = (
  id: string,
  name: string,
  color: string,
  tone: "light" | "dark",
): BackgroundDefinition => ({
  id,
  name,
  baseColor: color,
  tone,
  category: "solid",
  style: { backgroundColor: color },
});

const gradientDef = (
  id: string,
  name: string,
  from: string,
  to: string,
  angle: number,
  tone: "light" | "dark",
): BackgroundDefinition => ({
  id,
  name,
  baseColor: from,
  tone,
  category: "gradient",
  gradient: { from, to, angle },
  style: {
    backgroundImage: `linear-gradient(${angle}deg, ${from}, ${to})`,
  },
});

const pattern = (
  id: string,
  name: string,
  baseColor: string,
  tone: "light" | "dark",
  category: "pattern" | "paper",
  overlay: Pick<
    CSSProperties,
    "backgroundImage" | "backgroundSize" | "backgroundPosition"
  >,
  pdfPattern: BackgroundDefinition["pdfPattern"],
): BackgroundDefinition => ({
  id,
  name,
  baseColor,
  tone,
  category,
  style: {
    backgroundColor: baseColor,
    ...overlay,
  },
  pdfPattern,
});

export const BACKGROUNDS: BackgroundDefinition[] = [
  solid("paper", "Paper", "#FFFFFF", "light"),
  solid("ivory", "Ivory", "#FAFAFD", "light"),
  solid("lilac", "Lilac", "#EEEFFD", "light"),
  solid("mist", "Mist", "#DDE0F7", "light"),
  solid("periwinkle", "Periwinkle", "#C3C8F2", "light"),
  solid("indigo", "Indigo", "#5B65DC", "dark"),
  solid("ink", "Ink", "#122056", "dark"),
  solid("navy", "Navy", "#1A2A6B", "dark"),
  solid("slate", "Slate", "#4A5183", "dark"),
  solid("oat", "Warm Oat", "#EFE7DC", "light"),
  solid("offwhite", "Studio Cream", "#F9F7F1", "light"),
  solid("rose-blush", "Rose Pink", "#FADCE4", "light"),
  solid("blush", "Soft Blush", "#FDEAE6", "light"),
  solid("baby-blue", "Misty Blue", "#E3EEF4", "light"),
  solid("sky", "Azure Sky", "#87BEEB", "light"),
  solid("powder", "Powder Blue", "#AED5F2", "light"),
  solid("ice", "Ice Blue", "#CBE1F4", "light"),
  solid("burgundy", "Burgundy Wine", "#7B1E34", "dark"),
  solid("coral", "Tokyo Coral", "#EF473A", "dark"),

  // Gradients
  gradientDef("grad-lavender", "Soft Lilac", "#F7F7FE", "#DDE2FA", 135, "light"),
  gradientDef("grad-dawn", "Peach Dawn", "#FFF5EB", "#FAD6C8", 135, "light"),
  gradientDef("grad-coast", "Coastal Mist", "#EEF7FE", "#BEE0FA", 160, "light"),
  gradientDef("grad-sage", "Sage Dew", "#F3F9F5", "#CDE5D8", 140, "light"),
  gradientDef("grad-indigo", "Midnight Bloom", "#5B65DC", "#1A2A6B", 135, "dark"),
  gradientDef("grad-dusk", "Velvet Dusk", "#122056", "#4B3B8F", 150, "dark"),

  // Print patterns
  pattern(
    "dotted",
    "Dotted ivory",
    "#FAFAFD",
    "light",
    "pattern",
    {
      backgroundImage:
        "radial-gradient(circle at 1px 1px, rgba(18,32,86,0.16) 1px, transparent 1.2px)",
      backgroundSize: "8px 8px",
    },
    { kind: "dots", color: "#122056", opacity: 0.16, spacingMm: 2.4 },
  ),
  pattern(
    "ruled",
    "Ruled",
    "#FCFCFE",
    "light",
    "pattern",
    {
      backgroundImage:
        "repeating-linear-gradient(to bottom, transparent 0, transparent 9px, rgba(18,32,86,0.09) 9px, rgba(18,32,86,0.09) 10px)",
    },
    { kind: "ruled", color: "#122056", opacity: 0.09, spacingMm: 3 },
  ),
  pattern(
    "grid",
    "Grid",
    "#F9F9FD",
    "light",
    "pattern",
    {
      backgroundImage:
        "linear-gradient(to right, rgba(18,32,86,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(18,32,86,0.06) 1px, transparent 1px)",
      backgroundSize: "10px 10px",
    },
    { kind: "grid", color: "#122056", opacity: 0.06, spacingMm: 3 },
  ),
  pattern(
    "hatch",
    "Hatch",
    "#F4F5FC",
    "light",
    "pattern",
    {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(18,32,86,0.05) 0, rgba(18,32,86,0.05) 1px, transparent 1px, transparent 7px)",
    },
    { kind: "hatch", color: "#122056", opacity: 0.05, spacingMm: 2.5 },
  ),
  pattern(
    "checker",
    "Gingham Check",
    "#FDFCFE",
    "light",
    "pattern",
    {
      backgroundImage:
        "linear-gradient(45deg, rgba(91,101,220,0.08) 25%, transparent 25%, transparent 75%, rgba(91,101,220,0.08) 75%), linear-gradient(45deg, rgba(91,101,220,0.08) 25%, transparent 25%, transparent 75%, rgba(91,101,220,0.08) 75%)",
      backgroundSize: "14px 14px",
      backgroundPosition: "0 0, 7px 7px",
    },
    { kind: "checker", color: "#5B65DC", opacity: 0.1, spacingMm: 4 },
  ),
  pattern(
    "waves",
    "Editorial Waves",
    "#F8FAFE",
    "light",
    "pattern",
    {
      backgroundImage:
        "repeating-radial-gradient(circle at 50% 0, transparent 0, transparent 7px, rgba(18,32,86,0.08) 8px, transparent 9px)",
      backgroundSize: "16px 16px",
    },
    { kind: "waves", color: "#122056", opacity: 0.1, spacingMm: 5 },
  ),
  pattern(
    "terrazzo",
    "Studio Terrazzo",
    "#FAF8F5",
    "light",
    "pattern",
    {
      backgroundImage:
        "radial-gradient(circle at 20% 30%, rgba(217,119,87,0.22) 2px, transparent 2.5px), radial-gradient(circle at 70% 65%, rgba(91,101,220,0.2) 2.5px, transparent 3px)",
      backgroundSize: "20px 20px",
    },
    { kind: "terrazzo", color: "#5B65DC", opacity: 0.16, spacingMm: 8 },
  ),

  // Paper textures
  pattern(
    "paper-cotton",
    "Warm Cotton",
    "#FBF8F1",
    "light",
    "paper",
    {
      backgroundImage:
        "radial-gradient(circle at 2px 2px, rgba(140,120,90,0.1) 0.8px, transparent 1px)",
      backgroundSize: "6px 6px",
    },
    { kind: "cotton", color: "#8C785A", opacity: 0.14, spacingMm: 4 },
  ),
  pattern(
    "paper-linen",
    "Fine Linen",
    "#F7F5EE",
    "light",
    "paper",
    {
      backgroundImage:
        "linear-gradient(to right, rgba(120,108,88,0.07) 1px, transparent 1px), linear-gradient(to bottom, rgba(120,108,88,0.07) 1px, transparent 1px)",
      backgroundSize: "4px 4px",
    },
    { kind: "linen", color: "#786C58", opacity: 0.12, spacingMm: 3 },
  ),
  pattern(
    "paper-kraft",
    "Kraft Grain",
    "#EFE4D4",
    "light",
    "paper",
    {
      backgroundImage:
        "radial-gradient(circle at 1px 1px, rgba(105,76,45,0.16) 0.9px, transparent 1.2px)",
      backgroundSize: "7px 7px",
    },
    { kind: "kraft-grain", color: "#694C2D", opacity: 0.18, spacingMm: 5 },
  ),
  pattern(
    "paper-watercolor",
    "Watercolor Wash",
    "#FAFBFD",
    "light",
    "paper",
    {
      backgroundImage:
        "radial-gradient(ellipse at 30% 30%, rgba(195,200,242,0.45), transparent 65%), radial-gradient(ellipse at 75% 75%, rgba(250,214,200,0.4), transparent 65%)",
    },
    { kind: "watercolor-wash", color: "#C3C8F2", opacity: 0.35, spacingMm: 18 },
  ),
  pattern(
    "paper-marble",
    "Soft Marble",
    "#FAFAFC",
    "light",
    "paper",
    {
      backgroundImage:
        "linear-gradient(125deg, transparent 42%, rgba(18,32,86,0.06) 45%, transparent 48%), radial-gradient(circle at 40% 40%, rgba(221,224,247,0.35), transparent 60%)",
    },
    { kind: "marble", color: "#565E8E", opacity: 0.14, spacingMm: 16 },
  ),
];

export const DEFAULT_BACKGROUND_ID = "paper";

const backgroundMap = new Map(BACKGROUNDS.map((bg) => [bg.id, bg]));

export function getBackground(id: string | null | undefined): BackgroundDefinition {
  return (
    backgroundMap.get(id ?? "") ?? backgroundMap.get(DEFAULT_BACKGROUND_ID)!
  );
}

export function isDarkHexColor(hex: string): boolean {
  const clean = hex.replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return false;
  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum < 0.52;
}

export interface ResolvedPageBackground {
  kind: PageBackground["kind"];
  baseColor: string;
  tone: "light" | "dark";
  gradient?: { from: string; to: string; angle: number };
  pdfPattern?: BackgroundDefinition["pdfPattern"];
  imageSrc?: string;
  opacity: number;
  blur: number;
  style: CSSProperties;
}

/**
 * Resolves a Page's effective background definition by combining `page.backgroundId`
 * preset defaults with any custom `page.background` solid/gradient/texture/image/opacity/blur.
 */
export function resolvePageBackground(
  page: Pick<Page, "backgroundId" | "background">,
): ResolvedPageBackground {
  const preset = getBackground(page.backgroundId);
  const bg = page.background;

  if (!bg) {
    return {
      kind: preset.category ?? "solid",
      baseColor: preset.baseColor,
      tone: preset.tone,
      gradient: preset.gradient,
      pdfPattern: preset.pdfPattern,
      opacity: 1,
      blur: 0,
      style: preset.style,
    };
  }

  const opacity = bg.opacity ?? 1;
  const blur = bg.blur ?? 0;

  if (bg.kind === "gradient" && bg.gradient) {
    return {
      kind: "gradient",
      baseColor: bg.gradient.from,
      tone: isDarkHexColor(bg.gradient.from) ? "dark" : "light",
      gradient: bg.gradient,
      opacity,
      blur,
      style: {
        backgroundImage: `linear-gradient(${bg.gradient.angle}deg, ${bg.gradient.from}, ${bg.gradient.to})`,
      },
    };
  }

  if (bg.kind === "image" && bg.imageSrc) {
    return {
      kind: "image",
      baseColor: bg.color || "#FFFFFF",
      tone: isDarkHexColor(bg.color || "#FFFFFF") ? "dark" : "light",
      imageSrc: bg.imageSrc,
      opacity,
      blur,
      style: {
        backgroundColor: bg.color || "#FFFFFF",
      },
    };
  }

  if ((bg.kind === "pattern" || bg.kind === "paper") && bg.patternId) {
    const patDef = getBackground(bg.patternId);
    const tintColor = bg.color || patDef.baseColor;
    return {
      kind: bg.kind,
      baseColor: tintColor,
      tone: isDarkHexColor(tintColor) ? "dark" : "light",
      pdfPattern: patDef.pdfPattern,
      opacity,
      blur,
      style: {
        ...patDef.style,
        backgroundColor: tintColor,
      },
    };
  }

  const solidColor = bg.color || preset.baseColor;
  return {
    kind: "solid",
    baseColor: solidColor,
    tone: isDarkHexColor(solidColor) ? "dark" : "light",
    opacity,
    blur,
    style: {
      backgroundColor: solidColor,
    },
  };
}

export const LIGHT_TEXT_ON_BACKGROUND = "#FFFFFF";

const RECENT_BG_COLORS_KEY = "pressly:recent-bg-colors:v1";
const MAX_RECENT_BG_COLORS = 10;

export function loadRecentBgColors(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_BG_COLORS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((c): c is string => typeof c === "string")
      : [];
  } catch {
    return [];
  }
}

export function recordRecentBgColor(hex: string): string[] {
  const normalized = hex.toUpperCase();
  if (!/^#[0-9A-F]{6}$/.test(normalized)) return loadRecentBgColors();
  const next = [
    normalized,
    ...loadRecentBgColors().filter((c) => c !== normalized),
  ].slice(0, MAX_RECENT_BG_COLORS);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(RECENT_BG_COLORS_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  }
  return next;
}

const paletteCache = new Map<string, string[]>();

function toHexByte(n: number): string {
  return Math.max(0, Math.min(255, Math.round(n)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

/**
 * Extracts dominant harmonious hex swatches from an image URL or `idb:` ref.
 */
export async function extractColorsFromPhoto(src: string): Promise<string[]> {
  if (!src) return [];
  const cached = paletteCache.get(src);
  if (cached) return cached;

  try {
    const resolved = await resolveMediaUrl(src);
    if (!resolved) return [];
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new window.Image();
      if (/^https?:\/\//i.test(resolved)) el.crossOrigin = "anonymous";
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error("Load failed"));
      el.src = resolved;
    });

    const size = 24;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return [];
    ctx.drawImage(img, 0, 0, size, size);
    const data = ctx.getImageData(0, 0, size, size).data;

    const buckets = new Map<string, { r: number; g: number; b: number; count: number }>();
    for (let i = 0; i < data.length; i += 4) {
      if (data[i + 3]! < 140) continue;
      const r = data[i]!;
      const g = data[i + 1]!;
      const b = data[i + 2]!;
      const qr = Math.round(r / 32) * 32;
      const qg = Math.round(g / 32) * 32;
      const qb = Math.round(b / 32) * 32;
      const key = `${qr},${qg},${qb}`;
      const existing = buckets.get(key);
      if (existing) {
        existing.r += r;
        existing.g += g;
        existing.b += b;
        existing.count += 1;
      } else {
        buckets.set(key, { r, g, b, count: 1 });
      }
    }

    const sorted = Array.from(buckets.values()).sort((a, b) => b.count - a.count);
    const chosen: Array<{ r: number; g: number; b: number; hex: string }> = [];
    for (const bucket of sorted) {
      const r = bucket.r / bucket.count;
      const g = bucket.g / bucket.count;
      const b = bucket.b / bucket.count;
      const distinct = chosen.every(
        (prev) => Math.hypot(prev.r - r, prev.g - g, prev.b - b) >= 42,
      );
      if (distinct) {
        chosen.push({
          r,
          g,
          b,
          hex: `#${toHexByte(r)}${toHexByte(g)}${toHexByte(b)}`,
        });
      }
      if (chosen.length >= 6) break;
    }

    const result = chosen.map((c) => c.hex);
    paletteCache.set(src, result);
    return result;
  } catch {
    return [];
  }
}

export function getProjectPhotoSources(project: Project): string[] {
  const seen = new Set<string>();
  for (const asset of project.mediaLibrary ?? []) {
    if (asset.thumbSrc || asset.src) seen.add(asset.thumbSrc ?? asset.src);
  }
  for (const page of project.pages) {
    for (const el of page.elements) {
      if (el.type === "image" && el.src) seen.add(el.src);
    }
  }
  return Array.from(seen);
}
