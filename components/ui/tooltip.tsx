"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  shortcut?: string;
  delay?: number;
  className?: string;
  disabled?: boolean;
}

export function Tooltip({
  content,
  children,
  side = "top",
  shortcut,
  delay = 350,
  className,
  disabled,
}: TooltipProps) {
  const id = useId();
  const anchorRef = useRef<HTMLSpanElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open]);

  const show = () => {
    if (disabled) return;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      const rect = anchorRef.current?.getBoundingClientRect();
      if (!rect) return;
      const margin = 12;
      const half = 130;
      if (side === "left" || side === "right") {
        setPosition({
          left: side === "left" ? rect.left - 8 : rect.right + 8,
          top: Math.min(
            Math.max(rect.top + rect.height / 2, 24),
            window.innerHeight - 24,
          ),
        });
      } else {
        const left = Math.min(
          Math.max(rect.left + rect.width / 2, half + margin),
          window.innerWidth - half - margin,
        );
        setPosition({
          left,
          top: side === "top" ? rect.top - 8 : rect.bottom + 8,
        });
      }
      setOpen(true);
    }, delay);
  };

  const hide = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    setOpen(false);
  };

  return (
    <>
      <span
        ref={anchorRef}
        className={cn("inline-flex", className)}
        onPointerEnter={show}
        onPointerLeave={hide}
        onPointerDown={hide}
        onFocus={show}
        onBlur={hide}
        aria-describedby={open ? id : undefined}
      >
        {children}
      </span>
      {typeof document !== "undefined"
        ? createPortal(
            <AnimatePresence>
              {open && !disabled ? (
                <div
                  className="pointer-events-none fixed z-[400]"
                  style={{
                    left: position.left,
                    top: position.top,
                    transform:
                      side === "top"
                        ? "translate(-50%, -100%)"
                        : side === "bottom"
                          ? "translate(-50%, 0)"
                          : side === "left"
                            ? "translate(-100%, -50%)"
                            : "translate(0, -50%)",
                  }}
                >
                  <motion.div
                    id={id}
                    role="tooltip"
                    initial={{
                      opacity: 0,
                      x:
                        side === "left" ? 3 : side === "right" ? -3 : 0,
                      y: side === "top" ? 3 : side === "bottom" ? -3 : 0,
                    }}
                    animate={{ opacity: 1, x: 0, y: 0 }}
                    exit={{
                      opacity: 0,
                      x:
                        side === "left" ? 3 : side === "right" ? -3 : 0,
                      y: side === "top" ? 3 : side === "bottom" ? -3 : 0,
                    }}
                    transition={{ duration: 0.14, ease: [0.22, 1, 0.36, 1] }}
                    className="flex max-w-[280px] items-center gap-2 rounded-md bg-ink px-2.5 py-1.5 text-[11px] font-medium leading-none text-canvas shadow-float"
                  >
                    <span>{content}</span>
                    {shortcut ? (
                      <kbd className="rounded border border-canvas/20 bg-canvas/10 px-1 py-0.5 font-sans text-[9px] font-medium tracking-wide text-canvas/80">
                        {shortcut}
                      </kbd>
                    ) : null}
                  </motion.div>
                </div>
              ) : null}
            </AnimatePresence>,
            document.body,
          )
        : null}
    </>
  );
}
