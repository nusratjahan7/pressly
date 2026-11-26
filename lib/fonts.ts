import type { FontWeight } from "@/types";

export type FontCategory = "sans" | "serif" | "display" | "mono";

export interface CuratedFont {
  name: string;
  slug: string;
  category: FontCategory;
  weights: FontWeight[];
  hasItalic: boolean;
}

export const DEFAULT_MAGAZINE_FONT_FAMILY = "Londrina Solid";
export const DEFAULT_MAGAZINE_FONT_WEIGHT: FontWeight = 900;

/** Curated Google Fonts including display, sans, editorial serifs, and mono. */
export const CURATED_FONTS: CuratedFont[] = [
  // Featured Display Fonts
  { name: "Londrina Solid", slug: "londrina-solid", category: "display", weights: [300, 400, 900], hasItalic: false },
  { name: "Eater", slug: "eater", category: "display", weights: [400], hasItalic: false },
  { name: "Bangers", slug: "bangers", category: "display", weights: [400], hasItalic: false },
  { name: "Ultra", slug: "ultra", category: "display", weights: [400], hasItalic: false },
  // Editorial Sans (8)
  { name: "Montserrat", slug: "montserrat", category: "sans", weights: [400, 500, 600, 700], hasItalic: true },
  { name: "Inter", slug: "inter", category: "sans", weights: [400, 500, 600, 700], hasItalic: false },
  { name: "DM Sans", slug: "dm-sans", category: "sans", weights: [400, 500, 600, 700], hasItalic: true },
  { name: "Plus Jakarta Sans", slug: "plus-jakarta-sans", category: "sans", weights: [400, 500, 600, 700], hasItalic: true },
  { name: "Work Sans", slug: "work-sans", category: "sans", weights: [400, 500, 600, 700], hasItalic: true },
  { name: "Space Grotesk", slug: "space-grotesk", category: "sans", weights: [400, 500, 600, 700], hasItalic: false },
  { name: "Outfit", slug: "outfit", category: "sans", weights: [400, 500, 600, 700], hasItalic: false },
  { name: "Raleway", slug: "raleway", category: "sans", weights: [400, 500, 600, 700], hasItalic: true },

  // Editorial Serifs (10)
  { name: "Playfair Display", slug: "playfair-display", category: "serif", weights: [400, 500, 600, 700], hasItalic: true },
  { name: "Cormorant Garamond", slug: "cormorant-garamond", category: "serif", weights: [400, 500, 600, 700], hasItalic: true },
  { name: "Lora", slug: "lora", category: "serif", weights: [400, 500, 600, 700], hasItalic: true },
  { name: "Merriweather", slug: "merriweather", category: "serif", weights: [400, 700], hasItalic: true },
  { name: "Libre Baskerville", slug: "libre-baskerville", category: "serif", weights: [400, 700], hasItalic: true },
  { name: "Crimson Pro", slug: "crimson-pro", category: "serif", weights: [400, 500, 600, 700], hasItalic: true },
  { name: "EB Garamond", slug: "eb-garamond", category: "serif", weights: [400, 500, 600, 700], hasItalic: true },
  { name: "Instrument Serif", slug: "instrument-serif", category: "serif", weights: [400], hasItalic: true },
  { name: "DM Serif Display", slug: "dm-serif-display", category: "serif", weights: [400], hasItalic: true },
  { name: "Bodoni Moda", slug: "bodoni-moda", category: "serif", weights: [400, 500, 600, 700], hasItalic: true },

  // Display (8)
  { name: "Anton", slug: "anton", category: "display", weights: [400], hasItalic: false },
  { name: "Bebas Neue", slug: "bebas-neue", category: "display", weights: [400], hasItalic: false },
  { name: "Oswald", slug: "oswald", category: "display", weights: [400, 500, 600, 700], hasItalic: false },
  { name: "Dancing Script", slug: "dancing-script", category: "display", weights: [400, 500, 600, 700], hasItalic: false },
  { name: "Abril Fatface", slug: "abril-fatface", category: "display", weights: [400], hasItalic: false },
  { name: "Syne", slug: "syne", category: "display", weights: [400, 500, 600, 700], hasItalic: false },
  { name: "Cinzel", slug: "cinzel", category: "display", weights: [400, 500, 600, 700], hasItalic: false },
  { name: "Fraunces", slug: "fraunces", category: "display", weights: [400, 500, 600, 700], hasItalic: true },

  // Monospace (1)
  { name: "JetBrains Mono", slug: "jetbrains-mono", category: "mono", weights: [400, 500, 600, 700], hasItalic: true },
];

