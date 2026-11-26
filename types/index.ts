/** Internal geometry unit. Display units are a UI concern only. */
export type Unit = "mm";

export type BindingType = "saddle-stitch" | "perfect-bound" | "hardcover";

export type Orientation = "portrait" | "landscape";

export interface PageSize {
  /** Trim width in millimetres. */
  w: number;
  /** Trim height in millimetres. */
  h: number;
  unit: Unit;
  /** Extra stock outside the trim edge, in millimetres. */
  bleed: number;
  /** Inset from the trim edge kept free of critical content, in millimetres. */
  safeMargin: number;
  binding: BindingType;
}

export type ElementType = "image" | "text" | "shape" | "sticker" | "qr";

export interface ElementBase {
  id: string;
  type: ElementType;
  /** Horizontal offset from the page trim edge, in millimetres. */
  x: number;
  /** Vertical offset from the page trim edge, in millimetres. */
  y: number;
  /** Rendered width in millimetres. */
  width: number;
  /** Rendered height in millimetres. */
  height: number;
  /** Clockwise rotation in degrees. */
  rotation: number;
  /** 0–1 */
  opacity: number;
  locked: boolean;
  zIndex: number;
  /**
   * When true the element is rendered across both pages of its spread instead
   * of being clipped to its own page. Opt-in only, so elements never cross the
   * spine by accident.
   */
  spanSpread?: boolean;
}

export interface ImageElement extends ElementBase {
  type: "image";
  src: string;
  alt: string;
  fit: "cover" | "contain";
  /** Corner radius in millimetres. */
  radius: number;
  /** Pan/zoom scale inside the frame (>= 1). */
  cropScale?: number;
  /** Horizontal pan inside the frame (-1..1). */
  cropX?: number;
  /** Vertical pan inside the frame (-1..1). */
  cropY?: number;
}

export type TextAlign = "left" | "center" | "right";

export interface TextElement extends ElementBase {
  type: "text";
  text: string;
  fontFamily: string;
  /** Font size in points. */
  fontSize: number;
  fontWeight: 400 | 500 | 600 | 700;
  color: string;
  align: TextAlign;
  lineHeight: number;
  /** Letter spacing in points. */
  letterSpacing: number;
  /** True while the frame still holds layout placeholder text. */
  isPlaceholder?: boolean;
}

export type ShapeKind = "rectangle" | "ellipse" | "line";

export interface ShapeElement extends ElementBase {
  type: "shape";
  shape: ShapeKind;
  fill: string;
  stroke: string;
  /** Stroke width in millimetres. */
  strokeWidth: number;
  /** Corner radius in millimetres. */
  radius: number;
}

export interface StickerElement extends ElementBase {
  type: "sticker";
  stickerId: string;
  color: string;
}

export interface QrElement extends ElementBase {
  type: "qr";
  value: string;
  foreground: string;
  background: string;
  errorCorrection: "L" | "M" | "Q" | "H";
}

export type Element =
  | ImageElement
  | TextElement
  | ShapeElement
  | StickerElement
  | QrElement;

export interface MediaAsset {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
}

export interface PageLayoutMeta {
  layoutId: string;
  /** Gutter between frames in millimetres. */
  gapMm: number;
  /** Outer margin from page trim edge in millimetres. */
  marginMm: number;
}

export interface Page {
  id: string;
  backgroundId: string;
  elements: Element[];
  /**
   * End papers are glued to the inside of the cover. They are part of the
   * physical book but cannot hold content.
   */
  isEndPaper?: boolean;
  /**
   * Locked pages reject drops, text and stickers, and render with a
   * non-interactive overlay. End papers are always locked.
   */
  locked?: boolean;
  /**
   * Which half of the wrap-around cover this page is. Only set on the two
   * pages of the cover spread.
   */
  coverSide?: "back" | "front";
  /** Applied layout configuration for live gap & margin adjustments. */
  layoutMeta?: PageLayoutMeta;
}

export interface Project {
  id: string;
  name: string;
  /** Optional custom text printed vertically on the cover spine. Defaults to project name when undefined. */
  spineText?: string;
  pageSize: PageSize;
  pages: Page[];
  /** Project-level uploaded photos, including unused/unplaced photos. */
  mediaLibrary?: MediaAsset[];
}
