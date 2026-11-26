import type { Element, PageSize } from "@/types";
import { createShapeElement, createStickerElement, createTextElement } from "@/lib/elements";

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

const INK = "#122056";
const PAPER = "#FFFFFF";
const MUTED = "#565E8E";
const ACCENT = "#5B65DC";

export const PAGE_TEMPLATES: PageTemplate[] = [
  {
    id: "editorial-cover",
    name: "Editorial cover",
    description: "A confident masthead with issue details.",
    backgroundId: "ivory",
    build: ({ projectName, pageSize }) => {
      const { w, h } = pageSize;
      const m = Math.round(Math.min(w, h) * 0.095);
      const s = Math.min(w / 210, h / 297);
      return [
        createTextElement(
          { x: m, y: m, width: w - m * 2, height: 10, zIndex: 0 },
          {
            text: "PRESSLY STUDIO",
            fontSize: 8 * s,
            fontWeight: 600,
            letterSpacing: 2.2 * s,
            color: MUTED,
            lineHeight: 1,
          },
        ),
        createShapeElement(
          { x: m, y: m + 13, width: 26 * s, height: 1.4, zIndex: 1 },
          { fill: ACCENT, stroke: "transparent", strokeWidth: 0 },
        ),
        createTextElement(
          { x: m, y: h * 0.62, width: w - m * 2, height: 70 * s, zIndex: 2 },
          {
            text: projectName || "Untitled Issue",
            fontSize: 56 * s,
            fontWeight: 600,
            lineHeight: 0.94,
            letterSpacing: -1.6 * s,
            color: INK,
          },
        ),
        createTextElement(
          { x: m, y: h - m - 10, width: w - m * 2, height: 10, zIndex: 3 },
          {
            text: "ISSUE 01 — MMXXVI",
            fontSize: 9 * s,
            fontWeight: 500,
            letterSpacing: 1.6 * s,
            color: MUTED,
            lineHeight: 1,
          },
        ),
        createStickerElement(
          {
            x: w - m - 18,
            y: m - 3,
            width: 18,
            height: 18,
            zIndex: 4,
            rotation: 9,
          },
          { stickerId: "sparkle", color: ACCENT },
        ),
      ];
    },
  },
  {
    id: "title-page",
    name: "Title page",
    description: "A quiet, centred opening statement.",
    backgroundId: "paper",
    build: ({ projectName, pageSize }) => {
      const { w, h } = pageSize;
      const s = Math.min(w / 210, h / 297);
      return [
        createTextElement(
          { x: 24, y: 30, width: w - 48, height: 8, zIndex: 0 },
          {
            text: "PRESSLY",
            fontSize: 8 * s,
            fontWeight: 600,
            letterSpacing: 4 * s,
            color: MUTED,
            align: "center",
            lineHeight: 1,
          },
        ),
        createTextElement(
          { x: 24, y: h * 0.4, width: w - 48, height: 62, zIndex: 1 },
          {
            text: projectName || "Untitled Issue",
            fontSize: 40 * s,
            fontWeight: 600,
            letterSpacing: -0.8 * s,
            color: INK,
            align: "center",
            lineHeight: 1.02,
          },
        ),
        createShapeElement(
          {
            x: w / 2 - 12,
            y: h * 0.4 + 66,
            width: 24,
            height: 1.2,
            zIndex: 2,
          },
          { fill: ACCENT, stroke: "transparent", strokeWidth: 0 },
        ),
        createTextElement(
          { x: 24, y: h - 46, width: w - 48, height: 8, zIndex: 3 },
          {
            text: "VOLUME 01",
            fontSize: 8.5 * s,
            fontWeight: 500,
            letterSpacing: 2.6 * s,
            color: MUTED,
            align: "center",
            lineHeight: 1,
          },
        ),
      ];
    },
  },
  {
    id: "chapter-opener",
    name: "Chapter opener",
    description: "A dark chapter divider with a numeral.",
    backgroundId: "ink",
    build: ({ projectName, pageSize }) => {
      const { w, h } = pageSize;
      const m = Math.round(Math.min(w, h) * 0.095);
      const s = Math.min(w / 210, h / 297);
      return [
        createTextElement(
          { x: m, y: m, width: w - m * 2, height: 8, zIndex: 0 },
          {
            text: "PRESSLY",
            fontSize: 8 * s,
            fontWeight: 600,
            letterSpacing: 3 * s,
            color: PAPER,
            opacity: 0.6,
            lineHeight: 1,
          },
        ),
        createTextElement(
          { x: m - 4, y: h * 0.26, width: w - m * 2, height: 130, zIndex: 1 },
          {
            text: "01",
            fontSize: 128 * s,
            fontWeight: 700,
            letterSpacing: -6 * s,
            color: PAPER,
            opacity: 0.12,
            lineHeight: 0.8,
          },
        ),
        createShapeElement(
          { x: m, y: h * 0.53, width: 28 * s, height: 1.4, zIndex: 2 },
          { fill: ACCENT, stroke: "transparent", strokeWidth: 0 },
        ),
        createTextElement(
          {
            x: m,
            y: h * 0.58,
            width: w - m * 2,
            height: 44,
            zIndex: 3,
          },
          {
            text: projectName || "Chapter one",
            fontSize: 34 * s,
            fontWeight: 500,
            letterSpacing: -0.8 * s,
            color: PAPER,
            lineHeight: 1.05,
          },
        ),
        createTextElement(
          { x: m, y: h - m - 8, width: w - m * 2, height: 8, zIndex: 4 },
          {
            text: "A STUDY IN LIGHT AND FORM",
            fontSize: 8 * s,
            fontWeight: 500,
            letterSpacing: 1.8 * s,
            color: PAPER,
            opacity: 0.55,
            lineHeight: 1,
          },
        ),
      ];
    },
  },
  {
    id: "statement",
    name: "Statement",
    description: "A full-colour page built around one idea.",
    backgroundId: "indigo",
    build: ({ projectName, pageSize }) => {
      const { w, h } = pageSize;
      const m = Math.round(Math.min(w, h) * 0.095);
      const s = Math.min(w / 210, h / 297);
      return [
        createTextElement(
          { x: m, y: m, width: w - m * 2, height: 8, zIndex: 0 },
          {
            text: "PRESSLY STUDIO",
            fontSize: 8 * s,
            fontWeight: 600,
            letterSpacing: 2.2 * s,
            color: PAPER,
            opacity: 0.7,
            lineHeight: 1,
          },
        ),
        createTextElement(
          {
            x: m,
            y: h * 0.5,
            width: w - m * 2,
            height: 78,
            zIndex: 1,
          },
          {
            text: projectName || "Untitled Issue",
            fontSize: 44 * s,
            fontWeight: 500,
            letterSpacing: -1.2 * s,
            color: PAPER,
            lineHeight: 0.98,
          },
        ),
        createTextElement(
          { x: m, y: h - m - 10, width: w - m * 2, height: 10, zIndex: 2 },
          {
            text: "AN INDEPENDENT PUBLICATION",
            fontSize: 8 * s,
            fontWeight: 500,
            letterSpacing: 1.8 * s,
            color: PAPER,
            opacity: 0.72,
            lineHeight: 1,
          },
        ),
      ];
    },
  },
  {
    id: "imprint",
    name: "Imprint",
    description: "A precise colophon for the final pages.",
    backgroundId: "paper",
    build: ({ projectName, pageSize }) => {
      const { w, h } = pageSize;
      const m = Math.round(Math.min(w, h) * 0.095);
      const s = Math.min(w / 210, h / 297);
      return [
        createTextElement(
          { x: m, y: h * 0.34, width: w - m * 2, height: 14, zIndex: 0 },
          {
            text: "Colophon",
            fontSize: 24 * s,
            fontWeight: 600,
            letterSpacing: -0.4 * s,
            color: INK,
            lineHeight: 1,
          },
        ),
        createShapeElement(
          { x: m, y: h * 0.34 + 18, width: 30, height: 1.2, zIndex: 1 },
          { fill: ACCENT, stroke: "transparent", strokeWidth: 0 },
        ),
        createTextElement(
          { x: m, y: h * 0.34 + 30, width: w - m * 2, height: 46, zIndex: 2 },
          {
            text: `${projectName || "Untitled Issue"}\nSet in Inter\nPrinted on uncoated stock`,
            fontSize: 10 * s,
            fontWeight: 400,
            lineHeight: 1.9,
            color: MUTED,
          },
        ),
        createTextElement(
          { x: m, y: h - m - 16, width: w - m * 2, height: 16, zIndex: 3 },
          {
            text: "pressly.studio\nhello@pressly.studio",
            fontSize: 9 * s,
            fontWeight: 400,
            lineHeight: 1.6,
            color: INK,
          },
        ),
      ];
    },
  },
];
