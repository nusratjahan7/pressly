"use client";

import { AnimatePresence, motion } from "framer-motion";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ChevronDown,
  ChevronUp,
  ChevronsDown,
  ChevronsUp,
  Lock,
  Trash2,
  Unlock,
  X,
} from "lucide-react";
import type { Element, Page } from "@/types";
import { useEditorStore } from "@/store";
import { useSelectedElement } from "@/store/selectors";
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
  const pushHistory = useEditorStore((state) => state.pushHistory);
  const removeElement = useEditorStore((state) => state.removeElement);
  const moveElementLayer = useEditorStore((state) => state.moveElementLayer);
  const clearSelection = useEditorStore((state) => state.clearSelection);

  const locked = element.locked;
  const label = getElementLabel(element, element.zIndex);
  const update = (patch: Partial<Element>) =>
    updateElement(element.id, patch);

  return (
    <motion.aside
      key={element.id}
      initial={{ opacity: 0, x: 18 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 18 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      aria-label={`${ELEMENT_TYPE_LABEL[element.type]} properties`}
      className="absolute z-30 flex max-h-[min(56dvh,460px)] flex-col overflow-hidden rounded-card border border-line bg-surface shadow-panel max-lg:inset-x-3 max-lg:bottom-3 lg:bottom-4 lg:right-4 lg:top-4 lg:max-h-none lg:w-[300px]"
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
              onCommit={(value) => update({ text: value })}
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
              label="Weight"
              value={element.fontWeight}
              disabled={locked}
              options={[
                { value: 400, label: "Regular" },
                { value: 500, label: "Medium" },
                { value: 600, label: "Semibold" },
                { value: 700, label: "Bold" },
              ]}
              onChange={(value) =>
                update({ fontWeight: value as 400 | 500 | 600 | 700 })
              }
            />
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

export function PropertiesPanel() {
  const selected = useSelectedElement();

  return (
    <AnimatePresence>
      {selected ? (
        <PropertiesContent
          key={selected.element.id}
          element={selected.element}
          page={selected.page}
        />
      ) : null}
    </AnimatePresence>
  );
}
