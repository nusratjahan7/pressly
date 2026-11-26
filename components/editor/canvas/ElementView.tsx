"use client";

import type { CSSProperties } from "react";
import { useEffect, useState } from "react";
import { Lock, QrCode } from "lucide-react";
import type { Element, PageSize } from "@/types";
import { useEditorStore } from "@/store";
import { ELEMENT_TYPE_LABEL, getElementLabel } from "@/lib/elements";
import { buildCssFilterString, resolveMediaUrl } from "@/lib/mediaStorage";
import { ensureGoogleFontLoaded } from "@/lib/fonts";
import { buildCurvedTextPath, DEFAULT_CURVE_ARC } from "@/lib/textCurve";
import { ptToPx } from "@/lib/units";
import { StickerArt } from "@/components/editor/canvas/StickerArt";
import {
  HANDLE_CURSOR,
  type ResizeHandle,
  useElementTransform,
} from "@/components/editor/canvas/useElementTransform";
import { cn } from "@/lib/cn";

const RESIZE_HANDLES: ResizeHandle[] = [
  "nw",
  "n",
  "ne",
  "e",
  "se",
  "s",
  "sw",
  "w",
];

const HANDLE_POSITION: Record<ResizeHandle, { left: string; top: string }> = {
  nw: { left: "0%", top: "0%" },
  n: { left: "50%", top: "0%" },
  ne: { left: "100%", top: "0%" },
  e: { left: "100%", top: "50%" },
  se: { left: "100%", top: "100%" },
  s: { left: "50%", top: "100%" },
  sw: { left: "0%", top: "100%" },
  w: { left: "0%", top: "50%" },
};

interface ElementViewProps {
  element: Element;
  pageId: string;
  pageSize: PageSize;
  scale: number;
  interactive: boolean;
  selected: boolean;
}

function ResolvedDomImage({
  src,
  alt,
  style,
}: {
  src: string;
  alt: string;
  style: CSSProperties;
}) {
  const [resolved, setResolved] = useState(src.startsWith("idb:") ? "" : src);

  useEffect(() => {
    let cancelled = false;
    void resolveMediaUrl(src).then((url) => {
      if (!cancelled && url) setResolved(url);
    });
    return () => {
      cancelled = true;
    };
  }, [src]);

  if (!resolved) {
    return <div className="h-full w-full bg-[#eceef8]" />;
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={resolved}
      alt={alt}
      draggable={false}
      className="h-full w-full select-none"
      style={style}
    />
  );
}

