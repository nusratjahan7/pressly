"use client";

import { AnimatePresence, motion } from "framer-motion";
import { AlertCircle, CheckCircle2, Undo2, X } from "lucide-react";
import { useToastStore } from "@/store/toasts";
import { cn } from "@/lib/cn";

/**
 * Renders the single active toast above the thumbnail strip.
 */
export function ToastViewport() {
  const toasts = useToastStore((state) => state.toasts);
  const dismissToast = useToastStore((state) => state.dismissToast);

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed bottom-24 left-1/2 z-[150] flex max-w-[calc(100vw-24px)] -translate-x-1/2 flex-col items-center gap-2"
    >
      <AnimatePresence initial={false}>
        {toasts.map((toast) => {
          const isError = toast.tone === "error";
          const isSuccess = toast.tone === "success";
          return (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.98 }}
              transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
              role={isError ? "alert" : "status"}
              className={cn(
                "pointer-events-auto flex items-center gap-2.5 rounded-ui border px-3 py-2 shadow-panel",
                isError
                  ? "border-danger/35 bg-danger-soft text-danger"
                  : "border-line bg-surface-raised text-ink",
              )}
            >
              {isError ? (
                <AlertCircle className="size-3.5 shrink-0" aria-hidden="true" />
              ) : isSuccess ? (
                <CheckCircle2
                  className="size-3.5 shrink-0 text-accent"
                  aria-hidden="true"
                />
              ) : null}
              <span className="text-[11.5px] font-medium">{toast.message}</span>
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
                className={cn(
                  "inline-flex size-5 items-center justify-center rounded transition-colors",
                  isError
                    ? "text-danger/80 hover:bg-danger/10 hover:text-danger"
                    : "text-ink-subtle hover:bg-surface-muted hover:text-ink",
                )}
              >
                <X className="size-3" aria-hidden="true" />
              </button>
            </motion.div>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
