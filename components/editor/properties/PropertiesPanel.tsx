"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlignCenter,
  AlignCenterHorizontal,
  AlignCenterVertical,
  AlignEndHorizontal,
  AlignEndVertical,
  AlignHorizontalDistributeCenter,
  AlignLeft,
  AlignRight,
  AlignStartHorizontal,
  AlignStartVertical,
  AlignVerticalDistributeCenter,
  CaseUpper,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Eye,
  EyeOff,
  FlipHorizontal2,
  FlipVertical2,
  Group,
  Italic,
  Layers,
  Lock,
  PanelRightClose,
  RotateCcw,
  RotateCw,
  SlidersHorizontal,
  Trash2,
  Underline,
  Ungroup,
  Unlock,
  X,
} from "lucide-react";
import type { Element, FontWeight, Page } from "@/types";
import { useEditorStore } from "@/store";
import {
  useCurrentSpread,
  useSelectedElement,
  useSelectedElements,
} from "@/store/selectors";
import { getSpineWidth } from "@/lib/binding";
import { getEditablePageCount } from "@/lib/spreads";
import {
  ensureGoogleFontLoaded,
  FONT_SELECT_OPTIONS,
  getCuratedFont,
  getFontOptionValue,
  preloadAllCuratedFonts,
  resolveFontOption,
} from "@/lib/fonts";
import { useMediaQuery } from "@/lib/useMediaQuery";
import { formatNumber } from "@/lib/units";
import {
  ELEMENT_TYPE_LABEL,
  getElementLabel,
} from "@/lib/elements";
import { SHAPE_PRESETS } from "@/lib/shapes";
import { SVG_STICKERS } from "@/lib/stickers";
import { LayersList } from "@/components/editor/properties/LayersList";
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
import { cn } from "@/lib/cn";

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

