export const MM_PER_INCH = 25.4;
export const PT_PER_INCH = 72;
export const PX_PER_INCH = 96;

/** CSS pixels per millimetre at 96 DPI, used for UI-only previews. */
export const MM_TO_PX = PX_PER_INCH / MM_PER_INCH;
/** PostScript points per millimetre, used for print output. */
export const MM_TO_PT = PT_PER_INCH / MM_PER_INCH;

export const mmToPx = (mm: number, pxPerMm = MM_TO_PX) => mm * pxPerMm;
export const pxToMm = (px: number, pxPerMm = MM_TO_PX) => px / pxPerMm;
export const mmToPt = (mm: number) => mm * MM_TO_PT;
export const ptToMm = (pt: number) => (pt * MM_PER_INCH) / PT_PER_INCH;
export const ptToPx = (pt: number, pxPerMm = MM_TO_PX) =>
  ptToMm(pt) * pxPerMm;
export const mmToInches = (mm: number) => mm / MM_PER_INCH;

export const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);

export const round = (value: number, decimals = 2) => {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
};

export function formatNumber(value: number, decimals = 1) {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: 0,
  }).format(value);
}

export function formatMm(mm: number) {
  return `${formatNumber(mm, 1)} mm`;
}

export function formatDimensions(w: number, h: number) {
  return `${formatNumber(w, 1)} × ${formatNumber(h, 1)} mm`;
}

export interface PageSizePreset {
  id: string;
  label: string;
  description: string;
  w: number;
  h: number;
  bleed: number;
}

export const PAGE_SIZE_PRESETS: PageSizePreset[] = [
  { id: "a4", label: "A4", description: "210 × 297 mm", w: 210, h: 297, bleed: 3 },
  { id: "a5", label: "A5", description: "148 × 210 mm", w: 148, h: 210, bleed: 3 },
  { id: "a3", label: "A3", description: "297 × 420 mm", w: 297, h: 420, bleed: 3 },
  {
    id: "letter",
    label: "Letter",
    description: "8.5 × 11 in",
    w: 215.9,
    h: 279.4,
    bleed: 3,
  },
  {
    id: "square-8",
    label: "Square 8 × 8 in",
    description: "203.2 × 203.2 mm",
    w: 203.2,
    h: 203.2,
    bleed: 3,
  },
  {
    id: "square-10",
    label: "Square 10 × 10 in",
    description: "254 × 254 mm",
    w: 254,
    h: 254,
    bleed: 3,
  },
  { id: "book-6x9", label: "Book 6 × 9 in", description: "152.4 × 228.6 mm", w: 152.4, h: 228.6, bleed: 3 },
];

export function findPresetForSize(w: number, h: number) {
  return PAGE_SIZE_PRESETS.find(
    (preset) =>
      (Math.abs(preset.w - w) < 0.1 && Math.abs(preset.h - h) < 0.1) ||
      (Math.abs(preset.w - h) < 0.1 && Math.abs(preset.h - w) < 0.1),
  );
}

export const inchesToMm = (inches: number) => inches * MM_PER_INCH;

/** Millimetres to inches, rounded to a sensible editing precision. */
export function mmToInchesRounded(mm: number, decimals = 2) {
  return round(mm / MM_PER_INCH, decimals);
}

export function zoneFromPercentage(
  pageW: number,
  pageH: number,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  return {
    x: (pageW * x) / 100,
    y: (pageH * y) / 100,
    width: (pageW * w) / 100,
    height: (pageH * h) / 100,
  };
}
