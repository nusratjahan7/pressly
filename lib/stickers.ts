import type { CustomStickerAsset, StickerCategory } from "@/types";
import { PNG_STICKERS } from "@/lib/stickersPng";

export const STICKER_CATEGORIES: StickerCategory[] = [
  "Travel",
  "Love",
  "Birthday",
  "Vintage",
  "Typography",
  "Paper tape",
  "Stamps",
];

export interface StickerPath {
  d: string;
  fill?: "currentColor" | "none" | string;
  stroke?: "currentColor" | "none" | string;
  strokeWidth?: number;
  opacity?: number;
}

export interface StickerDefinition {
  id: string;
  name: string;
  category: StickerCategory;
  keywords: string;
  format: "svg" | "png";
  src?: string;
  viewBox: string;
  paths: StickerPath[];
  aspectRatio?: number;
}

function burstPath(spikes: number, outer: number, inner: number, cx = 12, cy = 12) {
  const points: string[] = [];
  const step = Math.PI / spikes;
  for (let i = 0; i < spikes * 2; i += 1) {
    const radius = i % 2 === 0 ? outer : inner;
    const angle = i * step - Math.PI / 2;
    const x = cx + Math.cos(angle) * radius;
    const y = cy + Math.sin(angle) * radius;
    points.push(`${i === 0 ? "M" : "L"}${x.toFixed(3)} ${y.toFixed(3)}`);
  }
  return `${points.join(" ")} Z`;
}

