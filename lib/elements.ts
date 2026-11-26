import type {
  Element,
  ElementType,
  FontWeight,
  ImageElement,
  QrElement,
  ShapeElement,
  StickerElement,
  TextElement,
} from "@/types";
import { createId } from "@/lib/id";
import { findSticker } from "@/lib/stickers";

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

export const DEFAULT_TEXT_COLOR = "#122056";
export const DEFAULT_ACCENT = "#5B65DC";
export const FONT_FAMILY = "Londrina Solid";
export const DEFAULT_FONT_WEIGHT: FontWeight = 900;

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
    fontWeight: DEFAULT_FONT_WEIGHT,
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
  const shapeKind = patch.shape ?? "rectangle";
  return {
    id: createId(),
    type: "shape",
    ...geometryDefaults,
    ...geometry,
    zIndex: geometry.zIndex ?? 0,
    shape: shapeKind,
    fill:
      shapeKind === "line" || shapeKind === "arrow"
        ? "transparent"
        : "#E9ECFE",
    stroke: "#5B65DC",
    strokeWidth: shapeKind === "line" || shapeKind === "arrow" ? 0.9 : 0.5,
    radius: 0,
    sides: shapeKind === "polygon" ? 6 : shapeKind === "star" ? 5 : undefined,
    innerRadiusRatio: shapeKind === "star" ? 0.45 : undefined,
    shadow: false,
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
    value: "",
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

const SHAPE_LABEL_MAP: Record<ShapeElement["shape"], string> = {
  rectangle: "Rectangle",
  ellipse: "Ellipse",
  line: "Line",
  arrow: "Arrow",
  polygon: "Polygon",
  star: "Star",
};

export function getElementLabel(element: Element, index: number) {
  const customName = element.name?.trim();
  if (customName) return customName;
  switch (element.type) {
    case "text":
      return element.text.trim().slice(0, 48) || `Text ${index + 1}`;
    case "image":
      return element.alt.trim() || `Image ${index + 1}`;
    case "shape":
      return SHAPE_LABEL_MAP[element.shape] ?? "Shape";
    case "sticker":
      return findSticker(element.stickerId)?.name ?? "Sticker";
    case "qr":
      return "QR code";
  }
}
