import type {
  Element,
  ElementType,
  ImageElement,
  QrElement,
  ShapeElement,
  StickerElement,
  TextElement,
} from "@/types";
import { createId } from "@/lib/id";

interface Geometry {
  x: number;
  y: number;
  width: number;
  height: number;
  zIndex?: number;
  rotation?: number;
  opacity?: number;
  locked?: boolean;
}

const geometryDefaults = {
  zIndex: 0,
  rotation: 0,
  opacity: 1,
  locked: false,
} satisfies Pick<Element, "zIndex" | "rotation" | "opacity" | "locked">;

export const DEFAULT_TEXT_COLOR = "#1C1B19";
export const DEFAULT_ACCENT = "#C2542D";
export const FONT_FAMILY = "Inter";

export function createTextElement(
  geometry: Geometry,
  patch: Partial<
    Omit<TextElement, "id" | "type" | "x" | "y" | "width" | "height">
  > = {},
): TextElement {
  return {
    id: createId(),
    type: "text",
    ...geometryDefaults,
    ...geometry,
    zIndex: geometry.zIndex ?? 0,
    text: "",
    fontFamily: FONT_FAMILY,
    fontSize: 24,
    fontWeight: 400,
    color: DEFAULT_TEXT_COLOR,
    align: "left",
    lineHeight: 1.25,
    letterSpacing: 0,
    ...patch,
  };
}

export function createImageElement(
  geometry: Geometry,
  patch: Partial<
    Omit<ImageElement, "id" | "type" | "x" | "y" | "width" | "height">
  > = {},
): ImageElement {
  return {
    id: createId(),
    type: "image",
    ...geometryDefaults,
    ...geometry,
    zIndex: geometry.zIndex ?? 0,
    src: "",
    alt: "",
    fit: "cover",
    radius: 0,
    ...patch,
  };
}

export function createShapeElement(
  geometry: Geometry,
  patch: Partial<
    Omit<ShapeElement, "id" | "type" | "x" | "y" | "width" | "height">
  > = {},
): ShapeElement {
  return {
    id: createId(),
    type: "shape",
    ...geometryDefaults,
    ...geometry,
    zIndex: geometry.zIndex ?? 0,
    shape: "rectangle",
    fill: "transparent",
    stroke: "#C2542D",
    strokeWidth: 0.5,
    radius: 0,
    ...patch,
  };
}

export function createStickerElement(
  geometry: Geometry,
  patch: Partial<
    Omit<StickerElement, "id" | "type" | "x" | "y" | "width" | "height">
  > = {},
): StickerElement {
  return {
    id: createId(),
    type: "sticker",
    ...geometryDefaults,
    ...geometry,
    zIndex: geometry.zIndex ?? 0,
    stickerId: "star",
    color: DEFAULT_TEXT_COLOR,
    ...patch,
  };
}

export function createQrElement(
  geometry: Geometry,
  patch: Partial<
    Omit<QrElement, "id" | "type" | "x" | "y" | "width" | "height">
  > = {},
): QrElement {
  return {
    id: createId(),
    type: "qr",
    ...geometryDefaults,
    ...geometry,
    zIndex: geometry.zIndex ?? 0,
    value: "https://pressly.studio",
    foreground: DEFAULT_TEXT_COLOR,
    background: "#FFFFFF",
    errorCorrection: "M",
    ...patch,
  };
}

export const ELEMENT_TYPE_LABEL: Record<ElementType, string> = {
  image: "Image",
  text: "Text",
  shape: "Shape",
  sticker: "Sticker",
  qr: "QR code",
};

export function nextZIndex(elements: Element[]) {
  return elements.reduce((max, el) => Math.max(max, el.zIndex), -1) + 1;
}

export function getElementLabel(element: Element, index: number) {
  switch (element.type) {
    case "text":
      return element.text.trim().slice(0, 48) || `Text ${index + 1}`;
    case "image":
      return element.alt.trim() || `Image ${index + 1}`;
    case "shape":
      return element.shape === "ellipse"
        ? "Ellipse"
        : element.shape === "line"
          ? "Line"
          : "Rectangle";
    case "sticker":
      return "Sticker";
    case "qr":
      return "QR code";
  }
}
