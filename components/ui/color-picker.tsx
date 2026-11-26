"use client";

import {
  useEffect,
  useId,
  useLayoutEffect,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

const PALETTE = [
  { value: "#1C1B19", name: "Charcoal" },
  { value: "#6B675F", name: "Graphite" },
  { value: "#9A948A", name: "Stone" },
  { value: "#FFFFFF", name: "White" },
  { value: "#F6F1E7", name: "Ivory" },
  { value: "#E8DFCF", name: "Sand" },
  { value: "#CAD2C2", name: "Sage" },
  { value: "#EAD5CD", name: "Blush" },
  { value: "#BF6444", name: "Clay" },
  { value: "#C2542D", name: "Accent" },
  { value: "#26313B", name: "Midnight" },
  { value: "#45433D", name: "Umber" },
];

const HEX_PATTERN = /^#?([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

function normalizeHex(value: string) {
  const raw = value.replace("#", "").trim();
  if (raw.length === 3) {
    return `#${raw
      .split("")
      .map((char) => char + char)
      .join("")
      .toUpperCase()}`;
  }
  return `#${raw.toUpperCase()}`;
}

interface ColorPickerProps {
  value: string;
  onChange: (value: string) => void;
  label: string;
  allowTransparent?: boolean;
  disabled?: boolean;
  className?: string;
}

export function ColorPicker({
  value,
  onChange,
  label,
  allowTransparent = false,
  disabled = false,
  className,
}: ColorPickerProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const [hexDraft, setHexDraft] = useState("");
  const [hexError, setHexError] = useState<string | null>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const hexInputId = useId();
  const hexErrorId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    const anchor = anchorRef.current;
    const panel = panelRef.current;
    if (!anchor || !panel) return;
    const rect = anchor.getBoundingClientRect();
    const width = panel.offsetWidth;
    const height = panel.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const top =
      spaceBelow < height && spaceAbove > spaceBelow
        ? Math.max(10, rect.top - height - 6)
        : Math.min(rect.bottom + 6, window.innerHeight - height - 10);
    const left = Math.min(
      Math.max(rect.left, 10),
      Math.max(10, window.innerWidth - width - 10),
    );
    setPosition({ left, top });
    setReady(true);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    setHexDraft(value === "transparent" ? "" : value.toUpperCase());
    setHexError(null);

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        panelRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        anchorRef.current?.focus();
      }
    };
    const handleResize = () => setOpen(false);

    document.addEventListener("pointerdown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);
    window.addEventListener("resize", handleResize);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("resize", handleResize);
    };
  }, [open, value]);

  useEffect(() => {
    if (!open) return;
    const focusTimer = window.setTimeout(() => {
      const firstSwatch =
        panelRef.current?.querySelector<HTMLButtonElement>(
          '[role="group"] button',
        );
      (firstSwatch ?? panelRef.current)?.focus({ preventScroll: true });
    }, 40);
    return () => window.clearTimeout(focusTimer);
  }, [open]);

  const applyHex = () => {
    const next = hexDraft.trim();
    if (!next) {
      setHexError("Enter a hex value");
      return;
    }
    if (!HEX_PATTERN.test(next)) {
      setHexError("Use 3 or 6 hex digits");
      return;
    }
    onChange(normalizeHex(next));
    setHexError(null);
  };

  const isTransparent = value === "transparent";

  return (
    <>
      <button
        ref={anchorRef}
        type="button"
        disabled={disabled}
        aria-label={`${label}: ${value}`}
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className={cn(
          "flex h-9 w-full items-center gap-2.5 rounded-field border border-line bg-surface px-2.5 text-left transition-colors duration-150 hover:border-line-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-45",
          className,
        )}
      >
        <span
          aria-hidden="true"
          className="relative size-[18px] shrink-0 overflow-hidden rounded-[5px] border border-line-strong"
          style={{
            background: isTransparent
              ? "repeating-conic-gradient(var(--line) 0% 25%, var(--surface) 0% 50%) 50% / 8px 8px"
              : value,
          }}
        />
        <span className="flex-1 truncate font-mono text-[11px] uppercase tracking-wide text-ink-muted">
          {isTransparent ? "None" : value}
        </span>
        <ChevronDown
          className="size-3.5 text-ink-subtle"
          aria-hidden="true"
        />
      </button>

      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  ref={panelRef}
                  role="dialog"
                  tabIndex={-1}
                  aria-label={`Choose ${label}`}
                  initial={{ opacity: 0, y: -4, scale: 0.985 }}
                  animate={{ opacity: ready ? 1 : 0, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.985 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  style={{
                    left: position.left,
                    top: position.top,
                    visibility: ready ? "visible" : "hidden",
                  }}
                  className="fixed z-[300] w-[252px] rounded-ui border border-line bg-surface-raised p-3 shadow-panel"
                >
                  <div className="mb-2.5 flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                      {label}
                    </span>
                    <span className="font-mono text-[10px] uppercase text-ink-subtle">
                      {isTransparent ? "None" : value}
                    </span>
                  </div>
                  <div
                    className="grid grid-cols-6 gap-1.5"
                    role="group"
                    aria-label="Colour palette"
                  >
                    {allowTransparent ? (
                      <button
                        type="button"
                        onClick={() => onChange("transparent")}
                        aria-label="No colour"
                        aria-pressed={isTransparent}
                        className={cn(
                          "relative size-[30px] overflow-hidden rounded-[7px] border transition-transform duration-150 hover:scale-105",
                          isTransparent
                            ? "border-accent ring-2 ring-accent ring-offset-1 ring-offset-surface-raised"
                            : "border-line-strong",
                        )}
                        style={{
                          background:
                            "repeating-conic-gradient(var(--line) 0% 25%, var(--surface) 0% 50%) 50% / 8px 8px",
                        }}
                      >
                        <span className="absolute inset-0 m-auto block h-px w-full rotate-45 bg-danger" />
                      </button>
                    ) : null}
                    {PALETTE.map((color) => {
                      const selected =
                        !isTransparent &&
                        color.value.toLowerCase() === value.toLowerCase();
                      return (
                        <button
                          key={color.value}
                          type="button"
                          onClick={() => onChange(color.value)}
                          aria-label={color.name}
                          aria-pressed={selected}
                          title={color.name}
                          className={cn(
                            "flex size-[30px] items-center justify-center rounded-[7px] border transition-transform duration-150 hover:scale-105",
                            selected
                              ? "border-accent ring-2 ring-accent ring-offset-1 ring-offset-surface-raised"
                              : "border-line-strong",
                          )}
                          style={{ background: color.value }}
                        >
                          {selected ? (
                            <Check
                              className={cn(
                                "size-3.5",
                                color.value === "#FFFFFF" ||
                                  color.value === "#F6F1E7" ||
                                  color.value === "#E8DFCF" ||
                                  color.value === "#CAD2C2" ||
                                  color.value === "#EAD5CD"
                                  ? "text-ink"
                                  : "text-white",
                              )}
                              strokeWidth={2.5}
                              aria-hidden="true"
                            />
                          ) : null}
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-3 border-t border-line pt-3">
                    <label
                      htmlFor={hexInputId}
                      className="mb-1.5 block text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle"
                    >
                      Custom hex
                    </label>
                    <div className="flex gap-1.5">
                      <div className="relative flex-1">
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-[11px] text-ink-subtle"
                        >
                          #
                        </span>
                        <input
                          id={hexInputId}
                          value={hexDraft.replace("#", "")}
                          onChange={(event) => {
                            setHexDraft(event.target.value.toUpperCase());
                            setHexError(null);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter") {
                              event.preventDefault();
                              applyHex();
                            }
                          }}
                          onBlur={applyHex}
                          placeholder="C2542D"
                          spellCheck={false}
                          autoComplete="off"
                          aria-invalid={hexError ? true : undefined}
                          aria-describedby={
                            hexError ? hexErrorId : undefined
                          }
                          className="h-8 w-full rounded-field border border-line bg-surface pl-6 pr-2 font-mono text-[11px] uppercase text-ink placeholder:text-ink-subtle focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/30"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={applyHex}
                        className="h-8 rounded-field border border-line-strong bg-surface px-2.5 text-[11px] font-medium text-ink transition-colors duration-150 hover:bg-surface-muted"
                      >
                        Apply
                      </button>
                    </div>
                    {hexError ? (
                      <p
                        id={hexErrorId}
                        role="alert"
                        className="mt-1.5 text-[10px] text-danger"
                      >
                        {hexError}
                      </p>
                    ) : null}
                  </div>
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
