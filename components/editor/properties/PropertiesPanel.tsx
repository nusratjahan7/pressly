"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  CaseUpper,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  FlipHorizontal2,
  FlipVertical2,
  Italic,
  Lock,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  Underline,
  Unlock,
  X,
} from "lucide-react";
import type { Element, Page } from "@/types";
import { useEditorStore } from "@/store";
import { useSelectedElement } from "@/store/selectors";
import { getSpineWidth } from "@/lib/binding";
import { getEditablePageCount } from "@/lib/spreads";
import {
  CURATED_FONTS,
  ensureGoogleFontLoaded,
  getCuratedFont,
  preloadAllCuratedFonts,
} from "@/lib/fonts";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { formatNumber } from "@/lib/units";
import {
  ELEMENT_TYPE_LABEL,
  getElementLabel,
} from "@/lib/elements";
import { STICKERS } from "@/lib/stickers";
import {
  NumberField,
  PropertyGrid,
  PropertySection,
  SelectField,
  SegmentedField,
  TextField,
} from "@/components/editor/properties/fields";
import { ColorPicker } from "@/components/ui/color-picker";
import { IconButton } from "@/components/ui/icon-button";
import { Slider } from "@/components/ui/slider";
import { Toggle } from "@/components/ui/toggle";

function ColorField({
  label,
  value,
  onChange,
  allowTransparent = false,
  disabled,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  allowTransparent?: boolean;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9.5px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
        {label}
      </span>
      <ColorPicker
        value={value}
        onChange={onChange}
        label={label}
        allowTransparent={allowTransparent}
        disabled={disabled}
      />
    </div>
  );
}

