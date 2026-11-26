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
  solid("ivory", "Ivory", "#FAFAFD", "light"),
  solid("lilac", "Lilac", "#EEEFFD", "light"),
  solid("mist", "Mist", "#DDE0F7", "light"),
  solid("periwinkle", "Periwinkle", "#C3C8F2", "light"),
  solid("indigo", "Indigo", "#5B65DC", "dark"),
  solid("ink", "Ink", "#122056", "dark"),
  solid("navy", "Navy", "#1A2A6B", "dark"),
  solid("slate", "Slate", "#4A5183", "dark"),
  pattern(
    "dotted",
    "Dotted ivory",
    "#FAFAFD",
    "light",
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
    {
      backgroundImage:
        "repeating-linear-gradient(45deg, rgba(18,32,86,0.05) 0, rgba(18,32,86,0.05) 1px, transparent 1px, transparent 7px)",
    },
    { kind: "hatch", color: "#122056", opacity: 0.05, spacingMm: 2.5 },
  ),
];

export const DEFAULT_BACKGROUND_ID = "paper";

const backgroundMap = new Map(BACKGROUNDS.map((bg) => [bg.id, bg]));

export function getBackground(id: string | null | undefined): BackgroundDefinition {
  return backgroundMap.get(id ?? "") ?? backgroundMap.get(DEFAULT_BACKGROUND_ID)!;
}

export const LIGHT_TEXT_ON_BACKGROUND = "#FFFFFF";
