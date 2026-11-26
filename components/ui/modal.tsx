"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cn } from "@/lib/cn";
import { IconButton } from "@/components/ui/icon-button";

type ModalSize = "sm" | "md" | "lg" | "xl" | "full";
type ModalVariant = "center" | "drawer" | "full";

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  size?: ModalSize;
  variant?: ModalVariant;
  className?: string;
  bodyClassName?: string;
  dismissible?: boolean;
  hideClose?: boolean;
  labelledById?: string;
}

const sizeClasses: Record<ModalSize, string> = {
  sm: "w-full max-w-[400px]",
  md: "w-full max-w-[480px]",
  lg: "w-full max-w-[640px]",
  xl: "w-full max-w-[880px]",
  full: "h-dvh w-screen max-w-none",
};

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  footer,
  size = "md",
  variant = "center",
  className,
  bodyClassName,
  dismissible = true,
  hideClose = false,
  labelledById,
}: ModalProps) {
  const [mounted, setMounted] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const previousFocus = useRef<HTMLElement | null>(null);
  const generatedTitleId = useId();
  const titleId = labelledById ?? generatedTitleId;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    previousFocus.current = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const focusTimer = window.setTimeout(() => {
      panelRef.current?.focus({ preventScroll: true });
    }, 30);

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape" && dismissible) {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab") return;

      const panel = panelRef.current;
      if (!panel) return;
      const focusable = Array.from(
        panel.querySelectorAll<HTMLElement>(FOCUSABLE),
      ).filter((element) => element.offsetParent !== null);
      if (focusable.length === 0) {
        event.preventDefault();
        panel.focus();
        return;
      }
      const first = focusable[0]!;
      const last = focusable[focusable.length - 1]!;
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      window.clearTimeout(focusTimer);
      document.body.style.overflow = previousOverflow;
      previousFocus.current?.focus?.({ preventScroll: true });
    };
  }, [open, onClose, dismissible, variant]);

  if (!mounted) return null;

  const isDrawer = variant === "drawer";

  return createPortal(
    <AnimatePresence>
      {open ? (
        <div
          className={cn(
            "fixed inset-0 z-[200] flex",
            isDrawer
              ? "justify-start"
              : variant === "full"
                ? ""
                : "items-center justify-center p-4 sm:p-6",
          )}
        >
          <motion.div
            aria-hidden="true"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={dismissible ? onClose : undefined}
            className="absolute inset-0 bg-black/45 backdrop-blur-[2px]"
          />
          <motion.div
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={description ? `${titleId}-description` : undefined}
            tabIndex={-1}
            initial={
              isDrawer
                ? { x: -24, opacity: 0.6 }
                : variant === "full"
                  ? { opacity: 0 }
                  : { opacity: 0, y: 10, scale: 0.985 }
            }
            animate={{ x: 0, y: 0, scale: 1, opacity: 1 }}
            exit={
              isDrawer
                ? { x: -24, opacity: 0 }
                : variant === "full"
                  ? { opacity: 0 }
                  : { opacity: 0, y: 8, scale: 0.985 }
            }
            transition={{ duration: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className={cn(
              "relative z-10 flex flex-col bg-surface shadow-panel outline-none",
              isDrawer
                ? "h-full w-[360px] max-w-[92vw] border-r border-line"
                : variant === "full"
                  ? "h-dvh w-screen"
                  : cn(
                      "max-h-[min(88dvh,860px)] rounded-card border border-line",
                      sizeClasses[size],
                    ),
              className,
            )}
          >
            <header
              className={cn(
                "flex shrink-0 items-start justify-between gap-4 border-b border-line",
                isDrawer ? "px-5 pb-4 pt-5" : "px-5 py-4",
              )}
            >
              <div className="flex min-w-0 flex-col gap-1">
                <h2
                  id={titleId}
                  className="text-[15px] font-semibold leading-5 tracking-[-0.01em] text-ink"
                >
                  {title}
                </h2>
                {description ? (
                  <p
                    id={`${titleId}-description`}
                    className="text-[12px] leading-4 text-ink-muted"
                  >
                    {description}
                  </p>
                ) : null}
              </div>
              {!hideClose && dismissible ? (
                <IconButton
                  icon={X}
                  label="Close"
                  size="sm"
                  onClick={onClose}
                  tooltip="Close"
                  className="-mr-1 -mt-0.5"
                />
              ) : null}
            </header>
            <div
              className={cn(
                "min-h-0 flex-1 overflow-y-auto",
                variant === "full" ? "p-0" : "px-5 py-4",
                bodyClassName,
              )}
            >
              {children}
            </div>
            {footer ? (
              <footer className="flex shrink-0 items-center justify-end gap-2 border-t border-line bg-surface-muted/60 px-5 py-3">
                {footer}
              </footer>
            ) : null}
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    document.body,
  );
}
