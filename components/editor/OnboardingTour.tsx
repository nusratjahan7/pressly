"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, ArrowRight, Sparkles, X } from "lucide-react";
import { useEditorStore } from "@/store";
import { Button } from "@/components/ui/button";

const ONBOARDING_STORAGE_KEY = "pressly:onboarding:v1";

interface TourStep {
  selector: string;
  title: string;
  description: string;
  preferredSide: "right" | "bottom" | "left";
}

const TOUR_STEPS: TourStep[] = [
  {
    selector: '[data-tour="libraries"]',
    title: "1 · Libraries, Templates & Layouts",
    description:
      "Browse photos, magazine templates, spread layouts, custom backgrounds, and stickers from the left studio rail.",
    preferredSide: "right",
  },
  {
    selector: '[data-tour="canvas"]',
    title: "2 · Interactive Spread Canvas",
    description:
      "Drag elements onto pages, double-click text to edit or photos to crop, and use Space + Drag or pinch to pan and zoom.",
    preferredSide: "bottom",
  },
  {
    selector: '[data-tour="inspector"]',
    title: "3 · Properties & Spread Layers",
    description:
      "Adjust exact mm coordinates, rotation, opacity, align tools, or switch to Layers to rename, hide, lock, and drag-reorder.",
    preferredSide: "left",
  },
  {
    selector: '[data-tour="export"]',
    title: "4 · Pre-Flight & Print PDF Export",
    description:
      "Every edit autosaves locally to IndexedDB. Run pre-flight checks and download 300 DPI print-ready PDFs with bleed & crop marks.",
    preferredSide: "bottom",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export function OnboardingTour() {
  const hydrated = useEditorStore((state) => state.ui.hydrated);
  const tourOpen = useEditorStore((state) => state.ui.tourOpen);
  const setTourOpen = useEditorStore((state) => state.setTourOpen);

  const [stepIndex, setStepIndex] = useState(0);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);

  useEffect(() => {
    if (!hydrated) return;
    try {
      const done = window.localStorage.getItem(ONBOARDING_STORAGE_KEY);
      if (done !== "done") {
        const timer = window.setTimeout(() => setTourOpen(true), 450);
        return () => window.clearTimeout(timer);
      }
    } catch {
      /* ignore localStorage restrictions */
    }
  }, [hydrated, setTourOpen]);

  useEffect(() => {
    if (!tourOpen) {
      setStepIndex(0);
      return;
    }

    const updateRect = () => {
      const step = TOUR_STEPS[stepIndex];
      if (!step) return;
      const el = document.querySelector(step.selector);
      if (!el) {
        setTargetRect(null);
        return;
      }
      const r = el.getBoundingClientRect();
      setTargetRect({
        top: r.top,
        left: r.left,
        width: r.width,
        height: r.height,
      });
    };

    updateRect();
    window.addEventListener("resize", updateRect);
    return () => window.removeEventListener("resize", updateRect);
  }, [tourOpen, stepIndex]);

  const finishTour = () => {
    try {
      window.localStorage.setItem(ONBOARDING_STORAGE_KEY, "done");
    } catch {
      /* ignore */
    }
    setTourOpen(false);
  };

  if (!tourOpen) return null;

  const step = TOUR_STEPS[stepIndex]!;
  const isLast = stepIndex === TOUR_STEPS.length - 1;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const cardW = Math.min(312, vw - 24);
  const cardH = 180;

  let cardTop = Math.max(16, vh / 2 - cardH / 2);
  let cardLeft = Math.max(12, vw / 2 - cardW / 2);

  if (targetRect) {
    if (step.preferredSide === "right") {
      cardLeft = Math.min(vw - cardW - 14, targetRect.left + targetRect.width + 14);
      cardTop = Math.min(vh - cardH - 16, Math.max(64, targetRect.top + 16));
    } else if (step.preferredSide === "left") {
      cardLeft = Math.max(14, targetRect.left - cardW - 14);
      cardTop = Math.min(vh - cardH - 16, Math.max(64, targetRect.top + 16));
    } else {
      cardLeft = Math.min(
        vw - cardW - 14,
        Math.max(14, targetRect.left + targetRect.width / 2 - cardW / 2),
      );
      cardTop = Math.min(
        vh - cardH - 16,
        Math.max(68, targetRect.top + Math.min(targetRect.height + 12, 88)),
      );
    }
  }

  return (
    <AnimatePresence>
      <div
        role="dialog"
        aria-modal="false"
        aria-label="Pressly studio tour"
        className="pointer-events-none fixed inset-0 z-[120]"
      >
        {targetRect ? (
          <div
            aria-hidden="true"
            className="pointer-events-none fixed rounded-card border-2 border-accent shadow-[0_0_0_9999px_rgba(11,15,36,0.22)] transition-[top,left,width,height] duration-200"
            style={{
              top: Math.max(2, targetRect.top - 2),
              left: Math.max(2, targetRect.left - 2),
              width: targetRect.width + 4,
              height: targetRect.height + 4,
            }}
          />
        ) : null}

        <motion.div
          key={step.selector}
          initial={{ opacity: 0, y: 8, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 6, scale: 0.98 }}
          transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto fixed flex flex-col gap-3 rounded-card border border-line bg-surface-raised p-4 shadow-panel"
          style={{ top: cardTop, left: cardLeft, width: cardW }}
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-[0.12em] text-accent">
              <Sparkles className="size-3.5" aria-hidden="true" />
              Quick Tour · {stepIndex + 1}/{TOUR_STEPS.length}
            </div>
            <button
              type="button"
              onClick={finishTour}
              aria-label="Skip tour"
              className="inline-flex size-6 items-center justify-center rounded-field text-ink-subtle hover:bg-surface-muted hover:text-ink"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>

          <div className="flex flex-col gap-1">
            <h3 className="text-[13px] font-semibold leading-5 text-ink">
              {step.title}
            </h3>
            <p className="text-[11.5px] leading-4 text-ink-muted">
              {step.description}
            </p>
          </div>

          <div className="flex items-center justify-between gap-2 pt-1">
            <button
              type="button"
              onClick={finishTour}
              className="text-[11px] font-medium text-ink-subtle hover:text-ink"
            >
              Skip tour
            </button>

            <div className="flex items-center gap-1.5">
              {stepIndex > 0 ? (
                <Button
                  variant="ghost"
                  size="sm"
                  leadingIcon={ArrowLeft}
                  onClick={() => setStepIndex((i) => Math.max(0, i - 1))}
                >
                  Back
                </Button>
              ) : null}
              <Button
                variant="primary"
                size="sm"
                trailingIcon={isLast ? undefined : ArrowRight}
                onClick={() => {
                  if (isLast) finishTour();
                  else setStepIndex((i) => Math.min(TOUR_STEPS.length - 1, i + 1));
                }}
              >
                {isLast ? "Get started" : "Next"}
              </Button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
