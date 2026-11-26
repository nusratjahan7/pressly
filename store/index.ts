"use client";

import { create } from "zustand";
import type { EditorStore } from "@/store/types";
import { createProjectSlice } from "@/store/slices/projectSlice";
import { createPagesSlice } from "@/store/slices/pagesSlice";
import { createElementsSlice } from "@/store/slices/elementsSlice";
import { createSelectionSlice } from "@/store/slices/selectionSlice";
import { createHistorySlice } from "@/store/slices/historySlice";
import { createUiSlice } from "@/store/slices/uiSlice";

export const useEditorStore = create<EditorStore>()((...args) => ({
  ...createProjectSlice(...args),
  ...createPagesSlice(...args),
  ...createElementsSlice(...args),
  ...createSelectionSlice(...args),
  ...createHistorySlice(...args),
  ...createUiSlice(...args),
}));
