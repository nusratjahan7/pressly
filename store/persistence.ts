"use client";

import { useEffect, useRef } from "react";
import { createStore, get, set } from "idb-keyval";
import type { Project } from "@/types";
import { useEditorStore } from "@/store";

const PROJECT_KEY = "pressly.project.v1";
const PREFS_KEY = "pressly.prefs.v1";

const projectStore = createStore("pressly", "documents");

interface PersistedDocument {
  project: Project;
  spreadIndex: number;
  savedAt: number;
}

interface PersistedPrefs {
  activeTab: string;
  thumbnailsOpen: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function isProject(value: unknown): value is Project {
  if (!isRecord(value)) return false;
  if (typeof value.id !== "string" || typeof value.name !== "string") {
    return false;
  }
  const pageSize = value.pageSize;
  if (
    !isRecord(pageSize) ||
    typeof pageSize.w !== "number" ||
    typeof pageSize.h !== "number" ||
    typeof pageSize.bleed !== "number"
  ) {
    return false;
  }
  if (!Array.isArray(value.pages) || value.pages.length === 0) return false;
  return value.pages.every(
    (page) =>
      isRecord(page) &&
      typeof page.id === "string" &&
      typeof page.backgroundId === "string" &&
      Array.isArray(page.elements),
  );
}

async function loadDocument(): Promise<PersistedDocument | null> {
  try {
    const raw = await get<PersistedDocument>(PROJECT_KEY, projectStore);
    if (!raw || !isProject(raw.project)) return null;
    return raw;
  } catch {
    return null;
  }
}

async function loadPrefs(): Promise<PersistedPrefs | null> {
  try {
    const raw = await get<PersistedPrefs>(PREFS_KEY, projectStore);
    if (!raw) return null;
    return raw;
  } catch {
    return null;
  }
}

async function saveDocument(document: PersistedDocument) {
  await set(PROJECT_KEY, document, projectStore);
}

async function savePrefs(prefs: PersistedPrefs) {
  await set(PREFS_KEY, prefs, projectStore);
}

export function useProjectPersistence() {
  const hydrated = useEditorStore((state) => state.ui.hydrated);
  const pendingRef = useRef<Project | null>(null);

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const [document, prefs] = await Promise.all([
        loadDocument(),
        loadPrefs(),
      ]);
      if (cancelled) return;

      if (document) {
        useEditorStore.getState().replaceProject(document.project);
        useEditorStore.setState((state) => ({
          ui: {
            ...state.ui,
            spreadIndex: document.spreadIndex,
          },
        }));
      }

      if (prefs) {
        useEditorStore.setState((state) => ({
          ui: {
            ...state.ui,
            activeTab:
              prefs.activeTab === "templates" ||
              prefs.activeTab === "layouts" ||
              prefs.activeTab === "backgrounds" ||
              prefs.activeTab === "stickers"
                ? prefs.activeTab
                : "images",
            thumbnailsOpen:
              typeof prefs.thumbnailsOpen === "boolean"
                ? prefs.thumbnailsOpen
                : true,
          },
        }));
      }

      useEditorStore.getState().setHydrated(true);
    };

    void hydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let previousProject = useEditorStore.getState().project;

    const flush = (project: Project) => {
      void saveDocument({
        project,
        spreadIndex: useEditorStore.getState().ui.spreadIndex,
        savedAt: Date.now(),
      })
        .then(() => {
          if (useEditorStore.getState().project === project) {
            useEditorStore.getState().setSaveState("saved");
          }
        })
        .catch(() => {
          useEditorStore.getState().setSaveState("error");
        });
    };

    const unsubscribe = useEditorStore.subscribe((state) => {
      if (state.project === previousProject) return;
      previousProject = state.project;
      pendingRef.current = state.project;
      useEditorStore.getState().setSaveState("saving");

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const project = pendingRef.current;
        pendingRef.current = null;
        if (project) flush(project);
      }, 500);
    });

    const handlePageHide = () => {
      if (pendingRef.current) {
        const project = pendingRef.current;
        pendingRef.current = null;
        void saveDocument({
          project,
          spreadIndex: useEditorStore.getState().ui.spreadIndex,
          savedAt: Date.now(),
        });
      }
    };

    window.addEventListener("pagehide", handlePageHide);

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let previous = {
      activeTab: useEditorStore.getState().ui.activeTab,
      thumbnailsOpen: useEditorStore.getState().ui.thumbnailsOpen,
    };

    const unsubscribe = useEditorStore.subscribe((state) => {
      if (
        state.ui.activeTab === previous.activeTab &&
        state.ui.thumbnailsOpen === previous.thumbnailsOpen
      ) {
        return;
      }
      previous = {
        activeTab: state.ui.activeTab,
        thumbnailsOpen: state.ui.thumbnailsOpen,
      };
      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        void savePrefs(previous);
      }, 300);
    });

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
    };
  }, [hydrated]);
}
