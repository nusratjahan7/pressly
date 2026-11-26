import type { CSSProperties } from "react";

export type BackgroundPattern =
  | "dots"
  | "ruled"
  | "grid"
  | "hatch";

export interface BackgroundDefinition {
  id: string;
  name: string;
  /** Base colour also used by the PDF renderer. */
  baseColor: string;
  tone: "light" | "dark";
  style: CSSProperties;
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
  style: { backgroundColor: color },
});

const pattern = (
  id: string,
  name: string,
  baseColor: string,
  tone: "light" | "dark",
  overlay: Pick<CSSProperties, "backgroundImage" | "backgroundSize" | "backgroundPosition">,
  pdfPattern: BackgroundDefinition["pdfPattern"],
): BackgroundDefinition => ({
  id,
  name,
  baseColor,
  tone,
  style: {
    backgroundColor: baseColor,
    ...overlay,
  },
  pdfPattern,
});

export const BACKGROUNDS: BackgroundDefinition[] = [
  solid("paper", "Paper", "#FFFFFF", "light"),
  solid("ivory", "Ivory", "#F6F1E7", "light"),
  solid("sand", "Sand", "#E8DFCF", "light"),
  solid("fog", "Fog", "#DDD8CE", "light"),
  solid("sage", "Sage", "#CAD2C2", "light"),
  solid("blush", "Blush", "#EAD5CD", "light"),
  solid("clay", "Clay", "#BF6444", "dark"),
  solid("black", "Ink", "#1F1E1B", "dark"),
  solid("graphite", "Graphite", "#45433D", "dark"),
  solid("midnight", "Midnight", "#26313B", "dark"),
  pattern(
    "dotted",
    "Dotted ivory",
    "#FAF7F0",
    "light",
    {
      backgroundImage:
        "radial-gradient(circle at 1px 1px, rgba(28,27,25,0.16) 1px, transparent 1.2px)",
      backgroundSize: "8px 8px",
    },
    { kind: "dots", color: "#1C1B19", opacity: 0.16, spacingMm: 2.4 },
  ),
  pattern(
    "ruled",
    "Ruled",
    "#FBF8F1",
    "light",
    {
      backgroundImage:
        "repeating-linear-gradient(to bottom, transparent 0, transparent 9px, rgba(28,27,25,0.09) 9px, rgba(28,27,25,0.09) 10px)",
    },
    { kind: "ruled", color: "#1C1B19", opacity: 0.09, spacingMm: 3 },
  ),
  pattern(
    "grid",
    "Grid",
    "#F8F6F0",
    "light",
    {
      backgroundImage:
        "linear-gradient(to right, rgba(28,27,25,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(28,27,25,0.06) 1px, transparent 1px)",
      backgroundSize: "10px 10px",
    },
    { kind: "grid", color: "#1C1B19", opacity: 0.06, spacingMm: 3 },
  ),
  pattern(
    "hatch",
    "Hatch",
    "#F2EEE5",
    "light",
    {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(28,27,25,0.05) 0, rgba(28,27,25,0.05) 1px, transparent 1px, transparent 7px)",
    },
    { kind: "hatch", color: "#1C1B19", opacity: 0.05, spacingMm: 2.5 },
  ),
];

export const DEFAULT_BACKGROUND_ID = "paper";

const backgroundMap = new Map(BACKGROUNDS.map((bg) => [bg.id, bg]));

export function getBackground(id: string | null | undefined): BackgroundDefinition {
  return backgroundMap.get(id ?? "") ?? backgroundMap.get(DEFAULT_BACKGROUND_ID)!;
}

export const LIGHT_TEXT_ON_BACKGROUND = "#F6F1E7";
