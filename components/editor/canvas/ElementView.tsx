"use client";

import type { CSSProperties } from "react";
import { Lock, QrCode } from "lucide-react";
import type { Element, PageSize } from "@/types";
import { useEditorStore } from "@/store";
import { ELEMENT_TYPE_LABEL, getElementLabel } from "@/lib/elements";
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

function renderElementContent(element: Element, scale: number) {
  if (element.type === "text") {
    const isPlaceholder = Boolean(element.isPlaceholder);
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
          lineHeight: element.lineHeight,
          letterSpacing: ptToPx(element.letterSpacing, scale),
          color: element.color,
          textAlign: element.align,
        }}
      >
        {element.text}
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
    return (
      <div
        className="h-full w-full overflow-hidden"
        style={{ borderRadius: Math.max(0, element.radius * scale) }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={element.src}
          alt={element.alt || "Untitled image"}
          draggable={false}
          className="h-full w-full select-none"
          style={{
            objectFit: element.fit,
            objectPosition: `${50 - cropX * 50}% ${50 - cropY * 50}%`,
            transform: cropScale > 1 ? `scale(${cropScale})` : undefined,
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
