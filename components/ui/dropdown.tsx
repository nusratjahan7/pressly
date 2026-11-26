"use client";

import {
  cloneElement,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type ReactElement,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Check, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export interface DropdownItem {
  id: string;
  label: string;
  icon?: LucideIcon;
  checked?: boolean;
  disabled?: boolean;
  shortcut?: string;
  danger?: boolean;
  separatorBefore?: boolean;
  onSelect?: () => void;
}

interface DropdownProps {
  trigger: ReactElement;
  items: DropdownItem[];
  ariaLabel: string;
  align?: "start" | "end";
  minWidth?: number;
  className?: string;
  header?: ReactNode;
}

interface MenuPosition {
  left: number;
  top: number;
}

export function Dropdown({
  trigger,
  items,
  ariaLabel,
  align = "start",
  minWidth = 200,
  className,
  header,
}: DropdownProps) {
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState<MenuPosition>({ left: 0, top: 0 });
  const anchorRef = useRef<HTMLSpanElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<Array<HTMLButtonElement | null>>([]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useLayoutEffect(() => {
    if (!open) {
      setReady(false);
      return;
    }
    const anchor = anchorRef.current;
    const menu = menuRef.current;
    if (!anchor || !menu) return;
    const rect = anchor.getBoundingClientRect();
    const width = menu.offsetWidth;
    const height = menu.offsetHeight;
    const spaceBelow = window.innerHeight - rect.bottom - 10;
    const spaceAbove = rect.top - 10;
    const placeAbove =
      spaceBelow < Math.min(height, 300) && spaceAbove > spaceBelow;
    const top = placeAbove
      ? Math.max(10, rect.top - height - 6)
      : Math.min(rect.bottom + 6, window.innerHeight - height - 10);
    let left = align === "end" ? rect.right - width : rect.left;
    left = Math.min(
      Math.max(left, 10),
      Math.max(10, window.innerWidth - width - 10),
    );
    setPosition({ left, top });
    setReady(true);
  }, [open, align, items.length, header]);

  useEffect(() => {
    if (!open) return;

    const focusTimer = window.setTimeout(() => {
      const firstEnabled = itemRefs.current.find(
        (item) => item && !item.disabled,
      );
      firstEnabled?.focus({ preventScroll: true });
    }, 20);

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (
        anchorRef.current?.contains(target) ||
        menuRef.current?.contains(target)
      ) {
        return;
      }
      setOpen(false);
    };
    const handleResize = () => setOpen(false);
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
        anchorRef.current
          ?.querySelector<HTMLElement>("button, [role=button]")
          ?.focus();
      }
    };

    document.addEventListener("pointerdown", handlePointerDown);
    window.addEventListener("resize", handleResize);
    document.addEventListener("keydown", handleEscape);
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("pointerdown", handlePointerDown);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  const close = (restoreFocus = true) => {
    setOpen(false);
    if (restoreFocus) {
      window.setTimeout(() => {
        anchorRef.current
          ?.querySelector<HTMLElement>("button, [role=button]")
          ?.focus({ preventScroll: true });
      }, 0);
    }
  };

  const handleItemSelect = (item: DropdownItem) => {
    if (item.disabled) return;
    item.onSelect?.();
    close(false);
    window.setTimeout(() => {
      anchorRef.current
        ?.querySelector<HTMLElement>("button, [role=button]")
        ?.focus({ preventScroll: true });
    }, 0);
  };

  const triggerProps = trigger.props as {
    onClick?: (event: ReactMouseEvent) => void;
  };

  const triggerNode = cloneElement(
    trigger as ReactElement<Record<string, unknown>>,
    {
      onClick: (event: ReactMouseEvent<HTMLElement>) => {
        triggerProps.onClick?.(event);
        if (event.defaultPrevented) return;
        setOpen((current) => !current);
      },
      "aria-haspopup": "menu",
      "aria-expanded": open,
    },
  );

  const handleMenuKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const enabled = itemRefs.current.filter(
      (item): item is HTMLButtonElement => Boolean(item && !item.disabled),
    );
    const currentIndex = enabled.indexOf(document.activeElement as HTMLButtonElement);

    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (enabled.length === 0) return;
      const delta = event.key === "ArrowDown" ? 1 : -1;
      const nextIndex = (currentIndex + delta + enabled.length) % enabled.length;
      enabled[nextIndex]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      enabled[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      enabled[enabled.length - 1]?.focus();
    } else if (event.key === "Tab") {
      event.preventDefault();
      close(true);
    }
  };

  return (
    <>
      <span ref={anchorRef} className={cn("inline-flex", className)}>
        {triggerNode}
      </span>
      {mounted
        ? createPortal(
            <AnimatePresence>
              {open ? (
                <motion.div
                  ref={menuRef}
                  role="menu"
                  aria-label={ariaLabel}
                  initial={{ opacity: 0, y: -4, scale: 0.985 }}
                  animate={{ opacity: ready ? 1 : 0, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -4, scale: 0.985 }}
                  transition={{ duration: 0.15, ease: [0.22, 1, 0.36, 1] }}
                  onKeyDown={handleMenuKeyDown}
                  style={{
                    left: position.left,
                    top: position.top,
                    minWidth,
                    visibility: ready ? "visible" : "hidden",
                  }}
                  className="fixed z-[300] max-h-[min(360px,70dvh)] overflow-y-auto rounded-ui border border-line bg-surface-raised p-1 shadow-panel"
                >
                  {header ? (
                    <div className="px-2.5 pb-2 pt-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-subtle">
                      {header}
                    </div>
                  ) : null}
                  {items.map((item, index) => {
                    const Icon = item.icon;
                    return (
                      <div key={item.id}>
                        {item.separatorBefore ? (
                          <div
                            role="separator"
                            className="my-1 h-px bg-line"
                          />
                        ) : null}
                        <button
                          ref={(node) => {
                            itemRefs.current[index] = node;
                          }}
                          type="button"
                          role={
                            item.checked === undefined
                              ? "menuitem"
                              : "menuitemradio"
                          }
                          aria-checked={
                            item.checked === undefined ? undefined : item.checked
                          }
                          disabled={item.disabled}
                          onClick={() => handleItemSelect(item)}
                          className={cn(
                            "flex w-full items-center gap-2.5 rounded-[8px] px-2.5 py-1.5 text-left text-[12px] font-medium leading-5 transition-colors duration-150 hover:bg-surface-muted focus-visible:bg-surface-muted focus-visible:outline-none disabled:pointer-events-none disabled:opacity-40",
                            item.danger ? "text-danger" : "text-ink",
                          )}
                        >
                          {Icon ? (
                            <Icon
                              className="size-3.5 shrink-0 text-ink-subtle"
                              aria-hidden="true"
                            />
                          ) : item.checked !== undefined ? (
                            <span className="flex size-3.5 shrink-0 items-center justify-center">
                              {item.checked ? (
                                <Check
                                  className="size-3.5 text-accent"
                                  strokeWidth={2.25}
                                  aria-hidden="true"
                                />
                              ) : null}
                            </span>
                          ) : null}
                          <span className="flex-1 truncate">{item.label}</span>
                          {item.shortcut ? (
                            <kbd className="font-sans text-[10px] font-normal tracking-wide text-ink-subtle">
                              {item.shortcut}
                            </kbd>
                          ) : null}
                        </button>
                      </div>
                    );
                  })}
                </motion.div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
