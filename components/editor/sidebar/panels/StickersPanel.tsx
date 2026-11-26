"use client";

import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useEditorStore } from "@/store";
import { useActivePage } from "@/store/selectors";
import { getPageLabel } from "@/lib/spreads";
import { STICKERS } from "@/lib/stickers";
import { createStickerElement, DEFAULT_ACCENT, DEFAULT_TEXT_COLOR } from "@/lib/elements";
import { StickerArt } from "@/components/editor/canvas/StickerArt";
import { PageContext, PanelSection } from "@/components/editor/sidebar/PanelSection";
import { ColorPicker } from "@/components/ui/color-picker";
import { EmptyState } from "@/components/editor/EmptyState";

export function StickersPanel() {
  const project = useEditorStore((state) => state.project);
  const addElement = useEditorStore((state) => state.addElement);
  const { page, pageIndex } = useActivePage();
  const [color, setColor] = useState(DEFAULT_TEXT_COLOR);

  const pageLabel = page ? getPageLabel(pageIndex, project.pages) : "a page";

  const insert = (stickerId: string) => {
    if (!page) return;
    const size = Math.max(18, Math.min(32, project.pageSize.w * 0.13));
    addElement(
      page.id,
      createStickerElement(
        {
          x: Math.round(((project.pageSize.w - size) / 2) * 10) / 10,
          y: Math.round(((project.pageSize.h - size) / 2 + size * 0.4) * 10) / 10,
          width: Math.round(size * 10) / 10,
          height: Math.round(size * 10) / 10,
          rotation: 0,
        },
        { stickerId, color },
      ),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <PageContext label={pageLabel} />

      {!page ? (
        <EmptyState
          title="No page selected"
          description="Select a page on the canvas to add a sticker."
          compact
        />
      ) : (
        <>
          <PanelSection
            title="Accents"
            description="Vector stickers stay crisp at any print size."
          >
            <div className="grid grid-cols-3 gap-2">
              {STICKERS.map((sticker) => (
                <button
                  key={sticker.id}
                  type="button"
                  onClick={() => insert(sticker.id)}
                  aria-label={`Add ${sticker.name} sticker to ${pageLabel}`}
                  className="group flex aspect-square flex-col items-center justify-center gap-1.5 rounded-field border border-line bg-surface transition-[border-color,box-shadow,background-color] duration-150 hover:border-line-strong hover:bg-surface-muted hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface"
                >
                  <span className="flex size-10 items-center justify-center rounded-[7px] border border-line/70 bg-[#FAFAFD] shadow-[inset_0_1px_2px_rgba(18,32,86,0.06)]">
                    <span
                      className="block size-6 transition-transform duration-200 ease-out-soft group-hover:-rotate-6 group-hover:scale-110"
                      style={{ color }}
                    >
                      <StickerArt stickerId={sticker.id} color={color} />
                    </span>
                  </span>
                  <span className="text-[9.5px] font-medium text-ink-subtle">
                    {sticker.name}
                  </span>
                </button>
              ))}
            </div>
          </PanelSection>

          <PanelSection title="Sticker colour">
            <ColorPicker
              value={color}
              onChange={setColor}
              label="Sticker colour"
            />
            <div className="flex items-center justify-between gap-2">
              <p className="flex items-center gap-1.5 text-[10.5px] text-ink-subtle">
                <Sparkles className="size-3" aria-hidden="true" />
                New placements use this ink.
              </p>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setColor(DEFAULT_TEXT_COLOR)}
                  aria-label="Use ink"
                  className="size-4 rounded-full border border-line-strong bg-[#122056]"
                />
                <button
                  type="button"
                  onClick={() => setColor(DEFAULT_ACCENT)}
                  aria-label="Use accent"
                  className="size-4 rounded-full border border-line-strong bg-[#5B65DC]"
                />
              </div>
            </div>
          </PanelSection>
        </>
      )}
    </div>
  );
}
