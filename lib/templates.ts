import type { Element, Page, PageSize, Project } from "@/types";
import templatesData from "@/lib/templates.json";
import { createId } from "@/lib/id";
import { ensureGoogleFontLoaded } from "@/lib/fonts";
import { round } from "@/lib/units";

export type TemplateTheme =
  | "Travel"
  | "Wedding"
  | "Fashion"
  | "Portfolio"
  | "Yearbook";

export const TEMPLATE_THEMES: TemplateTheme[] = [
  "Travel",
  "Wedding",
  "Fashion",
  "Portfolio",
  "Yearbook",
];

export interface MagazineTemplate {
  id: string;
  name: string;
  theme: TemplateTheme;
  description: string;
  palette: string[];
  typography: string;
  project: Project;
}

export interface TemplateContext {
  projectName: string;
  pageSize: PageSize;
}

export interface PageTemplate {
  id: string;
  name: string;
  description: string;
  backgroundId: string;
  build: (context: TemplateContext) => Element[];
}

export const MAGAZINE_TEMPLATES: MagazineTemplate[] =
  templatesData as MagazineTemplate[];

const templateMap = new Map(MAGAZINE_TEMPLATES.map((t) => [t.id, t]));

export function getMagazineTemplate(id: string): MagazineTemplate | undefined {
  return templateMap.get(id);
}

/**
 * Clones and proportionally rescales one template page to match the active
 * project's trim size, assigning fresh IDs and preloading referenced webfonts.
 */
export function instantiateTemplatePage(
  sourcePage: Page,
  fromSize: PageSize,
  toSize: PageSize,
): Page {
  const sx = toSize.w / Math.max(1, fromSize.w);
  const sy = toSize.h / Math.max(1, fromSize.h);
  const sFont = Math.min(sx, sy);

  const elements: Element[] = sourcePage.elements.map((el) => {
    const base = {
      ...structuredClone(el),
      id: createId(),
      x: round(el.x * sx, 2),
      y: round(el.y * sy, 2),
      width: round(el.width * sx, 2),
      height: round(el.height * sy, 2),
    };
    if (base.type === "text") {
      ensureGoogleFontLoaded(
        base.fontFamily,
        base.fontWeight,
        base.fontStyle === "italic",
      );
      return {
        ...base,
        fontSize: Math.max(5, round(base.fontSize * sFont, 1)),
        letterSpacing: round(base.letterSpacing * sFont, 2),
      };
    }
    return base;
  });

  return {
    id: createId(),
    backgroundId: sourcePage.backgroundId,
    elements,
    isEndPaper: sourcePage.isEndPaper,
    locked: sourcePage.locked,
    coverSide: sourcePage.coverSide,
  };
}
