import type { StateCreator } from "zustand";
import type { EditorStore, HistorySlice } from "@/store/types";
import {
  createDiffCommand,
  HISTORY_LIMIT,
  type CommandDocumentState,
  type EditorCommand,
} from "@/lib/history/commands";

function flushPendingToPast(
  past: EditorCommand[],
  state: EditorStore,
): EditorCommand[] {
  const pending = state.history.pending;
  if (!pending) return past;
  const cmd = createDiffCommand(
    pending.label,
    {
      project: pending.project,
      spreadIndex: pending.spreadIndex,
      selection: pending.selection,
    },
    {
      project: state.project,
      spreadIndex: state.ui.spreadIndex,
      selection: state.selection,
    },
  );
  if (!cmd) return past;
  return [...past, cmd].slice(-HISTORY_LIMIT);
}

export const createHistorySlice: StateCreator<
  EditorStore,
  [],
  [],
  HistorySlice
> = (set, get) => ({
  history: { past: [], future: [], pending: null },

  executeCommand: (command) => {
    const state = get();
    const pastWithFlushed = flushPendingToPast(state.history.past, state);
    const currentDoc: CommandDocumentState = {
      project: state.project,
      spreadIndex: state.ui.spreadIndex,
      selection: state.selection,
    };
    const nextDoc = command.execute(currentDoc);

    set((current) => ({
      project: nextDoc.project,
      selection: nextDoc.selection,
      ui: {
        ...current.ui,
        spreadIndex: nextDoc.spreadIndex,
      },
      history: {
        past: [...pastWithFlushed, command].slice(-HISTORY_LIMIT),
        future: [],
        pending: null,
      },
    }));
  },

  pushHistory: (label = "Edit") => {
    const state = get();
    const nextPast = flushPendingToPast(state.history.past, state);
    set({
      history: {
        past: nextPast,
        future: state.history.future,
        pending: {
          label,
          project: state.project,
          spreadIndex: state.ui.spreadIndex,
          selection: state.selection,
        },
      },
    });
  },

  commitHistory: () => {
    const state = get();
    if (!state.history.pending) return;
    const nextPast = flushPendingToPast(state.history.past, state);
    const didPush = nextPast.length !== state.history.past.length || nextPast[nextPast.length - 1] !== state.history.past[state.history.past.length - 1];
    set({
      history: {
        past: nextPast,
        future: didPush ? [] : state.history.future,
        pending: null,
      },
    });
  },

  clearHistory: () => {
    set({
      history: { past: [], future: [], pending: null },
    });
  },

  undo: () => {
    const state = get();
    const pastWithFlushed = flushPendingToPast(state.history.past, state);
    if (pastWithFlushed.length === 0) {
      if (state.history.pending) {
        set((current) => ({
          history: { ...current.history, pending: null },
        }));
      }
      return;
    }

    const command = pastWithFlushed[pastWithFlushed.length - 1]!;
    const currentDoc: CommandDocumentState = {
      project: state.project,
      spreadIndex: state.ui.spreadIndex,
      selection: state.selection,
    };
    const prevDoc = command.undo(currentDoc);

    set((current) => ({
      project: prevDoc.project,
      selection: prevDoc.selection,
      ui: {
        ...current.ui,
        spreadIndex: prevDoc.spreadIndex,
      },
      history: {
        past: pastWithFlushed.slice(0, -1),
        future: [command, ...current.history.future].slice(0, HISTORY_LIMIT),
        pending: null,
      },
    }));
  },

  redo: () => {
    const state = get();
    const pastWithFlushed = flushPendingToPast(state.history.past, state);
    if (state.history.future.length === 0) return;

    const command = state.history.future[0]!;
    const currentDoc: CommandDocumentState = {
      project: state.project,
      spreadIndex: state.ui.spreadIndex,
      selection: state.selection,
    };
    const nextDoc = command.execute(currentDoc);

    set((current) => ({
      project: nextDoc.project,
      selection: nextDoc.selection,
      ui: {
        ...current.ui,
        spreadIndex: nextDoc.spreadIndex,
      },
      history: {
        past: [...pastWithFlushed, command].slice(-HISTORY_LIMIT),
        future: current.history.future.slice(1),
        pending: null,
      },
    }));
  },
});
