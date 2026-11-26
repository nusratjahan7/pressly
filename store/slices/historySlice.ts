import type { StateCreator } from "zustand";
import type { Project } from "@/types";
import type { EditorStore, HistorySlice } from "@/store/types";
import { EMPTY_SELECTION } from "@/store/slices/selectionSlice";
import { clampSpreadIndex } from "@/lib/spreads";

const HISTORY_LIMIT = 60;

function cloneProject(project: Project): Project {
  return structuredClone(project);
}

export const createHistorySlice: StateCreator<
  EditorStore,
  [],
  [],
  HistorySlice
> = (set, get) => ({
  history: { past: [], future: [] },

  pushHistory: () => {
    const state = get();
    set({
      history: {
        past: [...state.history.past, cloneProject(state.project)].slice(
          -HISTORY_LIMIT,
        ),
        future: [],
      },
    });
  },

  undo: () => {
    const state = get();
    if (state.history.past.length === 0) return;

    const previous = state.history.past[state.history.past.length - 1]!;
    set((current) => ({
      project: previous,
      history: {
        past: current.history.past.slice(0, -1),
        future: [cloneProject(current.project), ...current.history.future].slice(
          0,
          HISTORY_LIMIT,
        ),
      },
      selection: EMPTY_SELECTION,
      ui: {
        ...current.ui,
        spreadIndex: clampSpreadIndex(current.ui.spreadIndex, previous.pages),
      },
    }));
  },

  redo: () => {
    const state = get();
    if (state.history.future.length === 0) return;

    const next = state.history.future[0]!;
    set((current) => ({
      project: next,
      history: {
        past: [...current.history.past, cloneProject(current.project)].slice(
          -HISTORY_LIMIT,
        ),
        future: current.history.future.slice(1),
      },
      selection: EMPTY_SELECTION,
      ui: {
        ...current.ui,
        spreadIndex: clampSpreadIndex(current.ui.spreadIndex, next.pages),
      },
    }));
  },
});