function PropertiesContent({
  element,
  page,
}: {
  element: Element;
  page: Page;
}) {
  const project = useEditorStore((state) => state.project);
  const updateElement = useEditorStore((state) => state.updateElement);
  const updatePageLayoutSpacing = useEditorStore(
    (state) => state.updatePageLayoutSpacing,
  );
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const removeElement = useEditorStore((state) => state.removeElement);
  const moveElementLayer = useEditorStore((state) => state.moveElementLayer);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  const isCompact = useMediaQuery("(max-width: 1023px)");
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const locked = element.locked;
  const label = getElementLabel(element, element.zIndex);
  const update = (patch: Partial<Element>) =>
    updateElement(element.id, patch);

  if (isCompact && !mobileExpanded) {
    return (
      <motion.div
        key={`pill-${element.id}`}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-3 right-3 z-30 flex max-w-[calc(100%-24px)] items-center gap-1 rounded-full border border-line bg-surface/95 py-1 pl-3 pr-1.5 shadow-panel backdrop-blur"
      >
        <button
          type="button"
          onClick={() => setMobileExpanded(true)}
          className="flex min-w-0 items-center gap-1.5 text-left text-[11px] font-medium text-ink hover:text-accent"
        >
          <SlidersHorizontal className="size-3.5 shrink-0 text-accent" />
          <span className="truncate">{label}</span>
          <span className="shrink-0 text-[10px] text-ink-subtle">
            · Properties
          </span>
          <ChevronUp className="size-3.5 shrink-0 text-ink-subtle" />
        </button>
        <IconButton
          icon={Trash2}
          label="Remove element"
          size="sm"
          variant="danger-ghost"
          onClick={() => removeElement(element.id)}
          disabled={locked}
        />
        <IconButton
          icon={X}
          label="Close properties"
          size="sm"
          variant="ghost"
          onClick={clearSelection}
        />
      </motion.div>
    );
  }

  return (
    <motion.aside
      key={element.id}
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`${ELEMENT_TYPE_LABEL[element.type]} properties`}
      className="absolute z-30 flex max-h-[min(44dvh,420px)] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-panel max-lg:inset-x-3 max-lg:bottom-3 lg:bottom-4 lg:right-4 lg:top-4 lg:max-h-none lg:w-[300px]"
    >
      <header className="flex shrink-0 items-start gap-2 border-b border-line px-3.5 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Selected · {ELEMENT_TYPE_LABEL[element.type]}
          </span>
          <h2
            className="truncate text-[12.5px] font-semibold leading-4 tracking-[-0.01em] text-ink"
            title={label}
          >
            {label}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isCompact ? (
            <IconButton
              icon={ChevronDown}
              label="Collapse properties"
              tooltip="Collapse properties"
              size="sm"
              variant="ghost"
              onClick={() => setMobileExpanded(false)}
            />
          ) : null}
          <IconButton
            icon={locked ? Unlock : Lock}
            label={locked ? "Unlock element" : "Lock element"}
            tooltip={locked ? "Unlock element" : "Lock element"}
            size="sm"
            variant="ghost"
            onClick={() => update({ locked: !locked })}
          />
          <IconButton
            icon={Trash2}
            label="Remove element"
            tooltip="Remove element"
            size="sm"
            variant="danger-ghost"
            onClick={() => removeElement(element.id)}
            disabled={locked}
          />
          <IconButton
            icon={X}
            label="Close properties"
            tooltip="Close properties"
            size="sm"
            variant="ghost"
            onClick={clearSelection}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {locked ? (
          <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-3.5 py-2.5 text-[10.5px] leading-4 text-ink-muted">
            <Lock className="size-3 shrink-0" aria-hidden="true" />
            <span className="flex-1">This element is locked.</span>
            <button
              type="button"
              onClick={() => update({ locked: false })}
              className="font-medium text-accent underline-offset-2 hover:underline"
            >
              Unlock
            </button>
          </div>
        ) : null}

        <PropertySection title="Position & size">
          <PropertyGrid>
            <NumberField
              label="X"
              value={element.x}
              unit="mm"
              step={0.5}
              onCommit={(value) => update({ x: value })}
              disabled={locked}
            />
            <NumberField
              label="Y"
              value={element.y}
              unit="mm"
              step={0.5}
              onCommit={(value) => update({ y: value })}
              disabled={locked}
            />
            <NumberField
              label="Width"
              value={element.width}
              unit="mm"
              min={1}
              step={0.5}
              onCommit={(value) => update({ width: value })}
              disabled={locked}
            />
            <NumberField
              label="Height"
              value={element.height}
              unit="mm"
              min={1}
              step={0.5}
              onCommit={(value) => update({ height: value })}
              disabled={locked}
            />
            <NumberField
              label="Rotation"
              value={element.rotation}
              unit="°"
              min={-180}
              max={180}
              step={1}
              onCommit={(value) => update({ rotation: value })}
              disabled={locked}
              className="col-span-2"
            />
          </PropertyGrid>
        </PropertySection>

        <PropertySection title="Appearance">
          <Slider
            label="Opacity"
            value={Math.round(element.opacity * 100)}
            min={0}
            max={100}
            step={1}
            disabled={locked}
            formatValue={(value) => `${value}%`}
            onStart={pushHistory}
            onValueChange={(value) =>
              updateElement(
                element.id,
                { opacity: value / 100 },
                { commit: false },
              )
            }
          />
        </PropertySection>

        {element.type === "text" ? (
          <PropertySection title="Typography">
            <TextField
              label="Content"
              value={element.text}
              multiline
              rows={3}
              disabled={locked}
              onCommit={(value) =>
                update({ text: value, isPlaceholder: value.trim().length === 0 })
              }
            />
            <PropertyGrid>
              <NumberField
                label="Size"
                value={element.fontSize}
                unit="pt"
                min={4}
                max={400}
                step={0.5}
                disabled={locked}
                onCommit={(value) => update({ fontSize: value })}
              />
              <NumberField
                label="Leading"
                value={element.lineHeight}
                min={0.6}
                max={4}
                step={0.05}
                disabled={locked}
                onCommit={(value) => update({ lineHeight: value })}
              />
            </PropertyGrid>
            <SelectField
              label="Font"
              value={element.fontFamily}
              disabled={locked}
              options={CURATED_FONTS.map((font) => ({
                value: font.name,
                label: font.name,
              }))}
              onChange={(value) => {
                preloadAllCuratedFonts();
                const supported = getCuratedFont(value).weights;
                const nextWeight = supported.includes(element.fontWeight)
                  ? element.fontWeight
                  : (supported[0] ?? 400);
                ensureGoogleFontLoaded(
                  value,
                  nextWeight,
                  element.fontStyle === "italic",
                );
                update({ fontFamily: value, fontWeight: nextWeight });
              }}
            />
            <SelectField
              label="Weight"
              value={element.fontWeight}
              disabled={locked}
              options={getCuratedFont(element.fontFamily).weights.map((w) => ({
                value: w,
                label:
                  w === 400
                    ? "Regular (400)"
                    : w === 500
                      ? "Medium (500)"
                      : w === 600
                        ? "Semibold (600)"
                        : "Bold (700)",
              }))}
              onChange={(value) => {
                const w = value as 400 | 500 | 600 | 700;
                ensureGoogleFontLoaded(
                  element.fontFamily,
                  w,
                  element.fontStyle === "italic",
                );
                update({ fontWeight: w });
              }}
            />
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                aria-pressed={element.fontStyle === "italic"}
                disabled={locked}
                onClick={() =>
                  update({
                    fontStyle:
                      element.fontStyle === "italic" ? "normal" : "italic",
                  })
                }
                className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
              >
                <Italic className="size-3" />
                Italic
              </button>
              <button
                type="button"
                aria-pressed={element.textDecoration === "underline"}
                disabled={locked}
                onClick={() =>
                  update({
                    textDecoration:
                      element.textDecoration === "underline"
                        ? "none"
                        : "underline",
                  })
                }
                className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
              >
                <Underline className="size-3" />
                Underline
              </button>
              <button
                type="button"
                aria-pressed={element.textTransform === "uppercase"}
                disabled={locked}
                onClick={() =>
                  update({
                    textTransform:
                      element.textTransform === "uppercase"
                        ? "none"
                        : "uppercase",
                  })
                }
                className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
              >
                <CaseUpper className="size-3" />
                Upper
              </button>
            </div>
            <SegmentedField
              label="Box mode"
              value={element.boxMode ?? "auto"}
              disabled={locked}
              options={[
                { value: "auto", label: "Auto-size" },
                { value: "fixed", label: "Fixed box" },
              ]}
              onChange={(value) => update({ boxMode: value })}
            />
            <div className="flex flex-col gap-1.5 pt-1">
              <Toggle
                label="Text shadow"
                checked={Boolean(element.textShadow)}
                disabled={locked}
                onCheckedChange={(checked) => update({ textShadow: checked })}
              />
              <Toggle
                label="Text outline"
                checked={Boolean(element.textOutline)}
                disabled={locked}
                onCheckedChange={(checked) =>
                  update({
                    textOutline: checked,
                    textOutlineColor: element.textOutlineColor ?? "#5B65DC",
                  })
                }
              />
              <Toggle
                label="Curved text"
                checked={Boolean(element.curvedText)}
                disabled={locked}
                onCheckedChange={(checked) =>
                  update({
                    curvedText: checked,
                    curveRadius: element.curveRadius ?? 65,
                  })
                }
              />
              {element.curvedText ? (
                <Slider
                  label="Curve arc"
                  value={element.curveRadius ?? 65}
                  min={-100}
                  max={100}
                  step={2}
                  disabled={locked}
                  onStart={pushHistory}
                  onValueChange={(v) =>
                    updateElement(element.id, { curveRadius: v }, { commit: false })
                  }
                />
              ) : null}
              <ColorField
                label="Highlight"
                value={element.textHighlight ?? "transparent"}
                allowTransparent
                disabled={locked}
                onChange={(value) => update({ textHighlight: value })}
              />
            </div>
            <SegmentedField
              label="Alignment"
              value={element.align}
              disabled={locked}
              options={[
                { value: "left", label: "Align left", icon: AlignLeft, iconOnly: true },
                { value: "center", label: "Align centre", icon: AlignCenter, iconOnly: true },
                { value: "right", label: "Align right", icon: AlignRight, iconOnly: true },
              ]}
              onChange={(value) => update({ align: value })}
            />
            <PropertyGrid>
              <NumberField
                label="Tracking"
                value={element.letterSpacing}
                unit="pt"
                min={-10}
                max={30}
                step={0.1}
                disabled={locked}
                onCommit={(value) => update({ letterSpacing: value })}
              />
            </PropertyGrid>
            <ColorField
              label="Text colour"
              value={element.color}
              disabled={locked}
              onChange={(value) => update({ color: value })}
            />
          </PropertySection>
        ) : null}

        {element.type === "shape" ? (
          <PropertySection title="Shape">
            <SelectField
              label="Form"
              value={element.shape}
              disabled={locked}
              options={[
                { value: "rectangle", label: "Rectangle" },
                { value: "ellipse", label: "Ellipse" },
                { value: "line", label: "Line" },
              ]}
              onChange={(value) => update({ shape: value })}
            />
            <ColorField
              label="Fill"
              value={element.fill}
              allowTransparent
              disabled={locked}
              onChange={(value) => update({ fill: value })}
            />
            <ColorField
              label="Stroke"
              value={element.stroke}
              allowTransparent
              disabled={locked}
              onChange={(value) => update({ stroke: value })}
            />
            <PropertyGrid>
              <NumberField
                label="Stroke"
                value={element.strokeWidth}
                unit="mm"
                min={0}
                max={20}
                step={0.1}
                disabled={locked}
                onCommit={(value) => update({ strokeWidth: value })}
              />
              <NumberField
                label="Corner"
                value={element.radius}
                unit="mm"
                min={0}
                max={80}
                step={0.5}
                disabled={locked || element.shape !== "rectangle"}
                onCommit={(value) => update({ radius: value })}
              />
            </PropertyGrid>
          </PropertySection>
        ) : null}

        {element.type === "image" ? (
          <PropertySection title="Image">
            <SegmentedField
              label="Fit"
              value={element.fit}
              disabled={locked}
              options={[
                { value: "cover", label: "Cover" },
                { value: "contain", label: "Contain" },
              ]}
              onChange={(value) => update({ fit: value })}
            />
            <PropertyGrid>
              <NumberField
                label="Corner"
                value={element.radius}
                unit="mm"
                min={0}
                max={100}
                step={0.5}
                disabled={locked}
                onCommit={(value) => update({ radius: value })}
              />
            </PropertyGrid>
            <TextField
              label="Alt text"
              value={element.alt}
              placeholder="Describe the image"
              disabled={locked}
              onCommit={(value) => update({ alt: value })}
            />
              <div className="flex flex-col gap-2 pt-1">
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    aria-pressed={Boolean(element.flipX)}
                    disabled={locked}
                    onClick={() => update({ flipX: !element.flipX })}
                    className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
                  >
                    <FlipHorizontal2 className="size-3.5" />
                    Flip H
                  </button>
                  <button
                    type="button"
                    aria-pressed={Boolean(element.flipY)}
                    disabled={locked}
                    onClick={() => update({ flipY: !element.flipY })}
                    className="inline-flex h-7 flex-1 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent"
                  >
                    <FlipVertical2 className="size-3.5" />
                    Flip V
                  </button>
                  <button
                    type="button"
                    disabled={locked}
                    aria-label="Rotate 90 degrees left"
                    onClick={() =>
                      update({
                        rotation: ((element.rotation - 90 + 180) % 360) - 180,
                      })
                    }
                    className="inline-flex size-7 items-center justify-center rounded-field border border-line text-ink-muted hover:text-ink"
                  >
                    <RotateCcw className="size-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={locked}
                    aria-label="Rotate 90 degrees right"
                    onClick={() =>
                      update({
                        rotation: ((element.rotation + 90 + 180) % 360) - 180,
                      })
                    }
                    className="inline-flex size-7 items-center justify-center rounded-field border border-line text-ink-muted hover:text-ink"
                  >
                    <RotateCw className="size-3.5" />
                  </button>
                </div>

                {element.fit === "cover" ? (
                  <Slider
                    label="Crop zoom"
                    value={Math.round((element.cropScale ?? 1) * 100)}
                    min={100}
                    max={300}
                    step={5}
                    disabled={locked}
                    formatValue={(v) => `${(v / 100).toFixed(2)}×`}
                    onStart={pushHistory}
                    onValueChange={(v) =>
                      updateElement(
                        element.id,
                        { cropScale: v / 100 },
                        { commit: false },
                      )
                    }
                  />
                ) : null}

                <Slider
                  label="Brightness"
                  value={element.brightness ?? 100}
                  min={20}
                  max={200}
                  step={2}
                  disabled={locked}
                  formatValue={(v) => `${v}%`}
                  onStart={pushHistory}
                  onValueChange={(v) =>
                    updateElement(element.id, { brightness: v }, { commit: false })
                  }
                />
                <Slider
                  label="Contrast"
                  value={element.contrast ?? 100}
                  min={20}
                  max={200}
                  step={2}
                  disabled={locked}
                  formatValue={(v) => `${v}%`}
                  onStart={pushHistory}
                  onValueChange={(v) =>
                    updateElement(element.id, { contrast: v }, { commit: false })
                  }
                />
                <Slider
                  label="Saturation"
                  value={element.saturation ?? 100}
                  min={0}
                  max={200}
                  step={2}
                  disabled={locked}
                  formatValue={(v) => `${v}%`}
                  onStart={pushHistory}
                  onValueChange={(v) =>
                    updateElement(element.id, { saturation: v }, { commit: false })
                  }
                />
                <Slider
                  label="Grayscale"
                  value={element.grayscale ?? 0}
                  min={0}
                  max={100}
                  step={2}
                  disabled={locked}
                  formatValue={(v) => `${v}%`}
                  onStart={pushHistory}
                  onValueChange={(v) =>
                    updateElement(element.id, { grayscale: v }, { commit: false })
                  }
                />
                <Slider
                  label="Blur"
                  value={element.blur ?? 0}
                  min={0}
                  max={16}
                  step={0.5}
                  disabled={locked}
                  formatValue={(v) => `${v} px`}
                  onStart={pushHistory}
                  onValueChange={(v) =>
                    updateElement(element.id, { blur: v }, { commit: false })
                  }
                />

                <PropertyGrid>
                  <NumberField
                    label="Border"
                    value={element.borderWidth ?? 0}
                    unit="mm"
                    min={0}
                    max={12}
                    step={0.2}
                    disabled={locked}
                    onCommit={(value) => update({ borderWidth: value })}
                  />
                  <ColorField
                    label="Border colour"
                    value={element.borderColor ?? "#122056"}
                    allowTransparent
                    disabled={locked}
                    onChange={(value) => update({ borderColor: value })}
                  />
                </PropertyGrid>

                <Toggle
                  label="Drop shadow"
                  checked={Boolean(element.shadow)}
                  disabled={locked}
                  onCheckedChange={(checked) => update({ shadow: checked })}
                />

                <button
                  type="button"
                  onClick={() =>
                    update({
                      cropScale: 1,
                      cropX: 0,
                      cropY: 0,
                      flipX: false,
                      flipY: false,
                      brightness: 100,
                      contrast: 100,
                      saturation: 100,
                      grayscale: 0,
                      blur: 0,
                      borderWidth: 0,
                      shadow: false,
                    })
                  }
                  className="self-start text-[10.5px] font-medium text-accent underline-offset-2 hover:underline"
                >
                  Reset adjustments
                </button>
              </div>
          </PropertySection>
        ) : null}

        {element.type === "sticker" ? (
          <PropertySection title="Sticker">
            <SelectField
              label="Motif"
              value={element.stickerId}
              disabled={locked}
              options={STICKERS.map((sticker) => ({
                value: sticker.id,
                label: sticker.name,
              }))}
              onChange={(value) => update({ stickerId: value })}
            />
            <ColorField
              label="Ink"
              value={element.color}
              disabled={locked}
              onChange={(value) => update({ color: value })}
            />
          </PropertySection>
        ) : null}

        {element.type === "qr" ? (
          <PropertySection title="QR code">
            <TextField
              label="Destination"
              value={element.value}
              multiline
              rows={2}
              disabled={locked}
              onCommit={(value) => update({ value })}
            />
            <ColorField
              label="Foreground"
              value={element.foreground}
              disabled={locked}
              onChange={(value) => update({ foreground: value })}
            />
            <ColorField
              label="Background"
              value={element.background}
              disabled={locked}
              onChange={(value) => update({ background: value })}
            />
            <SelectField
              label="Error correction"
              value={element.errorCorrection}
              disabled={locked}
              options={[
                { value: "L", label: "Low" },
                { value: "M", label: "Medium" },
                { value: "Q", label: "Quartile" },
                { value: "H", label: "High" },
              ]}
              onChange={(value) => update({ errorCorrection: value })}
            />
          </PropertySection>
        ) : null}

        <PropertySection title="Arrange">
          <div className="grid grid-cols-4 gap-1">
            <IconButton
              icon={ChevronsDown}
              label="Send to back"
              tooltip="Send to back"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => moveElementLayer(element.id, "back")}
              disabled={locked}
            />
            <IconButton
              icon={ChevronDown}
              label="Move backward"
              tooltip="Move backward"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => moveElementLayer(element.id, "backward")}
              disabled={locked}
            />
            <IconButton
              icon={ChevronUp}
              label="Move forward"
              tooltip="Move forward"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => moveElementLayer(element.id, "forward")}
              disabled={locked}
            />
            <IconButton
              icon={ChevronsUp}
              label="Bring to front"
              tooltip="Bring to front"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => moveElementLayer(element.id, "front")}
              disabled={locked}
            />
          </div>
          <Toggle
            label="Lock element"
            description="Prevents canvas edits until unlocked."
            checked={locked}
            onCheckedChange={(checked) => update({ locked: checked })}
          />
        </PropertySection>

        {page.layoutMeta ? (
          <PropertySection title="Layout properties">
            <Slider
              label="Frame gap"
              value={page.layoutMeta.gapMm}
              min={0}
              max={12}
              step={0.5}
              formatValue={(v) => `${v} mm`}
              onStart={pushHistory}
              onValueChange={(v) =>
                updatePageLayoutSpacing(page.id, { gapMm: v }, { commit: false })
              }
            />
            <Slider
              label="Outer margin"
              value={page.layoutMeta.marginMm}
              min={0}
              max={25}
              step={0.5}
              formatValue={(v) => `${v} mm`}
              onStart={pushHistory}
              onValueChange={(v) =>
                updatePageLayoutSpacing(
                  page.id,
                  { marginMm: v },
                  { commit: false },
                )
              }
            />
          </PropertySection>
        ) : null}

        <div className="border-t border-line px-3.5 py-3">
          <p className="text-[10px] leading-3.5 text-ink-subtle">
            Page trim {project.pageSize.w} × {project.pageSize.h} mm ·{" "}
            {page.elements.length} element
            {page.elements.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
    </motion.aside>
  );
}

