"use client";

import { Minus, Plus } from "lucide-react";
import { useEditorStore } from "@/store";
import { ZOOM_LIMITS } from "@/store/slices/uiSlice";
import { Dropdown, type DropdownItem } from "@/components/ui/dropdown";
import { IconButton } from "@/components/ui/icon-button";
import { Button } from "@/components/ui/button";

const ZOOM_PRESETS = [25, 50, 75, 100, 125, 150, 200, 300];

export function ZoomControl() {
  const zoom = useEditorStore((state) => state.ui.zoom);
  const setZoom = useEditorStore((state) => state.setZoom);
  const zoomIn = useEditorStore((state) => state.zoomIn);
  const zoomOut = useEditorStore((state) => state.zoomOut);
  const resetZoom = useEditorStore((state) => state.resetZoom);

  const percent = Math.round(zoom * 100);
  const isFit = Math.abs(zoom - 1) < 0.001;

  const items: DropdownItem[] = [
    {
      id: "fit",
      label: "Fit spread",
      checked: isFit,
      shortcut: "100%",
      onSelect: resetZoom,
    },
    ...ZOOM_PRESETS.map((value) => ({
      id: `zoom-${value}`,
      label: `${value}%`,
      checked: percent === value,
      separatorBefore: value === 25,
      onSelect: () => setZoom(value / 100),
    })),
  ];

  return (
    <div
      role="group"
      aria-label="Zoom"
      className="inline-flex h-8 items-center gap-0.5 rounded-field border border-line bg-surface px-0.5"
    >
      <IconButton
        icon={Minus}
        label="Zoom out"
        size="sm"
        variant="ghost"
        onClick={zoomOut}
        disabled={zoom <= ZOOM_LIMITS.min}
        className="size-7 rounded-[6px]"
      />
      <Dropdown
        items={items}
        ariaLabel="Zoom presets"
        align="end"
        minWidth={150}
        trigger={
          <Button
            variant="ghost"
            size="sm"
            className="h-7 min-w-[48px] rounded-[6px] px-1.5 text-[11px] tabular-nums text-ink-muted hover:text-ink"
            aria-label={`Zoom level ${percent} percent`}
          >
            {percent}%
          </Button>
        }
      />
      <IconButton
        icon={Plus}
        label="Zoom in"
        size="sm"
        variant="ghost"
        onClick={zoomIn}
        disabled={zoom >= ZOOM_LIMITS.max}
        className="size-7 rounded-[6px]"
      />
    </div>
  );
}