function renderElementContent(element: Element, scale: number) {
  if (element.type === "text") {
    ensureGoogleFontLoaded(element.fontFamily);
    const isPlaceholder = Boolean(element.isPlaceholder);
    const displayText =
      element.textTransform === "uppercase"
        ? element.text.toUpperCase()
        : element.text;
    const hasHighlight =
      Boolean(element.textHighlight) && element.textHighlight !== "transparent";

    if (element.curvedText && displayText) {
      const wPx = Math.max(10, element.width * scale);
      const hPx = Math.max(10, element.height * scale);
      const { d: pathD } = buildCurvedTextPath(
        wPx,
        hPx,
        element.curveRadius ?? DEFAULT_CURVE_ARC,
      );
      const pathId = `curve-${element.id}`;
      return (
        <svg
          width="100%"
          height="100%"
          viewBox={`0 0 ${wPx} ${hPx}`}
          overflow="visible"
          style={{
            backgroundColor: hasHighlight ? element.textHighlight : undefined,
          }}
        >
          <defs>
            <path id={pathId} d={pathD} />
          </defs>
          <text
            fill={element.color}
            fontFamily={`"${element.fontFamily}", var(--font-montserrat), sans-serif`}
            fontSize={ptToPx(element.fontSize, scale)}
            fontWeight={element.fontWeight}
            fontStyle={element.fontStyle ?? "normal"}
            letterSpacing={ptToPx(element.letterSpacing, scale)}
            textDecoration={element.textDecoration}
            stroke={
              element.textOutline
                ? (element.textOutlineColor ?? "#5B65DC")
                : undefined
            }
            strokeWidth={
              element.textOutline
                ? Math.max(0.7, ptToPx(element.fontSize, scale) * 0.08)
                : 0
            }
            paintOrder="stroke"
          >
            <textPath
              href={`#${pathId}`}
              startOffset={
                element.align === "center"
                  ? "50%"
                  : element.align === "right"
                    ? "100%"
                    : "0%"
              }
              textAnchor={
                element.align === "center"
                  ? "middle"
                  : element.align === "right"
                    ? "end"
                    : "start"
              }
            >
              {displayText}
            </textPath>
          </text>
        </svg>
      );
    }

    return (
      <div
        className={cn(
          "h-full w-full overflow-hidden whitespace-pre-wrap break-words",
          isPlaceholder && "flex items-center justify-center border border-dashed border-[#122056]/30",
        )}
        style={{
          fontFamily: `"${element.fontFamily}", var(--font-montserrat), sans-serif`,
          fontSize: ptToPx(element.fontSize, scale),
          fontWeight: element.fontWeight,
          fontStyle: element.fontStyle ?? "normal",
          textDecoration: element.textDecoration ?? "none",
          lineHeight: element.lineHeight,
          letterSpacing: ptToPx(element.letterSpacing, scale),
          color: element.color,
          textAlign: element.align,
          backgroundColor: hasHighlight ? element.textHighlight : undefined,
          textShadow: element.textShadow
            ? "0 2px 6px rgba(18, 32, 86, 0.35)"
            : undefined,
          WebkitTextStroke: element.textOutline
            ? `${Math.max(0.6, ptToPx(element.fontSize, scale) * 0.06)}px ${element.textOutlineColor ?? "#FFFFFF"}`
            : undefined,
        }}
      >
        {displayText}
      </div>
    );
  }

  if (element.type === "image") {
    if (!element.src) {
      return (
        <div
          className="flex h-full w-full items-center justify-center bg-[#B5B7BF] text-white/90"
          style={{ borderRadius: Math.max(0, element.radius * scale) }}
        >
          <span className="text-[11px] font-medium">+</span>
        </div>
      );
    }
    const cropScale = Math.max(1, element.cropScale ?? 1);
    const cropX = element.cropX ?? 0;
    const cropY = element.cropY ?? 0;
    const filterCss = buildCssFilterString({
      brightness: element.brightness,
      contrast: element.contrast,
      saturation: element.saturation,
      grayscale: element.grayscale,
      blur: element.blur ? element.blur * scale : 0,
    });
    const borderW = Math.max(0, (element.borderWidth ?? 0) * scale);
    const hasBorder =
      borderW > 0 && element.borderColor && element.borderColor !== "transparent";
    const scaleX = (element.flipX ? -1 : 1) * cropScale;
    const scaleY = (element.flipY ? -1 : 1) * cropScale;

    return (
      <div
        className="h-full w-full overflow-hidden"
        style={{
          borderRadius: Math.max(0, element.radius * scale),
          border: hasBorder
            ? `${borderW}px solid ${element.borderColor}`
            : undefined,
          boxShadow: element.shadow
            ? "0 6px 16px rgba(18, 32, 86, 0.28)"
            : undefined,
          boxSizing: "border-box",
        }}
      >
        <ResolvedDomImage
          src={element.src}
          alt={element.alt || "Untitled image"}
          style={{
            objectFit: element.fit,
            objectPosition: `${50 - cropX * 50}% ${50 - cropY * 50}%`,
            filter: filterCss || undefined,
            transform:
              scaleX !== 1 || scaleY !== 1
                ? `scale(${scaleX}, ${scaleY})`
                : undefined,
            transformOrigin: `${50 - cropX * 50}% ${50 - cropY * 50}%`,
          }}
        />
      </div>
    );
  }

  if (element.type === "shape") {
    if (element.shape === "line") {
      const thickness = Math.max(1, element.strokeWidth * scale);
      const color =
        element.stroke !== "transparent" ? element.stroke : element.fill;
      return (
        <div className="relative h-full w-full">
          <div
            className="absolute left-0 top-1/2 w-full -translate-y-1/2"
            style={{
              height: thickness,
              backgroundColor:
                color === "transparent" ? "var(--ink)" : color,
            }}
          />
        </div>
      );
    }

    const hasFill = element.fill !== "transparent";
    const hasStroke =
      element.stroke !== "transparent" && element.strokeWidth > 0;
    return (
      <div
        className="h-full w-full"
        style={{
          backgroundColor: hasFill ? element.fill : "transparent",
          border: hasStroke
            ? `${Math.max(0.75, element.strokeWidth * scale)}px solid ${element.stroke}`
            : "none",
          borderRadius:
            element.shape === "ellipse"
              ? "50%"
              : Math.max(0, element.radius * scale),
          boxSizing: "border-box",
        }}
      />
    );
  }

  if (element.type === "sticker") {
    return (
      <StickerArt
        stickerId={element.stickerId}
        color={element.color}
        className="h-full w-full"
      />
    );
  }

  return (
    <div
      className="flex h-full w-full items-center justify-center rounded-[2px]"
      style={{
        color: element.foreground,
        backgroundColor: element.background,
      }}
    >
      <QrCode
        className="size-1/2 opacity-70"
        strokeWidth={1.4}
        aria-hidden="true"
      />
      <span className="sr-only">{element.value}</span>
    </div>
  );
}

