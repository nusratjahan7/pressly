"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Undo2, X } from "lucide-react";
import { useToastStore } from "@/store/toasts";

/**
 * Renders the single active undo toast. Lives above the thumbnail strip so the
 * undo affordance is near the action that produced it.
 */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 left-1/2 z-[150] flex -translate-x-1/2 flex-col items-center gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => (
          <motion.div
            key={toast.id}
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
            role="status"
            className="pointer-events-auto flex items-center gap-3 rounded-ui border border-line bg-surface-raised px-3 py-2 shadow-panel"
          >
            <span className="text-[11.5px] font-medium text-ink">
              {toast.message}
            </span>
            {toast.action ? (
              <button
                type="button"
                onClick={() => {
                  toast.action?.onAct();
                  dismissToast(toast.id);
                }}
                className="inline-flex items-center gap-1 rounded-field bg-accent-soft px-2 py-1 text-[11px] font-semibold text-accent transition-colors hover:bg-accent-soft/70"
              >
                <Undo2 className="size-3" aria-hidden="true" />
                {toast.action.label}
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss"
              className="inline-flex size-5 items-center justify-center rounded text-ink-subtle transition-colors hover:bg-surface-muted hover:text-ink"
            >
              <X className="size-3" aria-hidden="true" />
            </button>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}