export interface FontPairingPreset {
  id: string;
  name: string;
  description: string;
  heading: {
    fontFamily: string;
    fontSize: number;
    fontWeight: FontWeight;
    letterSpacing: number;
    textTransform?: "none" | "uppercase";
    text: string;
  };
  subheading: {
    fontFamily: string;
    fontSize: number;
    fontWeight: FontWeight;
    letterSpacing: number;
    textTransform?: "none" | "uppercase";
    text: string;
  };
  body: {
    fontFamily: string;
    fontSize: number;
    fontWeight: FontWeight;
    lineHeight: number;
    text: string;
  };
}

export const FONT_PAIRING_PRESETS: FontPairingPreset[] = [
  {
    id: "editorial-classic",
    name: "Editorial Classic",
    description: "Playfair Display + Montserrat + Lora",
    heading: {
      fontFamily: "Playfair Display",
      fontSize: 34,
      fontWeight: 700,
      letterSpacing: -0.6,
      text: "The Autumn Issue",
    },
    subheading: {
      fontFamily: "Montserrat",
      fontSize: 9,
      fontWeight: 600,
      letterSpacing: 2.2,
      textTransform: "uppercase",
      text: "Volume 04 · Feature Story",
    },
    body: {
      fontFamily: "Lora",
      fontSize: 11,
      fontWeight: 400,
      lineHeight: 1.55,
      text: "Quiet rooms, natural light, and unhurried craft across every page.",
    },
  },
  {
    id: "modern-studio",
    name: "Modern Studio",
    description: "Space Grotesk + DM Sans + Inter",
    heading: {
      fontFamily: "Space Grotesk",
      fontSize: 32,
      fontWeight: 700,
      letterSpacing: -0.8,
      text: "Design Notes",
    },
    subheading: {
      fontFamily: "DM Sans",
      fontSize: 10,
      fontWeight: 500,
      letterSpacing: 1.2,
      textTransform: "uppercase",
      text: "Studio Monograph",
    },
    body: {
      fontFamily: "Inter",
      fontSize: 10.5,
      fontWeight: 400,
      lineHeight: 1.5,
      text: "Structured grids paired with generous margins for contemporary print.",
    },
  },
  {
    id: "luxury-monograph",
    name: "Luxury Monograph",
    description: "Cormorant Garamond + Raleway + Crimson Pro",
    heading: {
      fontFamily: "Cormorant Garamond",
      fontSize: 38,
      fontWeight: 600,
      letterSpacing: -0.4,
      text: "Paris, 2026",
    },
    subheading: {
      fontFamily: "Raleway",
      fontSize: 9,
      fontWeight: 500,
      letterSpacing: 2.6,
      textTransform: "uppercase",
      text: "A Collection of Memories",
    },
    body: {
      fontFamily: "Crimson Pro",
      fontSize: 11.5,
      fontWeight: 400,
      lineHeight: 1.55,
      text: "Stories and quiet moments worth holding onto for years to come.",
    },
  },
  {
    id: "bold-zine",
    name: "Bold Zine",
    description: "Bebas Neue + Oswald + Work Sans",
    heading: {
      fontFamily: "Bebas Neue",
      fontSize: 42,
      fontWeight: 400,
      letterSpacing: 1.5,
      text: "CITY ARCHIVE",
    },
    subheading: {
      fontFamily: "Oswald",
      fontSize: 11,
      fontWeight: 500,
      letterSpacing: 1.8,
      textTransform: "uppercase",
      text: "Edition No. 12",
    },
    body: {
      fontFamily: "Work Sans",
      fontSize: 10.5,
      fontWeight: 400,
      lineHeight: 1.48,
      text: "Street photography and field essays printed on tactile stock.",
    },
  },
  {
    id: "gallery-press",
    name: "Gallery Press",
    description: "Fraunces + Plus Jakarta Sans + EB Garamond",
    heading: {
      fontFamily: "Fraunces",
      fontSize: 33,
      fontWeight: 600,
      letterSpacing: -0.5,
      text: "Light & Form",
    },
    subheading: {
      fontFamily: "Plus Jakarta Sans",
      fontSize: 9.5,
      fontWeight: 600,
      letterSpacing: 1.8,
      textTransform: "uppercase",
      text: "Exhibition Catalogue",
    },
    body: {
      fontFamily: "EB Garamond",
      fontSize: 11.5,
      fontWeight: 400,
      lineHeight: 1.55,
      text: "Curated works exploring texture, contrast, and stillness.",
    },
  },
];

