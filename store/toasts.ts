"use client";

import { create } from "zustand";

export interface ToastAction {
  label: string;
  onAct: () => void;
}

export interface Toast {
  id: string;
  message: string;
  action?: ToastAction;
}

interface ToastStore {
  toasts: Toast[];
  pushToast: (toast: Omit<Toast, "id"> & { durationMs?: number }) => string;
  dismissToast: (id: string) => void;
}

const DEFAULT_DURATION_MS = 6000;
const timers = new Map<string, ReturnType<typeof setTimeout>>();

let counter = 0;

export const useToastStore = create<ToastStore>((set, get) => ({
  toasts: [],

  pushToast: ({ message, action, durationMs = DEFAULT_DURATION_MS }) => {
    const id = `toast-${Date.now()}-${counter++}`;
    // Only one toast at a time: a second undo target would be ambiguous.
    for (const [existingId, timer] of timers) {
      clearTimeout(timer);
      timers.delete(existingId);
    }
    set({ toasts: [{ id, message, action }] });

    const timer = setTimeout(() => {
      get().dismissToast(id);
    }, durationMs);
    timers.set(id, timer);
    return id;
  },

  dismissToast: (id) => {
    const timer = timers.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.delete(id);
    }
    set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) }));
  },
}));

export function dismissAllToasts() {
  for (const timer of timers.values()) clearTimeout(timer);
  timers.clear();
  useToastStore.setState({ toasts: [] });
}