function SpinePropertiesContent() {
  const project = useEditorStore((state) => state.project);
  const setSpineText = useEditorStore((state) => state.setSpineText);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const isCompact = useMediaQuery("(max-width: 1023px)");
  const [mobileExpanded, setMobileExpanded] = useState(false);

  const spineText = project.spineText ?? project.name;
  const physicalSpine = getSpineWidth(
    project.pageSize.binding,
    getEditablePageCount(project.pages),
  );

  if (isCompact && !mobileExpanded) {
    return (
      <motion.div
        key="pill-cover-spine"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.15 }}
        className="absolute bottom-3 right-3 z-30 flex max-w-[calc(100%-24px)] items-center gap-1 rounded-full border border-line bg-surface/95 py-1 pl-3 pr-1.5 shadow-panel backdrop-blur"
      >
        <button
          type="button"
          onClick={() => setMobileExpanded(true)}
          className="flex min-w-0 items-center gap-1.5 text-left text-[11px] font-medium text-ink hover:text-accent"
        >
          <SlidersHorizontal className="size-3.5 shrink-0 text-accent" />
          <span className="truncate">Spine · {spineText.trim() || "Blank"}</span>
          <ChevronUp className="size-3.5 shrink-0 text-ink-subtle" />
        </button>
        <IconButton
          icon={X}
          label="Close properties"
          size="sm"
          variant="ghost"
          onClick={clearSelection}
        />
      </motion.div>
    );
  }

  return (
    <motion.aside
      key="cover-spine"
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      aria-label="Cover spine properties"
      className="absolute z-30 flex max-h-[min(44dvh,420px)] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-panel max-lg:inset-x-3 max-lg:bottom-3 lg:bottom-4 lg:right-4 lg:top-4 lg:max-h-none lg:w-[300px]"
    >
      <header className="flex shrink-0 items-start gap-2 border-b border-line px-3.5 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            Cover · Spine
          </span>
          <h2 className="truncate text-[12.5px] font-semibold leading-4 tracking-[-0.01em] text-ink">
            {spineText.trim() || "Blank spine"}
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          {isCompact ? (
            <IconButton
              icon={ChevronDown}
              label="Collapse properties"
              size="sm"
              variant="ghost"
              onClick={() => setMobileExpanded(false)}
            />
          ) : null}
          <IconButton
            icon={X}
            label="Close properties"
            tooltip="Close properties"
            size="sm"
            variant="ghost"
            onClick={clearSelection}
          />
        </div>
      </header>

      <div className="min-h-0 flex-1 overflow-y-auto">
        <PropertySection title="Spine text">
          <TextField
            label="Label"
            value={spineText}
            placeholder="Enter spine text"
            onCommit={(value) => setSpineText(value)}
          />
          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={() => setSpineText(project.name)}
              className="text-[10.5px] font-medium text-accent underline-offset-2 hover:underline"
            >
              Match project title
            </button>
            <button
              type="button"
              onClick={() => setSpineText("")}
              className="text-[10.5px] font-medium text-ink-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Clear
            </button>
          </div>
        </PropertySection>

        <div className="border-t border-line px-3.5 py-3">
          <p className="text-[10px] leading-3.5 text-ink-subtle">
            Calculated spine{" "}
            {physicalSpine > 0 ? `${formatNumber(physicalSpine, 1)} mm` : "fold crease"}{" "}
            · Double-click the spine on the cover to edit inline.
          </p>
        </div>
      </div>
    </motion.aside>
  );
}

export function PropertiesPanel() {
  const selected = useSelectedElement();
  const spineSelected = useEditorStore((state) =>
    Boolean(state.selection.spineSelected),
  );
  const spreadIndex = useEditorStore((state) => state.ui.spreadIndex);

  return (
    <AnimatePresence>
      {selected ? (
        <PropertiesContent
          key={selected.element.id}
          element={selected.element}
          page={selected.page}
        />
      ) : spineSelected && spreadIndex === 0 ? (
        <SpinePropertiesContent key="cover-spine" />
      ) : null}
    </AnimatePresence>
  );
}