export function ElementView({
  element,
  pageId,
  pageSize,
  scale,
  interactive,
  selected,
}: ElementViewProps) {
  const selectElement = useEditorStore((state) => state.selectElement);
  const updateElement = useEditorStore((state) => state.updateElement);
  const removeElement = useEditorStore((state) => state.removeElement);
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const { beginMove, beginResize } = useElementTransform(
    element,
    pageSize,
    scale,
  );

  const style: CSSProperties = {
    position: "absolute",
    left: element.x * scale,
    top: element.y * scale,
    width: element.width * scale,
    height: element.height * scale,
    transform: element.rotation ? `rotate(${element.rotation}deg)` : undefined,
    transformOrigin: "center",
    opacity: element.opacity,
    zIndex: element.zIndex,
    cursor: interactive ? (element.locked ? "default" : "move") : undefined,
    boxShadow: selected ? "0 0 0 1.5px var(--accent)" : undefined,
  };

  const label = getElementLabel(element, element.zIndex);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    if (!interactive) return;

    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      event.stopPropagation();
      selectElement(pageId, element.id);
      return;
    }

    if (event.key === "Escape") {
      event.stopPropagation();
      return;
    }

    if (!selected || element.locked) return;

    if (
      event.key === "ArrowLeft" ||
      event.key === "ArrowRight" ||
      event.key === "ArrowUp" ||
      event.key === "ArrowDown"
    ) {
      event.preventDefault();
      event.stopPropagation();
      const step = event.shiftKey ? 10 : 1;
      const dx =
        event.key === "ArrowLeft"
          ? -step
          : event.key === "ArrowRight"
            ? step
            : 0;
      const dy =
        event.key === "ArrowUp" ? -step : event.key === "ArrowDown" ? step : 0;
      pushHistory();
      updateElement(
        element.id,
        {
          x: Math.round((element.x + dx) * 10) / 10,
          y: Math.round((element.y + dy) * 10) / 10,
        },
        { commit: false },
      );
      return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      event.stopPropagation();
      removeElement(element.id);
    }
  };

  const content = renderElementContent(element, scale);

  const overlay = selected ? (
    <span
      aria-hidden="true"
      className="pointer-events-none absolute -top-6 left-0 inline-flex h-5 items-center gap-1 whitespace-nowrap rounded-[4px] bg-accent px-1.5 text-[9px] font-semibold uppercase tracking-[0.08em] text-accent-ink shadow-sm"
    >
      {element.locked ? <Lock className="size-2.5" /> : null}
      {ELEMENT_TYPE_LABEL[element.type]}
    </span>
  ) : null;

  const handles =
    selected && !element.locked ? (
      <>
        {RESIZE_HANDLES.map((handle) => {
          const position = HANDLE_POSITION[handle];
          return (
            <span
              key={handle}
              role="presentation"
              data-resize-handle={handle}
              onPointerDown={(event) => {
                event.preventDefault();
                event.stopPropagation();
                beginResize(handle, event);
              }}
              style={{
                left: position.left,
                top: position.top,
                cursor: HANDLE_CURSOR[handle],
              }}
              className="absolute z-10 size-[9px] -translate-x-1/2 -translate-y-1/2 rounded-[2px] border border-accent bg-surface shadow-sm"
            />
          );
        })}
      </>
    ) : null;

  if (!interactive) {
    return <div style={style}>{content}</div>;
  }

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label={`${label}${element.locked ? ", locked" : ""}`}
      aria-pressed={selected}
      title={label}
      data-element-id={element.id}
      style={style}
      onPointerDown={(event) => {
        event.stopPropagation();
        selectElement(pageId, element.id);
        if (!element.locked) beginMove(event);
      }}
      onKeyDown={handleKeyDown}
      className={cn(
        "select-none rounded-[1px] outline-none focus-visible:ring-2 focus-visible:ring-accent/60",
        element.locked && "cursor-default",
      )}
    >
      {content}
      {overlay}
      {handles}
    </div>
  );
}