export const SVG_STICKERS: StickerDefinition[] = [
  {
    id: "star",
    name: "Star",
    category: "Birthday",
    keywords: "star accent sparkle celebration",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M12 2.6l2.95 5.98 6.6.96-4.775 4.655 1.127 6.573L12 17.664l-5.902 3.104 1.127-6.573L2.45 9.54l6.6-.96L12 2.6Z",
        fill: "currentColor",
      },
    ],
  },
  {
    id: "sparkle",
    name: "Sparkle",
    category: "Birthday",
    keywords: "sparkle twinkle shine party",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M11 2c.55 4.7 2.75 6.9 7.45 7.45-4.7.55-6.9 2.75-7.45 7.45-.55-4.7-2.75-6.9-7.45-7.45C8.25 8.9 10.45 6.7 11 2Z",
        fill: "currentColor",
      },
      {
        d: "M18.6 14.6c.24 2.05 1.2 3.01 3.25 3.25-2.05.24-3.01 1.2-3.25 3.25-.24-2.05-1.2-3.01-3.25-3.25 2.05-.24 3.01-1.2 3.25-3.25Z",
        fill: "currentColor",
      },
    ],
  },
  {
    id: "burst",
    name: "Burst Seal",
    category: "Stamps",
    keywords: "burst badge seal seal star",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      {
        d: burstPath(12, 10.6, 6.9),
        fill: "currentColor",
      },
    ],
  },
  {
    id: "heart",
    name: "Heart Ink",
    category: "Love",
    keywords: "heart love romance valentine",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M12 20.5S3.2 15.4 3.2 9.1A4.85 4.85 0 0 1 12 6.1a4.85 4.85 0 0 1 8.8 3c0 6.3-8.8 11.4-8.8 11.4Z",
        fill: "currentColor",
      },
    ],
  },
  {
    id: "sun",
    name: "Sunburst",
    category: "Travel",
    keywords: "sun summer travel rays warmth",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Z", stroke: "currentColor", strokeWidth: 1.5 },
      { d: "M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M19.2 4.8l-1.8 1.8M6.6 17.4l-1.8 1.8", stroke: "currentColor", strokeWidth: 1.5 },
    ],
  },
  {
    id: "arrow",
    name: "Pointer Arrow",
    category: "Typography",
    keywords: "arrow pointer corner highlight",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M4.5 19.5 19.5 4.5", stroke: "currentColor", strokeWidth: 1.6 },
      { d: "M10.5 4.5h9v9", stroke: "currentColor", strokeWidth: 1.6 },
    ],
  },
  {
    id: "wave",
    name: "Wave Underline",
    category: "Typography",
    keywords: "wave line underline divider",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      {
        d: "M1.8 12.3c2.1-4.3 4.25-4.3 6.35 0s4.25 4.3 6.35 0 4.25-4.3 6.35 0",
        stroke: "currentColor",
        strokeWidth: 1.6,
      },
    ],
  },
  {
    id: "flower",
    name: "Mod Blossom",
    category: "Vintage",
    keywords: "flower blossom retro floral",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z", fill: "currentColor" },
      { d: "M12 2.2a3.1 3.1 0 0 1 0 6.2 3.1 3.1 0 0 1 0-6.2ZM21.8 12a3.1 3.1 0 0 1-6.2 0 3.1 3.1 0 0 1 6.2 0ZM12 21.8a3.1 3.1 0 0 1 0-6.2 3.1 3.1 0 0 1 0 6.2ZM2.2 12a3.1 3.1 0 0 1 6.2 0 3.1 3.1 0 0 1-6.2 0Z", stroke: "currentColor", strokeWidth: 1.3 },
    ],
  },
  {
    id: "arch",
    name: "Studio Arch",
    category: "Vintage",
    keywords: "arch portal frame architecture",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M4.8 21V12a7.2 7.2 0 0 1 14.4 0v9", stroke: "currentColor", strokeWidth: 1.6 },
    ],
  },
  {
    id: "ring",
    name: "Postmark Ring",
    category: "Stamps",
    keywords: "ring circle seal stamp border",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Z", stroke: "currentColor", strokeWidth: 1.6 },
    ],
  },
  // Paper tape SVGs
  {
    id: "tape-kraft",
    name: "Kraft Paper Tape",
    category: "Paper tape",
    keywords: "paper tape washi masking kraft torn scrapbook",
    format: "svg",
    viewBox: "0 0 48 16",
    aspectRatio: 3,
    paths: [
      { d: "M2 2.5 L46 2 L44.4 5.2 L46.3 8 L44.2 11 L46 13.8 L2 14 L3.7 10.6 L1.8 7.5 L3.8 4.8 Z", fill: "#D9BE9B", opacity: 0.88 },
      { d: "M6 5.5 H42 M8 10.5 H38", stroke: "#B49068", strokeWidth: 0.6, opacity: 0.45 },
    ],
  },
  {
    id: "tape-blush",
    name: "Blush Washi Strip",
    category: "Paper tape",
    keywords: "paper tape pink pastel washi masking sticky",
    format: "svg",
    viewBox: "0 0 48 16",
    aspectRatio: 3,
    paths: [
      { d: "M2.5 2 L45.5 2.4 L44 6 L46 9.5 L44.5 13.8 L2.2 13.5 L3.9 9.5 L1.9 5.8 Z", fill: "#F5C6D6", opacity: 0.86 },
      { d: "M9 2.2 V13.6 M17 2.2 V13.6 M25 2.2 V13.6 M33 2.2 V13.6 M41 2.2 V13.6", stroke: "#E69BB4", strokeWidth: 1.4, opacity: 0.5 },
    ],
  },
  {
    id: "tape-sage",
    name: "Sage Masking Tape",
    category: "Paper tape",
    keywords: "paper tape green sage masking torn scrapbook",
    format: "svg",
    viewBox: "0 0 48 16",
    aspectRatio: 3,
    paths: [
      { d: "M2 2.4 L46 2 L44.5 6.5 L46.2 10 L44.8 13.8 L2 14 L3.5 9.8 L1.8 6 Z", fill: "#B8D8C8", opacity: 0.85 },
      { d: "M6 8 H42", stroke: "#7FA994", strokeWidth: 0.8, opacity: 0.45 },
    ],
  },
  {
    id: "tape-indigo",
    name: "Midnight Corner Tape",
    category: "Paper tape",
    keywords: "paper tape blue stripe washi torn collage",
    format: "svg",
    viewBox: "0 0 48 16",
    aspectRatio: 3,
    paths: [
      { d: "M2.2 2 L45.8 2.3 L44.2 6 L46 9.2 L44.4 13.8 L2 13.5 L3.6 9.4 L1.9 5.5 Z", fill: "#C5CCFA", opacity: 0.84 },
      { d: "M4 5 H44 M4 11 H44", stroke: "#5B65DC", strokeWidth: 0.9, opacity: 0.45 },
    ],
  },
  // Typography SVGs
  {
    id: "type-pill-memories",
    name: "Memories Frame Stamp",
    category: "Typography",
    keywords: "typography frame ribbon editorial label memories",
    format: "svg",
    viewBox: "0 0 48 20",
    aspectRatio: 2.4,
    paths: [
      { d: "M3 2 H45 V18 H3 Z", stroke: "currentColor", strokeWidth: 1.4 },
      { d: "M6 5 H42 V15 H6 Z", stroke: "currentColor", strokeWidth: 0.7 },
      { d: "M12 10 H36", stroke: "currentColor", strokeWidth: 1.6 },
    ],
  },
  {
    id: "type-asterisk",
    name: "Editorial Asterisk",
    category: "Typography",
    keywords: "typography asterisk ornament glyph star",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 2.5v19M3.8 7.2l16.4 9.6M20.2 7.2 3.8 16.8", stroke: "currentColor", strokeWidth: 2.1 },
    ],
  },
  {
    id: "type-quote-mark",
    name: "Serif Quote Mark",
    category: "Typography",
    keywords: "typography quote quotation serif editorial",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M10.4 7.2c-2.6 0-4.4 1.9-4.4 4.5 0 2.1 1.4 3.5 3.2 3.5.7 0 1.3-.2 1.7-.5-.4 2.1-1.7 3.7-3.9 4.5l.8 1.5c3.5-1.2 5.4-4.2 5.4-8.2 0-3.2-1.1-5.3-2.8-5.3Zm9.2 0c-2.6 0-4.4 1.9-4.4 4.5 0 2.1 1.4 3.5 3.2 3.5.7 0 1.3-.2 1.7-.5-.4 2.1-1.7 3.7-3.9 4.5l.8 1.5c3.5-1.2 5.4-4.2 5.4-8.2 0-3.2-1.1-5.3-2.8-5.3Z", fill: "currentColor" },
    ],
  },
  // Stamp SVGs
  {
    id: "stamp-postmark",
    name: "Circular Postmark",
    category: "Stamps",
    keywords: "stamp postmark airmail vintage seal travel",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 2.2a9.8 9.8 0 1 0 0 19.6 9.8 9.8 0 0 0 0-19.6Z", stroke: "currentColor", strokeWidth: 1.4 },
      { d: "M12 5a7 7 0 1 0 0 14 7 7 0 0 0 0-14Z", stroke: "currentColor", strokeWidth: 0.9 },
      { d: "M3 10.2h18M3 13.8h18", stroke: "currentColor", strokeWidth: 1.1 },
    ],
  },
  {
    id: "stamp-perforated",
    name: "Postage Stamp Frame",
    category: "Stamps",
    keywords: "stamp postage border frame perforated mail",
    format: "svg",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M3.5 3.5h17v17h-17z", stroke: "currentColor", strokeWidth: 1.4 },
      { d: "M6 6h12v12H6z", stroke: "currentColor", strokeWidth: 0.8 },
      { d: "M12 8.2l1.2 2.5 2.8.4-2 2 .5 2.7L12 14.5l-2.5 1.3.5-2.7-2-2 2.8-.4 1.2-2.5Z", fill: "currentColor" },
    ],
  },
];