const fontMap = new Map(CURATED_FONTS.map((font) => [font.name, font]));
const loadedStylesheets = new Set<string>();
const loadedFaceKeys = new Set<string>();
const fontListeners = new Set<() => void>();

export function getCuratedFont(name: string): CuratedFont {
  return fontMap.get(name) ?? CURATED_FONTS[0]!;
}

export function subscribeFontLoads(listener: () => void): () => void {
  fontListeners.add(listener);
  return () => {
    fontListeners.delete(listener);
  };
}

function notifyFontLoaded() {
  fontListeners.forEach((listener) => listener());
}

function buildGoogleFontHref(font: CuratedFont): string {
  const encoded = encodeURIComponent(font.name).replace(/%20/g, "+");
  if (font.hasItalic) {
    const tuples = [
      ...font.weights.map((w) => `0,${w}`),
      ...font.weights.map((w) => `1,${w}`),
    ].join(";");
    return `https://fonts.googleapis.com/css2?family=${encoded}:ital,wght@${tuples}&display=swap`;
  }
  if (font.weights.length === 1 && font.weights[0] === 400) {
    return `https://fonts.googleapis.com/css2?family=${encoded}&display=swap`;
  }
  return `https://fonts.googleapis.com/css2?family=${encoded}:wght@${font.weights.join(";")}&display=swap`;
}

/**
 * Dynamically loads a Google Font stylesheet into `<head>` and awaits
 * `document.fonts.load` for the requested weight/style so Konva & DOM
 * surfaces re-render once glyphs arrive.
 */
export function ensureGoogleFontLoaded(
  fontFamily: string,
  fontWeight: number = 400,
  italic: boolean = false,
): void {
  if (typeof document === "undefined" || !fontFamily) return;

  const def = fontMap.get(fontFamily);
  const slug = def?.slug ?? encodeURIComponent(fontFamily).replace(/%20/g, "+");
  const id = `pressly-font-${slug}`;

  const loadSpecificFace = () => {
    const closestWeight = def
      ? def.weights.reduce((prev, curr) =>
          Math.abs(curr - fontWeight) < Math.abs(prev - fontWeight) ? curr : prev,
        )
      : 400;
    const style = def?.hasItalic && italic ? "italic" : "normal";
    const faceKey = `${fontFamily}:${closestWeight}:${style}`;
    if (loadedFaceKeys.has(faceKey)) return;
    loadedFaceKeys.add(faceKey);

    const spec = `${style === "italic" ? "italic " : ""}${closestWeight} 16px "${fontFamily}"`;
    void document.fonts
      ?.load(spec)
      .then(() => notifyFontLoaded())
      .catch(() => {});
  };

  if (!loadedStylesheets.has(id)) {
    loadedStylesheets.add(id);
    if (!document.getElementById(id)) {
      const link = document.createElement("link");
      link.id = id;
      link.rel = "stylesheet";
      link.href = def
        ? buildGoogleFontHref(def)
        : `https://fonts.googleapis.com/css2?family=${encodeURIComponent(fontFamily).replace(/%20/g, "+")}:wght@400;500;600;700&display=swap`;
      link.onload = () => {
        loadSpecificFace();
        // Also warm regular 400 face for fallback rendering.
        void document.fonts
          ?.load(`400 16px "${fontFamily}"`)
          .then(() => notifyFontLoaded())
          .catch(() => {});
      };
      document.head.appendChild(link);
      return;
    }
  }

  loadSpecificFace();
}

