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

export const SEED_PAGE_COUNT = 8;

export function createSeedProject(): Project {
  const pages: Page[] = [];

  const cover = createPage("ivory");
  cover.elements = [
    createTextElement(
      { x: 20, y: 26, width: 132, height: 8, zIndex: 0 },
      {
        text: "PRESSLY STUDIO",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: 2.2,
        color: "#6B675F",
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
        fontWeight: 600,
        lineHeight: 0.94,
        letterSpacing: -1.8,
        color: DEFAULT_TEXT_COLOR,
      },
    ),
    createTextElement(
      { x: 20, y: 258, width: 150, height: 8, zIndex: 3 },
      {
        text: "ISSUE 01 — MMXXVI",
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: 1.6,
        color: "#6B675F",
        lineHeight: 1,
      },
    ),
    createStickerElement(
      { x: 172, y: 22, width: 18, height: 18, zIndex: 4, rotation: 9 },
      { stickerId: "sparkle", color: DEFAULT_ACCENT },
    ),
  ];
  pages.push(cover);

  const insideFront = createPage("ivory");
  insideFront.elements = [
    createTextElement(
      { x: 20, y: 26, width: 100, height: 8, zIndex: 0 },
      {
        text: "PRESSLY",
        fontSize: 8,
        fontWeight: 600,
        letterSpacing: 3,
        color: "#6B675F",
        lineHeight: 1,
      },
    ),
    createShapeElement(
      { x: 20, y: 38, width: 26, height: 1.2, zIndex: 1 },
      { fill: DEFAULT_ACCENT, stroke: "transparent", strokeWidth: 0 },
    ),
    createTextElement(
      { x: 20, y: 118, width: 170, height: 8, zIndex: 2 },
      {
        text: "A PRESSLY PUBLICATION",
        fontSize: 8,
        fontWeight: 500,
        letterSpacing: 2.4,
        color: "#6B675F",
        align: "center",
        lineHeight: 1,
      },
    ),
    createTextElement(
      { x: 20, y: 136, width: 170, height: 18, zIndex: 3 },
      {
        text: "Issue 01",
        fontSize: 40,
        fontWeight: 500,
        lineHeight: 1,
        letterSpacing: -1.2,
        color: DEFAULT_TEXT_COLOR,
        align: "center",
      },
    ),
    createShapeElement(
      { x: 93, y: 188, width: 24, height: 1.2, zIndex: 4 },
      { fill: DEFAULT_ACCENT, stroke: "transparent", strokeWidth: 0 },
    ),
    createTextElement(
      { x: 20, y: 202, width: 170, height: 8, zIndex: 5 },
      {
        text: "MMXXVI",
        fontSize: 9,
        fontWeight: 500,
        letterSpacing: 3,
        color: "#6B675F",
        align: "center",
        lineHeight: 1,
      },
    ),
    createStickerElement(
      { x: 158, y: 240, width: 30, height: 30, zIndex: 6, opacity: 0.28 },
      { stickerId: "ring", color: DEFAULT_ACCENT },
    ),
  ];
  pages.push(insideFront);

  for (let index = 2; index < SEED_PAGE_COUNT - 1; index += 1) {
    pages.push(createPage("paper"));
  }

  const backCover = createPage("black");
  backCover.elements = [
    createTextElement(
      { x: 20, y: 244, width: 170, height: 10, zIndex: 0 },
      {
        text: "Pressly",
        fontSize: 20,
        fontWeight: 500,
        letterSpacing: -0.4,
        color: "#F6F1E7",
        lineHeight: 1,
      },
    ),
    createTextElement(
      { x: 20, y: 260, width: 170, height: 6, zIndex: 1 },
      {
        text: "pressly.studio",
        fontSize: 8,
        fontWeight: 400,
        letterSpacing: 1.2,
        color: "#A7A198",
        lineHeight: 1,
      },
    ),
    createShapeElement(
      { x: 20, y: 234, width: 18, height: 1.2, zIndex: 2 },
      { fill: DEFAULT_ACCENT, stroke: "transparent", strokeWidth: 0 },
    ),
  ];
  pages.push(backCover);

  return {
    id: createId(),
    name: "Untitled Issue",
    pageSize: {
      w: 210,
      h: 297,
      unit: "mm",
      bleed: 3,
    },
    pages,
  };
}