export const BUILTIN_PNG_STICKERS: StickerDefinition[] = PNG_STICKERS.map((item) => ({
  id: item.id,
  name: item.name,
  category: item.category,
  keywords: item.keywords,
  format: "png",
  src: item.src,
  viewBox: "0 0 24 24",
  paths: [],
}));

export const STICKERS: StickerDefinition[] = [
  ...SVG_STICKERS,
  ...BUILTIN_PNG_STICKERS,
];

const stickerMap = new Map(STICKERS.map((sticker) => [sticker.id, sticker]));

export function findSticker(id: string): StickerDefinition | undefined {
  return stickerMap.get(id);
}

export function getSticker(id: string): StickerDefinition {
  return stickerMap.get(id) ?? STICKERS[0]!;
}

export function stickerToSvgString(
  id: string,
  color: string,
  size = 512,
): string {
  const sticker = getSticker(id);
  const paths = sticker.paths
    .map((path) => {
      const fill =
        path.fill === "currentColor" ? color : path.fill ?? "none";
      const stroke =
        path.stroke === "currentColor" ? color : path.stroke ?? "none";
      const op = path.opacity !== undefined ? ` opacity="${path.opacity}"` : "";
      return `<path d="${path.d}" fill="${fill}" stroke="${stroke}" stroke-width="${path.strokeWidth ?? 0}"${op} stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${sticker.viewBox}">${paths}</svg>`;
}

const RECENT_KEY = "pressly:recent-stickers:v1";
const CUSTOM_KEY = "pressly:custom-stickers:v1";
const MAX_RECENT = 18;

export function loadRecentStickerIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed)
      ? parsed.filter((id): id is string => typeof id === "string")
      : [];
  } catch {
    return [];
  }
}

export function recordRecentSticker(id: string): string[] {
  const prev = loadRecentStickerIds().filter((item) => item !== id);
  const next = [id, ...prev].slice(0, MAX_RECENT);
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(next));
    } catch {
      /* ignore quota error */
    }
  }
  return next;
}

export function loadCustomStickers(): CustomStickerAsset[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CUSTOM_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CustomStickerAsset[]) : [];
  } catch {
    return [];
  }
}

export function saveCustomStickers(items: CustomStickerAsset[]): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CUSTOM_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota error */
  }
}