export interface FontOption {
  value: string;
  label: string;
  fontFamily: string;
  defaultWeight?: FontWeight;
}

export const FONT_SELECT_OPTIONS: FontOption[] = [
  {
    value: "Londrina Solid Black",
    label: "Londrina Solid Black",
    fontFamily: "Londrina Solid",
    defaultWeight: 900,
  },
  ...CURATED_FONTS.map((font) => ({
    value: font.name,
    label: font.name,
    fontFamily: font.name,
  })),
];

export function getFontOptionValue(
  fontFamily: string,
  fontWeight: FontWeight,
): string {
  if (fontFamily === "Londrina Solid" && fontWeight === 900) {
    return "Londrina Solid Black";
  }
  return fontFamily;
}

export function resolveFontOption(
  selectedValue: string,
  currentWeight: FontWeight,
): { fontFamily: string; fontWeight: FontWeight } {
  if (selectedValue === "Londrina Solid Black") {
    return { fontFamily: "Londrina Solid", fontWeight: 900 };
  }
  const supported = getCuratedFont(selectedValue).weights;
  const nextWeight = supported.includes(currentWeight)
    ? currentWeight
    : (supported[0] ?? 400);
  return { fontFamily: selectedValue, fontWeight: nextWeight };
}

/** Preloads stylesheets for all curated fonts so dropdown & canvas switching is instant. */
export function preloadAllCuratedFonts(): void {
  if (typeof document === "undefined") return;
  ensureGoogleFontLoaded("Londrina Solid", 900, false);
  for (const font of CURATED_FONTS) {
    ensureGoogleFontLoaded(font.name, font.weights[0] ?? 400, false);
  }
}

const fontBytesCache = new Map<string, Uint8Array | null>();

/**
 * Fetches TTF bytes for a curated Google Font from Fontsource CDN for
 * embedding directly inside exported PDFs via `@pdf-lib/fontkit`.
 */
export async function fetchFontBytesForPdf(
  fontFamily: string,
  weight: number,
  italic: boolean,
): Promise<Uint8Array | null> {
  const def = getCuratedFont(fontFamily);
  const closestWeight = def.weights.reduce((prev, curr) =>
    Math.abs(curr - weight) < Math.abs(prev - weight) ? curr : prev,
  );
  const style = def.hasItalic && italic ? "italic" : "normal";
  const cacheKey = `${def.slug}:${closestWeight}:${style}`;

  if (fontBytesCache.has(cacheKey)) {
    return fontBytesCache.get(cacheKey) ?? null;
  }

  const urls = [
    `https://cdn.jsdelivr.net/fontsource/fonts/${def.slug}@latest/latin-${closestWeight}-${style}.ttf`,
    `https://cdn.jsdelivr.net/fontsource/fonts/${def.slug}@latest/latin-400-normal.ttf`,
  ];

  for (const url of urls) {
    try {
      const response = await fetch(url, { mode: "cors" });
      if (!response.ok) continue;
      const buffer = await response.arrayBuffer();
      const bytes = new Uint8Array(buffer);
      fontBytesCache.set(cacheKey, bytes);
      return bytes;
    } catch {
      /* try next fallback */
    }
  }

  fontBytesCache.set(cacheKey, null);
  return null;
}
