"use client";

import { useEffect, useState } from "react";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CaseUpper,
  Italic,
  Sparkles,
  Type,
  Underline,
} from "lucide-react";
import type { TextElement } from "@/types";
import { useEditorStore } from "@/store";
import {
  CURATED_FONTS,
  ensureGoogleFontLoaded,
  FONT_PAIRING_PRESETS,
  getCuratedFont,
  preloadAllCuratedFonts,
  type FontPairingPreset,
} from "@/lib/fonts";
import { createTextElement } from "@/lib/elements";
import { cn } from "@/lib/cn";

interface TextToolbarProps {
  element: TextElement;
  pageId: string;
  pageWidthMm: number;
  pageHeightMm: number;
  anchorTopPx: number;
  placeBelow?: boolean;
}

/**
 * Compact floating toolbar for text elements.
 */
export function TextToolbar({
  element,
  pageId,
  pageWidthMm,
  pageHeightMm,
  anchorTopPx,
  placeBelow = false,
}: TextToolbarProps) {
  const updateElement = useEditorStore((state) => state.updateElement);
  const addElements = useEditorStore((state) => state.addElements);
  const [openPopover, setOpenPopover] = useState<
    "spacing" | "effects" | "pairings" | null
  >(null);

  useEffect(() => {
    preloadAllCuratedFonts();
  }, []);

  const update = (patch: Partial<TextElement>) =>
    updateElement(element.id, patch);

  const applyPairingPreset = (preset: FontPairingPreset) => {
    const margin = 18;
    const w = Math.max(40, pageWidthMm - margin * 2);
    const ySub = Math.round(pageHeightMm * 0.25);
    const yHead = ySub + 10;
    const yBody = yHead + 24;

    ensureGoogleFontLoaded(preset.subheading.fontFamily);
    ensureGoogleFontLoaded(preset.heading.fontFamily);
    ensureGoogleFontLoaded(preset.body.fontFamily);

    addElements(pageId, [
      createTextElement(
        { x: margin, y: ySub, width: w, height: 8 },
        {
          text: preset.subheading.text,
          fontFamily: preset.subheading.fontFamily,
          fontSize: preset.subheading.fontSize,
          fontWeight: preset.subheading.fontWeight,
          letterSpacing: preset.subheading.letterSpacing,
          textTransform: preset.subheading.textTransform,
          color: "#565E8E",
          align: "left",
          boxMode: "auto",
        },
      ),
      createTextElement(
        { x: margin, y: yHead, width: w, height: 18 },
        {
          text: preset.heading.text,
          fontFamily: preset.heading.fontFamily,
          fontSize: preset.heading.fontSize,
          fontWeight: preset.heading.fontWeight,
          letterSpacing: preset.heading.letterSpacing,
          textTransform: preset.heading.textTransform,
          color: "#122056",
          align: "left",
          lineHeight: 1.05,
          boxMode: "auto",
        },
      ),
      createTextElement(
        { x: margin, y: yBody, width: w, height: 28 },
        {
          text: preset.body.text,
          fontFamily: preset.body.fontFamily,
          fontSize: preset.body.fontSize,
          fontWeight: preset.body.fontWeight,
          lineHeight: preset.body.lineHeight,
          color: "#2B3258",
          align: "left",
          boxMode: "auto",
        },
      ),
    ]);
    setOpenPopover(null);
  };

  const isItalic = element.fontStyle === "italic";
  const isUnderline = element.textDecoration === "underline";
  const isUppercase = element.textTransform === "uppercase";
  const isFixed = element.boxMode === "fixed";

  return (
    <div
      role="toolbar"
      aria-label="Text formatting"
      onPointerDown={(event) => event.stopPropagation()}
      className="pointer-events-none absolute inset-x-3 z-30 flex flex-col items-center gap-1.5"
      style={{
        top: anchorTopPx,
        transform: placeBelow ? "translateY(0)" : "translateY(-100%)",
      }}
    >
      <div className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-ui border border-line bg-surface/95 px-2 py-1 shadow-panel backdrop-blur">
        {/* Font family (25 curated Google fonts) */}
        <select
          aria-label="Font family"
          value={element.fontFamily}
          onChange={(event) => {
            const font = event.target.value;
            ensureGoogleFontLoaded(
              font,
              element.fontWeight,
              element.fontStyle === "italic",
            );
            update({ fontFamily: font });
          }}
          style={{ fontFamily: `"${element.fontFamily}", var(--font-montserrat), sans-serif` }}
          className="h-6 max-w-28 shrink-0 rounded-[6px] border border-line bg-surface px-1.5 text-[10.5px] font-medium text-ink outline-none focus:border-accent"
        >
          {CURATED_FONTS.map((font) => (
            <option
              key={font.slug}
              value={font.name}
              style={{ fontFamily: `"${font.name}", sans-serif` }}
            >
              {font.name}
            </option>
          ))}
        </select>

        {/* Font size */}
        <div className="flex h-6 shrink-0 items-center rounded-[6px] border border-line bg-surface">
          <button
            type="button"
            aria-label="Decrease font size"
            onClick={() =>
              update({ fontSize: Math.max(4, Math.round(element.fontSize - 1)) })
            }
            className="px-1 text-[10.5px] text-ink-muted hover:text-ink"
          >
            −
          </button>
          <input
            type="number"
            aria-label="Font size"
            min={4}
            max={400}
            value={Math.round(element.fontSize * 10) / 10}
            onChange={(event) => {
              const v = Number(event.target.value);
              if (Number.isFinite(v) && v >= 4 && v <= 400) {
                update({ fontSize: v });
              }
            }}
            className="w-8 bg-transparent text-center font-mono text-[10.5px] text-ink outline-none"
          />
          <button
            type="button"
            aria-label="Increase font size"
            onClick={() =>
              update({ fontSize: Math.min(400, Math.round(element.fontSize + 1)) })
            }
            className="px-1 text-[10.5px] text-ink-muted hover:text-ink"
          >
            +
          </button>
        </div>

        {/* Weight */}
        {(() => {
          const weights = getCuratedFont(element.fontFamily).weights;
          const weightLabels: Record<400 | 500 | 600 | 700, string> = {
            400: "Reg",
            500: "Med",
            600: "Semi",
            700: "Bold",
          };
          return (
            <select
              aria-label="Font weight"
              value={
                weights.includes(element.fontWeight)
                  ? element.fontWeight
                  : weights[0]
              }
              onChange={(event) => {
                const w = Number(event.target.value) as 400 | 500 | 600 | 700;
                ensureGoogleFontLoaded(
                  element.fontFamily,
                  w,
                  element.fontStyle === "italic",
                );
                update({ fontWeight: w });
              }}
              className="h-6 shrink-0 rounded-[6px] border border-line bg-surface px-1 text-[10px] font-medium text-ink outline-none focus:border-accent"
            >
              {weights.map((w) => (
                <option key={w} value={w}>
                  {weightLabels[w]}
                </option>
              ))}
            </select>
          );
        })()}

        {/* Italic / Underline / Uppercase */}
        <button
          type="button"
          aria-pressed={isItalic}
          aria-label="Italic"
          onClick={() => update({ fontStyle: isItalic ? "normal" : "italic" })}
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-[6px] border text-xs transition-colors",
            isItalic
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-muted hover:text-ink",
          )}
        >
          <Italic className="size-3" />
        </button>
        <button
          type="button"
          aria-pressed={isUnderline}
          aria-label="Underline"
          onClick={() =>
            update({ textDecoration: isUnderline ? "none" : "underline" })
          }
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-[6px] border text-xs transition-colors",
            isUnderline
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-muted hover:text-ink",
          )}
        >
          <Underline className="size-3" />
        </button>
        <button
          type="button"
          aria-pressed={isUppercase}
          aria-label="Uppercase"
          onClick={() =>
            update({ textTransform: isUppercase ? "none" : "uppercase" })
          }
          className={cn(
            "inline-flex size-6 shrink-0 items-center justify-center rounded-[6px] border text-xs transition-colors",
            isUppercase
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-muted hover:text-ink",
          )}
        >
          <CaseUpper className="size-3" />
        </button>

        {/* Color */}
        <label
          aria-label="Text color"
          className="relative inline-flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-[6px] border border-line bg-surface"
        >
          <span
            className="size-3.5 rounded-full border border-black/15"
            style={{ backgroundColor: element.color }}
          />
          <input
            type="color"
            value={element.color.startsWith("#") ? element.color : "#122056"}
            onChange={(event) => update({ color: event.target.value })}
            className="sr-only"
          />
        </label>

        {/* Alignment */}
        <div className="flex h-6 shrink-0 items-center overflow-hidden rounded-[6px] border border-line bg-surface">
          {(
            [
              ["left", AlignLeft, "Align left"],
              ["center", AlignCenter, "Align center"],
              ["right", AlignRight, "Align right"],
            ] as const
          ).map(([align, Icon, label]) => (
            <button
              key={align}
              type="button"
              aria-pressed={element.align === align}
              aria-label={label}
              onClick={() => update({ align })}
              className={cn(
                "inline-flex h-full w-5 items-center justify-center transition-colors",
                element.align === align
                  ? "bg-accent-soft text-accent"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <Icon className="size-3" />
            </button>
          ))}
        </div>

        {/* Spacing / Effects / Box Mode / Pairings */}
        <button
          type="button"
          aria-expanded={openPopover === "spacing"}
          onClick={() =>
            setOpenPopover((p) => (p === "spacing" ? null : "spacing"))
          }
          className={cn(
            "h-6 shrink-0 rounded-[6px] border px-1.5 text-[10px] font-medium transition-colors",
            openPopover === "spacing"
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-muted hover:text-ink",
          )}
        >
          Spacing
        </button>
        <button
          type="button"
          aria-expanded={openPopover === "effects"}
          onClick={() =>
            setOpenPopover((p) => (p === "effects" ? null : "effects"))
          }
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-[6px] border px-1.5 text-[10px] font-medium transition-colors",
            openPopover === "effects" ||
              element.textShadow ||
              element.textOutline ||
              (element.textHighlight && element.textHighlight !== "transparent") ||
              element.curvedText
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-muted hover:text-ink",
          )}
        >
          <Sparkles className="size-2.5" />
          Effects
        </button>
        <button
          type="button"
          aria-pressed={isFixed}
          onClick={() => update({ boxMode: isFixed ? "auto" : "fixed" })}
          className={cn(
            "h-6 shrink-0 rounded-[6px] border px-1.5 text-[10px] font-medium transition-colors",
            isFixed
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-muted hover:text-ink",
          )}
          title="Toggle between auto-resize and fixed box"
        >
          {isFixed ? "Fixed" : "Auto"}
        </button>
        <button
          type="button"
          aria-expanded={openPopover === "pairings"}
          onClick={() =>
            setOpenPopover((p) => (p === "pairings" ? null : "pairings"))
          }
          className={cn(
            "inline-flex h-6 shrink-0 items-center gap-1 rounded-[6px] border px-1.5 text-[10px] font-medium transition-colors",
            openPopover === "pairings"
              ? "border-accent bg-accent-soft text-accent"
              : "border-line bg-surface text-ink-muted hover:text-ink",
          )}
        >
          <Type className="size-2.5" />
          Pairings
        </button>
      </div>

      {/* Popover sub-panels */}
      {openPopover === "spacing" ? (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="pointer-events-auto flex flex-wrap items-center gap-3 rounded-ui border border-line bg-surface px-3 py-2 text-[11px] shadow-panel"
        >
          <label className="flex items-center gap-1.5">
            <span className="text-ink-muted">Line</span>
            <input
              type="range"
              min={0.8}
              max={3.5}
              step={0.05}
              value={element.lineHeight}
              onChange={(e) => update({ lineHeight: Number(e.target.value) })}
              className="w-16 accent-accent"
            />
            <input
              type="number"
              step={0.05}
              min={0.8}
              max={3.5}
              value={element.lineHeight}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= 0.8 && v <= 3.5) {
                  update({ lineHeight: v });
                }
              }}
              className="h-6 w-12 rounded border border-line bg-surface-muted/40 px-1 font-mono text-[11px] text-ink outline-none"
            />
          </label>
          <label className="flex items-center gap-1.5">
            <span className="text-ink-muted">Tracking</span>
            <input
              type="range"
              min={-5}
              max={30}
              step={0.5}
              value={element.letterSpacing}
              onChange={(e) => update({ letterSpacing: Number(e.target.value) })}
              className="w-16 accent-accent"
            />
            <input
              type="number"
              step={0.5}
              min={-5}
              max={30}
              value={element.letterSpacing}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (Number.isFinite(v) && v >= -5 && v <= 30) {
                  update({ letterSpacing: v });
                }
              }}
              className="h-6 w-12 rounded border border-line bg-surface-muted/40 px-1 font-mono text-[11px] text-ink outline-none"
            />
          </label>
        </div>
      ) : null}

      {openPopover === "effects" ? (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="pointer-events-auto flex flex-wrap items-center gap-2 rounded-ui border border-line bg-surface px-3 py-2 text-[11px] shadow-panel"
        >
          <button
            type="button"
            aria-pressed={Boolean(element.textShadow)}
            onClick={() => update({ textShadow: !element.textShadow })}
            className={cn(
              "rounded-field border px-2 py-1 font-medium",
              element.textShadow
                ? "border-accent bg-accent-soft text-accent"
                : "border-line text-ink-muted",
            )}
          >
            Shadow
          </button>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={Boolean(element.textOutline)}
              onClick={() =>
                update({
                  textOutline: !element.textOutline,
                  textOutlineColor: element.textOutlineColor ?? "#5B65DC",
                })
              }
              className={cn(
                "rounded-field border px-2 py-1 font-medium",
                element.textOutline
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink-muted",
              )}
            >
              Outline
            </button>
            {element.textOutline ? (
              <input
                type="color"
                aria-label="Outline color"
                value={element.textOutlineColor ?? "#5B65DC"}
                onChange={(e) => update({ textOutlineColor: e.target.value })}
                className="size-5 cursor-pointer rounded border border-line bg-transparent p-0"
              />
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <button
              type="button"
              aria-pressed={
                Boolean(element.textHighlight) &&
                element.textHighlight !== "transparent"
              }
              onClick={() => {
                const active =
                  Boolean(element.textHighlight) &&
                  element.textHighlight !== "transparent";
                update({
                  textHighlight: active ? "transparent" : "#FEF08A",
                });
              }}
              className={cn(
                "rounded-field border px-2 py-1 font-medium",
                element.textHighlight && element.textHighlight !== "transparent"
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink-muted",
              )}
            >
              Highlight
            </button>
            {element.textHighlight && element.textHighlight !== "transparent" ? (
              <input
                type="color"
                aria-label="Highlight color"
                value={element.textHighlight}
                onChange={(e) => update({ textHighlight: e.target.value })}
                className="size-5 cursor-pointer rounded border border-line bg-transparent p-0"
              />
            ) : null}
          </div>
          <button
            type="button"
            aria-pressed={Boolean(element.curvedText)}
              onClick={() =>
                update({
                  curvedText: !element.curvedText,
                  curveRadius: element.curveRadius ?? 65,
                })
              }
              className={cn(
                "rounded-field border px-2 py-1 font-medium",
                element.curvedText
                  ? "border-accent bg-accent-soft text-accent"
                  : "border-line text-ink-muted",
              )}
            >
              Curved
            </button>
            {element.curvedText ? (
              <input
                type="range"
                aria-label="Curve arc"
                min={-100}
                max={100}
                value={element.curveRadius ?? 65}
              onChange={(e) =>
                update({ curveRadius: Number(e.target.value) })
              }
              className="w-20 accent-accent"
            />
          ) : null}
        </div>
      ) : null}

      {openPopover === "pairings" ? (
        <div
          onMouseDown={(e) => e.stopPropagation()}
          className="pointer-events-auto flex w-72 flex-col gap-1.5 rounded-ui border border-line bg-surface p-2.5 shadow-panel"
        >
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
            Insert Heading + Subheading + Body
          </span>
          {FONT_PAIRING_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => applyPairingPreset(preset)}
              className="flex flex-col items-start rounded-field border border-line px-2.5 py-1.5 text-left transition-colors hover:border-accent hover:bg-accent-soft/30"
            >
              <span className="text-[11.5px] font-semibold text-ink">
                {preset.name}
              </span>
              <span className="text-[10px] text-ink-muted">
                {preset.description}
              </span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
