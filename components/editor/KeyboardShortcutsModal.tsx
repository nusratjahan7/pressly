"use client";

import { Compass } from "lucide-react";
import { useEditorStore } from "@/store";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface ShortcutItem {
  keys: string[];
  label: string;
}

interface ShortcutGroup {
  title: string;
  items: ShortcutItem[];
}

function getMod(): string {
  if (typeof navigator === "undefined") return "Ctrl";
  return /Mac|iPhone|iPad/.test(navigator.userAgent) ? "⌘" : "Ctrl";
}

export function KeyboardShortcutsModal() {
  const open = useEditorStore((state) => state.ui.shortcutsOpen);
  const setShortcutsOpen = useEditorStore((state) => state.setShortcutsOpen);
  const setTourOpen = useEditorStore((state) => state.setTourOpen);

  const mod = getMod();
  const groups: ShortcutGroup[] = [
    {
      title: "Editing & History",
      items: [
        { keys: [mod, "Z"], label: "Undo (up to 50 steps)" },
        { keys: [mod, "⇧", "Z"], label: "Redo" },
        { keys: ["Delete"], label: "Delete selected element(s)" },
        { keys: ["Esc"], label: "Clear selection / exit crop" },
      ],
    },
    {
      title: "Selection & Layers",
      items: [
        { keys: [mod, "A"], label: "Select all unlocked on page" },
        { keys: ["⇧", "Click"], label: "Add / remove from selection" },
        { keys: [mod, "G"], label: "Group selected elements" },
        { keys: [mod, "⇧", "G"], label: "Ungroup elements" },
      ],
    },
    {
      title: "Canvas & Navigation",
      items: [
        { keys: ["Space", "Drag"], label: "Pan across spread" },
        { keys: [mod, "+"], label: "Zoom in" },
        { keys: [mod, "-"], label: "Zoom out" },
        { keys: [mod, "0"], label: "Reset zoom to 100%" },
        { keys: ["PgDn"], label: "Next spread" },
        { keys: ["PgUp"], label: "Previous spread" },
      ],
    },
    {
      title: "Touch & Double-Click",
      items: [
        { keys: ["Dbl-click"], label: "Edit text, crop photo, or add text" },
        { keys: ["2-finger pinch"], label: "Pinch to zoom on trackpad / tablet" },
        { keys: ["Hold & drag"], label: "Reorder spreads in thumbnail strip" },
        { keys: ["?"], label: "Toggle this shortcuts guide" },
      ],
    },
  ];

  return (
    <Modal
      open={open}
      onClose={() => setShortcutsOpen(false)}
      title="Keyboard shortcuts & gestures"
      description="Press ? anytime in the workspace to view quick controls."
      size="lg"
      footer={
        <div className="flex w-full items-center justify-between gap-2">
          <Button
            variant="secondary"
            size="sm"
            leadingIcon={Compass}
            onClick={() => {
              setShortcutsOpen(false);
              setTourOpen(true);
            }}
          >
            Replay onboarding tour
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setShortcutsOpen(false)}
          >
            Done
          </Button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {groups.map((group) => (
          <section
            key={group.title}
            className="flex flex-col gap-2 rounded-card border border-line bg-surface-muted/40 p-3"
          >
            <h3 className="text-[10px] font-semibold uppercase tracking-[0.12em] text-ink-subtle">
              {group.title}
            </h3>
            <ul className="flex flex-col gap-2">
              {group.items.map((item) => (
                <li
                  key={item.label}
                  className="flex items-center justify-between gap-3 text-[11.5px]"
                >
                  <span className="text-ink-muted">{item.label}</span>
                  <span className="flex shrink-0 items-center gap-1">
                    {item.keys.map((key, idx) => (
                      <kbd
                        key={`${key}-${idx}`}
                        className="inline-flex min-w-5 items-center justify-center rounded-[5px] border border-line-strong bg-surface px-1.5 py-0.5 font-mono text-[10px] font-semibold text-ink shadow-sm"
                      >
                        {key}
                      </kbd>
                    ))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </Modal>
  );
}