function SingleElementInspector({
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
  const alignElements = useEditorStore((state) => state.alignElements);
  const flipElements = useEditorStore((state) => state.flipElements);
  const ungroupElements = useEditorStore((state) => state.ungroupElements);

  const locked = element.locked;
  const hidden = Boolean(element.hidden);
  const label = getElementLabel(element, element.zIndex);
  const update = (patch: Partial<Element>) =>
    updateElement(element.id, patch);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
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
          <IconButton
            icon={hidden ? EyeOff : Eye}
            label={hidden ? "Show layer" : "Hide layer"}
            tooltip={hidden ? "Show layer" : "Hide layer"}
            size="sm"
            variant="ghost"
            onClick={() => update({ hidden: !hidden })}
          />
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
        </div>
      </div>

      {hidden ? (
        <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-3.5 py-2 text-[10.5px] leading-4 text-ink-muted">
          <EyeOff className="size-3 shrink-0" aria-hidden="true" />
          <span className="flex-1">This layer is hidden on canvas & PDF.</span>
          <button
            type="button"
            onClick={() => update({ hidden: false })}
            className="font-medium text-accent underline-offset-2 hover:underline"
          >
            Show
          </button>
        </div>
      ) : null}

      {locked ? (
        <div className="flex items-center gap-2 border-b border-line bg-surface-muted px-3.5 py-2 text-[10.5px] leading-4 text-ink-muted">
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

      <PropertySection title="Layer name">
        <TextField
          label="Name"
          value={element.name ?? ""}
          placeholder={label}
          disabled={locked}
          onCommit={(value) =>
            update({ name: value.trim() ? value.trim() : undefined })
          }
        />
      </PropertySection>

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
              value={getFontOptionValue(element.fontFamily, element.fontWeight)}
              disabled={locked}
              options={FONT_SELECT_OPTIONS.map((option) => ({
                value: option.value,
                label: option.label,
              }))}
              onChange={(value) => {
                preloadAllCuratedFonts();
                const resolved = resolveFontOption(value, element.fontWeight);
                ensureGoogleFontLoaded(
                  resolved.fontFamily,
                  resolved.fontWeight,
                  element.fontStyle === "italic",
                );
                update(resolved);
              }}
            />
            <SelectField
              label="Weight"
              value={
                getCuratedFont(element.fontFamily).weights.includes(
                  element.fontWeight,
                )
                  ? element.fontWeight
                  : (getCuratedFont(element.fontFamily).weights[0] ?? 400)
              }
              disabled={locked}
              options={getCuratedFont(element.fontFamily).weights.map((w) => ({
                value: w,
                label:
                  w === 300
                    ? "Light (300)"
                    : w === 400
                      ? "Regular (400)"
                      : w === 500
                        ? "Medium (500)"
                        : w === 600
                          ? "Semibold (600)"
                          : w === 700
                            ? "Bold (700)"
                            : "Black (900)",
              }))}
              onChange={(value) => {
                const w = Number(value) as FontWeight;
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
              options={SHAPE_PRESETS.map((preset) => ({
                value: preset.kind,
                label: preset.label,
              }))}
              onChange={(value) =>
                update({
                  shape: value,
                  sides:
                    value === "polygon"
                      ? element.sides ?? 6
                      : value === "star"
                        ? element.sides ?? 5
                        : undefined,
                  innerRadiusRatio:
                    value === "star" ? element.innerRadiusRatio ?? 0.45 : undefined,
                })
              }
            />
            {element.shape === "polygon" || element.shape === "star" ? (
              <>
                <Slider
                  label={element.shape === "star" ? "Points" : "Sides"}
                  value={element.sides ?? (element.shape === "star" ? 5 : 6)}
                  min={3}
                  max={12}
                  step={1}
                  disabled={locked}
                  onStart={pushHistory}
                  onValueChange={(v) =>
                    updateElement(element.id, { sides: v }, { commit: false })
                  }
                />
                {element.shape === "star" ? (
                  <Slider
                    label="Inner radius"
                    value={Math.round((element.innerRadiusRatio ?? 0.45) * 100)}
                    min={20}
                    max={80}
                    step={2}
                    disabled={locked}
                    formatValue={(v) => `${v}%`}
                    onStart={pushHistory}
                    onValueChange={(v) =>
                      updateElement(
                        element.id,
                        { innerRadiusRatio: v / 100 },
                        { commit: false },
                      )
                    }
                  />
                ) : null}
              </>
            ) : null}
            {element.shape !== "line" && element.shape !== "arrow" ? (
              <>
                <ColorField
                  label="Fill"
                  value={element.fill}
                  allowTransparent
                  disabled={locked}
                  onChange={(value) => update({ fill: value })}
                />
                <Toggle
                  label="Gradient fill"
                  checked={Boolean(element.fillGradient?.enabled)}
                  disabled={locked}
                  onCheckedChange={(checked) =>
                    update({
                      fillGradient: {
                        enabled: checked,
                        from: element.fillGradient?.from ?? "#5B65DC",
                        to: element.fillGradient?.to ?? "#F472B6",
                        angle: element.fillGradient?.angle ?? 135,
                      },
                    })
                  }
                />
                {element.fillGradient?.enabled ? (
                  <div className="flex flex-col gap-2 rounded-field border border-line bg-surface-muted/40 p-2">
                    <PropertyGrid>
                      <ColorField
                        label="Start"
                        value={element.fillGradient.from}
                        disabled={locked}
                        onChange={(value) =>
                          update({
                            fillGradient: {
                              ...element.fillGradient!,
                              from: value,
                            },
                          })
                        }
                      />
                      <ColorField
                        label="End"
                        value={element.fillGradient.to}
                        disabled={locked}
                        onChange={(value) =>
                          update({
                            fillGradient: {
                              ...element.fillGradient!,
                              to: value,
                            },
                          })
                        }
                      />
                    </PropertyGrid>
                    <Slider
                      label="Angle"
                      value={element.fillGradient.angle}
                      min={0}
                      max={360}
                      step={5}
                      disabled={locked}
                      formatValue={(v) => `${v}°`}
                      onStart={pushHistory}
                      onValueChange={(v) =>
                        updateElement(
                          element.id,
                          {
                            fillGradient: {
                              ...element.fillGradient!,
                              angle: v,
                            },
                          },
                          { commit: false },
                        )
                      }
                    />
                  </div>
                ) : null}
              </>
            ) : null}
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
                disabled={
                  locked ||
                  (element.shape !== "rectangle" &&
                    element.shape !== "polygon" &&
                    element.shape !== "star")
                }
                onCommit={(value) => update({ radius: value })}
              />
            </PropertyGrid>
            <Toggle
              label="Drop shadow"
              checked={Boolean(element.shadow)}
              disabled={locked}
              onCheckedChange={(checked) => update({ shadow: checked })}
            />
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
            {!element.src ? (
              <>
                <SelectField
                  label="Vector motif"
                  value={element.stickerId}
                  disabled={locked}
                  options={SVG_STICKERS.map((sticker) => ({
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
              </>
            ) : null}
            <Toggle
              label="Drop shadow"
              checked={Boolean(element.shadow)}
              disabled={locked}
              onCheckedChange={(checked) => update({ shadow: checked })}
            />
          </PropertySection>
        ) : null}

        {element.type === "qr" ? (
          <PropertySection title="QR code">
            <TextField
              label="URL / Text (live)"
              value={element.value}
              multiline
              rows={2}
              disabled={locked}
              onLiveChange={(value) =>
                updateElement(element.id, { value }, { commit: false })
              }
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

        <PropertySection title="Arrange & align">
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              aria-pressed={Boolean(element.flipX)}
              disabled={locked}
              onClick={() => flipElements([element.id], "horizontal")}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent disabled:opacity-45"
            >
              <FlipHorizontal2 className="size-3.5" />
              Flip H
            </button>
            <button
              type="button"
              aria-pressed={Boolean(element.flipY)}
              disabled={locked}
              onClick={() => flipElements([element.id], "vertical")}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted aria-pressed:border-accent aria-pressed:bg-accent-soft aria-pressed:text-accent disabled:opacity-45"
            >
              <FlipVertical2 className="size-3.5" />
              Flip V
            </button>
          </div>
          <div className="grid grid-cols-6 gap-1">
            <IconButton
              icon={AlignStartVertical}
              label="Align left"
              tooltip="Align left"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => alignElements(page.id, [element.id], "left")}
              disabled={locked}
            />
            <IconButton
              icon={AlignCenterVertical}
              label="Align center"
              tooltip="Align center"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => alignElements(page.id, [element.id], "center")}
              disabled={locked}
            />
            <IconButton
              icon={AlignEndVertical}
              label="Align right"
              tooltip="Align right"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => alignElements(page.id, [element.id], "right")}
              disabled={locked}
            />
            <IconButton
              icon={AlignStartHorizontal}
              label="Align top"
              tooltip="Align top"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => alignElements(page.id, [element.id], "top")}
              disabled={locked}
            />
            <IconButton
              icon={AlignCenterHorizontal}
              label="Align middle"
              tooltip="Align middle"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => alignElements(page.id, [element.id], "middle")}
              disabled={locked}
            />
            <IconButton
              icon={AlignEndHorizontal}
              label="Align bottom"
              tooltip="Align bottom"
              size="sm"
              variant="secondary"
              className="w-full"
              onClick={() => alignElements(page.id, [element.id], "bottom")}
              disabled={locked}
            />
          </div>
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
          {element.groupId ? (
            <button
              type="button"
              onClick={() => ungroupElements([element.id])}
              className="inline-flex h-7 items-center justify-center gap-1.5 rounded-field border border-line text-[10.5px] font-medium text-ink hover:border-accent hover:text-accent"
            >
              <Ungroup className="size-3.5" />
              Ungroup
            </button>
          ) : null}
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
  );
}

function SpineInspector() {
  const project = useEditorStore((state) => state.project);
  const setSpineText = useEditorStore((state) => state.setSpineText);

  const spineText = project.spineText ?? project.name;
  const physicalSpine = getSpineWidth(
    project.pageSize.binding,
    getEditablePageCount(project.pages),
  );

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex flex-col gap-0.5 border-b border-line px-3.5 py-2.5">
        <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
          Cover · Spine
        </span>
        <h2 className="truncate text-[12.5px] font-semibold leading-4 tracking-[-0.01em] text-ink">
          {spineText.trim() || "Blank spine"}
        </h2>
      </div>

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
  );
}

function MultiSelectionInspector({
  elements,
  page,
}: {
  elements: Element[];
  page: Page;
}) {
  const alignElements = useEditorStore((state) => state.alignElements);
  const distributeElements = useEditorStore((state) => state.distributeElements);
  const flipElements = useEditorStore((state) => state.flipElements);
  const groupElements = useEditorStore((state) => state.groupElements);
  const ungroupElements = useEditorStore((state) => state.ungroupElements);
  const setElementsLocked = useEditorStore((state) => state.setElementsLocked);
  const removeElements = useEditorStore((state) => state.removeElements);

  const ids = elements.map((el) => el.id);
  const unlockedCount = elements.filter((el) => !el.locked).length;
  const allLocked = unlockedCount === 0;
  const hasGroup = elements.some((el) => Boolean(el.groupId));
  const sharedGroupId =
    elements[0]?.groupId &&
    elements.every((el) => el.groupId === elements[0]?.groupId);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto">
      <div className="flex items-center gap-2 border-b border-line px-3.5 py-2.5">
        <div className="flex min-w-0 flex-1 flex-col gap-0.5">
          <span className="text-[9.5px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
            {sharedGroupId ? "Group" : "Multi-selection"}
          </span>
          <h2 className="truncate text-[12.5px] font-semibold leading-4 text-ink">
            {elements.length} elements selected
          </h2>
        </div>
        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton
            icon={allLocked ? Unlock : Lock}
            label={allLocked ? "Unlock selected" : "Lock selected"}
            size="sm"
            variant="ghost"
            onClick={() => setElementsLocked(ids, !allLocked)}
          />
          <IconButton
            icon={Trash2}
            label="Remove selected"
            size="sm"
            variant="danger-ghost"
            onClick={() => removeElements(ids)}
            disabled={allLocked}
          />
        </div>
      </div>

      <PropertySection title="Group & Transform">
        <div className="grid grid-cols-2 gap-1.5">
          {!sharedGroupId ? (
            <button
              type="button"
              disabled={unlockedCount < 2}
              onClick={() => groupElements(ids)}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink hover:border-accent hover:text-accent disabled:opacity-45"
            >
              <Group className="size-3.5" />
              Group
            </button>
          ) : null}
          {hasGroup ? (
            <button
              type="button"
              onClick={() => ungroupElements(ids)}
              className="inline-flex h-7 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink hover:border-accent hover:text-accent"
            >
              <Ungroup className="size-3.5" />
              Ungroup
            </button>
          ) : null}
          <button
            type="button"
            disabled={allLocked}
            onClick={() => flipElements(ids, "horizontal")}
            className="inline-flex h-7 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted hover:text-ink disabled:opacity-45"
          >
            <FlipHorizontal2 className="size-3.5" />
            Flip H
          </button>
          <button
            type="button"
            disabled={allLocked}
            onClick={() => flipElements(ids, "vertical")}
            className="inline-flex h-7 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted hover:text-ink disabled:opacity-45"
          >
            <FlipVertical2 className="size-3.5" />
            Flip V
          </button>
        </div>
      </PropertySection>

      <PropertySection title="Align selection">
        <div className="grid grid-cols-6 gap-1">
          <IconButton
            icon={AlignStartVertical}
            label="Align left"
            tooltip="Align left"
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={allLocked}
            onClick={() => alignElements(page.id, ids, "left")}
          />
          <IconButton
            icon={AlignCenterVertical}
            label="Align center"
            tooltip="Align center"
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={allLocked}
            onClick={() => alignElements(page.id, ids, "center")}
          />
          <IconButton
            icon={AlignEndVertical}
            label="Align right"
            tooltip="Align right"
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={allLocked}
            onClick={() => alignElements(page.id, ids, "right")}
          />
          <IconButton
            icon={AlignStartHorizontal}
            label="Align top"
            tooltip="Align top"
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={allLocked}
            onClick={() => alignElements(page.id, ids, "top")}
          />
          <IconButton
            icon={AlignCenterHorizontal}
            label="Align middle"
            tooltip="Align middle"
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={allLocked}
            onClick={() => alignElements(page.id, ids, "middle")}
          />
          <IconButton
            icon={AlignEndHorizontal}
            label="Align bottom"
            tooltip="Align bottom"
            size="sm"
            variant="secondary"
            className="w-full"
            disabled={allLocked}
            onClick={() => alignElements(page.id, ids, "bottom")}
          />
        </div>

        <div className="grid grid-cols-2 gap-1.5">
          <button
            type="button"
            disabled={unlockedCount < 3}
            onClick={() => distributeElements(page.id, ids, "horizontal")}
            className="inline-flex h-7 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted hover:text-ink disabled:opacity-45"
          >
            <AlignHorizontalDistributeCenter className="size-3.5" />
            Distribute H
          </button>
          <button
            type="button"
            disabled={unlockedCount < 3}
            onClick={() => distributeElements(page.id, ids, "vertical")}
            className="inline-flex h-7 items-center justify-center gap-1 rounded-field border border-line text-[10.5px] font-medium text-ink-muted hover:text-ink disabled:opacity-45"
          >
            <AlignVerticalDistributeCenter className="size-3.5" />
            Distribute V
          </button>
        </div>
        {unlockedCount < 3 ? (
          <p className="text-[10px] text-ink-subtle">
            Hold Shift + click on canvas to select 3+ items to distribute.
          </p>
        ) : null}
      </PropertySection>
    </div>
  );
}

export function PropertiesPanel() {
  const project = useEditorStore((state) => state.project);
  const selected = useSelectedElement();
  const selectedMany = useSelectedElements();
  const spineSelected = useEditorStore((state) =>
    Boolean(state.selection.spineSelected),
  );
  const spreadIndex = useEditorStore((state) => state.ui.spreadIndex);
  const clearSelection = useEditorStore((state) => state.clearSelection);
  const { spread } = useCurrentSpread();

  const isCompact = useMediaQuery("(max-width: 1023px)");
  const [expanded, setExpanded] = useState<boolean | null>(null);
  const [tab, setTab] = useState<"inspect" | "layers">("layers");

  const hasSelection = Boolean(
    (selectedMany && selectedMany.elements.length > 1) ||
      selected ||
      (spineSelected && spreadIndex === 0),
  );

  const selectionSignature = selectedMany && selectedMany.elements.length > 1
    ? `multi:${selectedMany.elements.map((e) => e.id).join(",")}`
    : selected
      ? `single:${selected.element.id}`
      : spineSelected && spreadIndex === 0
        ? "spine"
        : "";

  useEffect(() => {
    if (selectionSignature) {
      setTab("inspect");
    } else {
      setTab("layers");
    }
  }, [selectionSignature]);

  const spreadLayerCount = (spread?.pageIndices ?? []).reduce((sum, idx) => {
    const p = project.pages[idx];
    return sum + (p && !p.isEndPaper ? p.elements.length : 0);
  }, 0);

  const isCollapsed = expanded === null ? isCompact : !expanded;

  const pillLabel =
    selectedMany && selectedMany.elements.length > 1
      ? `${selectedMany.elements.length} selected`
      : selected
        ? getElementLabel(selected.element, selected.element.zIndex)
        : spineSelected && spreadIndex === 0
          ? "Cover spine"
          : `Layers (${spreadLayerCount})`;

  if (isCollapsed) {
    return (
      <div
        data-tour="inspector"
        className="pointer-events-none absolute bottom-3 right-3 z-30 flex items-center justify-end"
      >
        <div className="pointer-events-auto flex max-w-[calc(100vw-24px)] items-center gap-1 rounded-full border border-line bg-surface/95 py-1 pl-3 pr-1.5 shadow-panel backdrop-blur">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="flex min-w-0 items-center gap-1.5 text-left text-[11px] font-medium text-ink hover:text-accent"
          >
            {hasSelection ? (
              <SlidersHorizontal className="size-3.5 shrink-0 text-accent" />
            ) : (
              <Layers className="size-3.5 shrink-0 text-accent" />
            )}
            <span className="truncate">{pillLabel}</span>
            <span className="shrink-0 text-[10px] text-ink-subtle">
              · {hasSelection ? "Inspect" : "Panel"}
            </span>
            <ChevronUp className="size-3.5 shrink-0 text-ink-subtle" />
          </button>
          {hasSelection ? (
            <IconButton
              icon={X}
              label="Clear selection"
              size="sm"
              variant="ghost"
              onClick={clearSelection}
            />
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <AnimatePresence>
      <motion.aside
        key="right-inspector-panel"
        data-tour="inspector"
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: 18 }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        aria-label="Inspector and layers panel"
        className="z-30 flex flex-col overflow-hidden bg-surface max-lg:absolute max-lg:inset-x-3 max-lg:bottom-3 max-lg:max-h-[min(46dvh,440px)] max-lg:rounded-card max-lg:border max-lg:border-line max-lg:shadow-panel lg:h-full lg:w-[264px] lg:shrink-0 lg:border-l lg:border-line xl:w-[296px]"
      >
        <div className="flex shrink-0 items-center gap-1.5 border-b border-line px-2.5 py-2">
          <div
            role="tablist"
            aria-label="Panel view"
            className="grid flex-1 grid-cols-2 rounded-field border border-line bg-surface-muted p-0.5 text-[11px] font-medium"
          >
            <button
              type="button"
              role="tab"
              aria-selected={tab === "inspect"}
              onClick={() => setTab("inspect")}
              className={cn(
                "flex h-6 items-center justify-center gap-1 rounded-[5px] transition-colors",
                tab === "inspect"
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <SlidersHorizontal className="size-3" />
              Inspect
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={tab === "layers"}
              onClick={() => setTab("layers")}
              className={cn(
                "flex h-6 items-center justify-center gap-1 rounded-[5px] transition-colors",
                tab === "layers"
                  ? "bg-surface text-ink shadow-sm"
                  : "text-ink-muted hover:text-ink",
              )}
            >
              <Layers className="size-3" />
              Layers
              <span className="rounded-full bg-surface-muted px-1.5 text-[9.5px] tabular-nums text-ink-subtle">
                {spreadLayerCount}
              </span>
            </button>
          </div>
          <IconButton
            icon={isCompact ? ChevronDown : PanelRightClose}
            label="Collapse panel"
            tooltip="Collapse panel"
            size="sm"
            variant="ghost"
            onClick={() => setExpanded(false)}
          />
        </div>

        {tab === "layers" ? (
          <LayersList />
        ) : selectedMany && selectedMany.elements.length > 1 ? (
          <MultiSelectionInspector
            elements={selectedMany.elements}
            page={selectedMany.page}
          />
        ) : selected ? (
          <SingleElementInspector
            element={selected.element}
            page={selected.page}
          />
        ) : spineSelected && spreadIndex === 0 ? (
          <SpineInspector />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center px-5 py-8 text-center">
            <SlidersHorizontal className="mb-2 size-5 text-ink-subtle" />
            <p className="text-[12px] font-medium text-ink">Nothing selected</p>
            <p className="mt-1 text-[10.5px] leading-4 text-ink-subtle">
              Click any photo, text box, shape, sticker, or QR code on the
              canvas — or manage your stacking order in Layers.
            </p>
            <button
              type="button"
              onClick={() => setTab("layers")}
              className="mt-3 rounded-field border border-line bg-surface-muted px-3 py-1.5 text-[11px] font-medium text-ink hover:border-accent hover:text-accent"
            >
              View spread layers ({spreadLayerCount})
            </button>
          </div>
        )}
      </motion.aside>
    </AnimatePresence>
  );
}
