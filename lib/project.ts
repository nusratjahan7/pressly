import type { Page, Project } from "@/types";
import { createId } from "@/lib/id";
import {
  createShapeElement,
  createStickerElement,
  createTextElement,
  DEFAULT_ACCENT,
  DEFAULT_TEXT_COLOR,
} from "@/lib/elements";

export function createPage(backgroundId = "paper"): Page {
  return {
    id: createId(),
    backgroundId,
    elements: [],
  };
}

/** End papers are glued to the cover and cannot hold content. */
export function createEndPaper(backgroundId = "mist"): Page {
  return {
    id: createId(),
    backgroundId,
    elements: [],
    isEndPaper: true,
    locked: true,
  };
}

export function createCoverPage(side: "back" | "front", backgroundId = "ink") {
  return {
    ...createPage(backgroundId),
    coverSide: side,
  } satisfies Page;
}

/** Editable content pages in the seed document. */
export const SEED_PAGE_COUNT = 6;

export function createSeedProject(): Project {
  const pages: Page[] = [];

  // Spread 0 — wrap-around cover: back cover | front cover.
  pages.push(createCoverPage("back"));
  const frontCover = createCoverPage("front", "ivory");
  frontCover.elements = [
    createTextElement(
      { x: 20, y: 26, width: 132, height: 8, zIndex: 0 },
      {
        text: "PRESSLY STUDIO",
        fontSize: 9,
        letterSpacing: 2.2,
        color: "#565E8E",
        lineHeight: 1,
      },
    ),
    createShapeElement(
      { x: 20, y: 38, width: 26, height: 1.4, zIndex: 1 },
      { fill: DEFAULT_ACCENT, stroke: "transparent", strokeWidth: 0 },
    ),
    createTextElement(
      { x: 20, y: 184, width: 170, height: 62, zIndex: 2 },
      {
        text: "Untitled Issue",
        fontSize: 58,
        lineHeight: 0.94,
        letterSpacing: -0.6,
        color: DEFAULT_TEXT_COLOR,
      },
    ),
    createTextElement(
      { x: 20, y: 258, width: 150, height: 8, zIndex: 3 },
      {
        text: "ISSUE 01 — MMXXVI",
        fontSize: 10,
        letterSpacing: 1.6,
        color: "#565E8E",
        lineHeight: 1,
      },
    ),
    createStickerElement(
      { x: 172, y: 22, width: 18, height: 18, zIndex: 4, rotation: 9 },
      { stickerId: "sparkle", color: DEFAULT_ACCENT },
    ),
  ];
  pages.push(frontCover);

  // Spread 1 — inside front end paper | page 1.
  pages.push(createEndPaper());
  pages.push(createPage("paper"));

  // Remaining content pages, so the total editable count is SEED_PAGE_COUNT.
  for (let index = 1; index < SEED_PAGE_COUNT; index += 1) {
    pages.push(createPage("paper"));
  }

  // Final spread — last page | inside back end paper.
  pages.push(createEndPaper());

  return {
    id: createId(),
    name: "Untitled Issue",
    pageSize: {
      w: 210,
      h: 297,
      unit: "mm",
      bleed: 3,
      safeMargin: 5,
      binding: "perfect-bound",
    },
    pages,
  };
}
