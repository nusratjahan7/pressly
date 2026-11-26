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
  {
    id: "a4",
    label: "A4",
    description: "210 × 297 mm",
    w: 210,
    h: 297,
    bleed: 3,
  },
  {
    id: "a5",
    label: "A5",
    description: "148 × 210 mm",
    w: 148,
    h: 210,
    bleed: 3,
  },
  {
    id: "letter",
    label: "US Letter",
    description: "8.5 × 11 in",
    w: 215.9,
    h: 279.4,
    bleed: 3,
  },
  {
    id: "square",
    label: "Square",
    description: "210 × 210 mm",
    w: 210,
    h: 210,
    bleed: 3,
  },
  {
    id: "tabloid",
    label: "Tabloid",
    description: "279 × 432 mm",
    w: 279,
    h: 432,
    bleed: 5,
  },
];

export function findPresetForSize(w: number, h: number, bleed: number) {
  return PAGE_SIZE_PRESETS.find(
    (preset) =>
      Math.abs(preset.w - w) < 0.1 &&
      Math.abs(preset.h - h) < 0.1 &&
      Math.abs(preset.bleed - bleed) < 0.1,
  );
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
