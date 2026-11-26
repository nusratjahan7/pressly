export interface StickerPath {
  d: string;
  fill?: "currentColor" | "none";
  stroke?: "currentColor" | "none";
  strokeWidth?: number;
}

export interface StickerDefinition {
  id: string;
  name: string;
  viewBox: string;
  paths: StickerPath[];
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

export const STICKERS: StickerDefinition[] = [
  {
    id: "star",
    name: "Star",
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
    name: "Burst",
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
    name: "Heart",
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
    name: "Sun",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 7.6a4.4 4.4 0 1 0 0 8.8 4.4 4.4 0 0 0 0-8.8Z", stroke: "currentColor", strokeWidth: 1.5 },
      { d: "M12 1.8v2.6M12 19.6v2.6M1.8 12h2.6M19.6 12h2.6M4.8 4.8l1.8 1.8M17.4 17.4l1.8 1.8M19.2 4.8l-1.8 1.8M6.6 17.4l-1.8 1.8", stroke: "currentColor", strokeWidth: 1.5 },
    ],
  },
  {
    id: "arrow",
    name: "Arrow",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M4.5 19.5 19.5 4.5", stroke: "currentColor", strokeWidth: 1.6 },
      { d: "M10.5 4.5h9v9", stroke: "currentColor", strokeWidth: 1.6 },
    ],
  },
  {
    id: "wave",
    name: "Wave",
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
    name: "Flower",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 9.2a2.8 2.8 0 1 0 0 5.6 2.8 2.8 0 0 0 0-5.6Z", fill: "currentColor" },
      { d: "M12 2.2a3.1 3.1 0 0 1 0 6.2 3.1 3.1 0 0 1 0-6.2ZM21.8 12a3.1 3.1 0 0 1-6.2 0 3.1 3.1 0 0 1 6.2 0ZM12 21.8a3.1 3.1 0 0 1 0-6.2 3.1 3.1 0 0 1 0 6.2ZM2.2 12a3.1 3.1 0 0 1 6.2 0 3.1 3.1 0 0 1-6.2 0Z", stroke: "currentColor", strokeWidth: 1.3 },
    ],
  },
  {
    id: "arch",
    name: "Arch",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M4.8 21V12a7.2 7.2 0 0 1 14.4 0v9", stroke: "currentColor", strokeWidth: 1.6 },
    ],
  },
  {
    id: "ring",
    name: "Ring",
    viewBox: "0 0 24 24",
    paths: [
      { d: "M12 3.2a8.8 8.8 0 1 0 0 17.6 8.8 8.8 0 0 0 0-17.6Z", stroke: "currentColor", strokeWidth: 1.6 },
    ],
  },
];

const stickerMap = new Map(STICKERS.map((sticker) => [sticker.id, sticker]));

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
      const fill = path.fill === "currentColor" ? color : "none";
      const stroke = path.stroke === "currentColor" ? color : "none";
      return `<path d="${path.d}" fill="${fill}" stroke="${stroke}" stroke-width="${path.strokeWidth ?? 0}" stroke-linecap="round" stroke-linejoin="round"/>`;
    })
    .join("");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${sticker.viewBox}">${paths}</svg>`;
}
