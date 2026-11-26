"use client";

import { useEffect, useRef } from "react";
import { get, set } from "idb-keyval";
import type { Project } from "@/types";
import { useEditorStore } from "@/store";
import { clampSpreadIndex } from "@/lib/spreads";
import {
  documentStore,
  ensureProjectsBootstrapped,
  saveProjectDocument,
} from "@/lib/projectStorage";

const PREFS_KEY = "pressly.prefs.v1";
const FAVORITE_LAYOUTS_STORAGE_KEY = "pressly.layoutFavorites.v1";
/** Autosave debounce interval in ms ("every few seconds"). */
const AUTOSAVE_INTERVAL_MS = 2000;

interface PersistedPrefs {
  activeTab: string;
  thumbnailsOpen: boolean;
  favoriteLayoutIds?: string[];
}

async function loadPrefs(): Promise<PersistedPrefs | null> {
  try {
    const raw = await get<PersistedPrefs>(PREFS_KEY, documentStore);
    if (!raw) return null;
    return raw;
  } catch {
    return null;
  }
}

async function savePrefs(prefs: PersistedPrefs) {
  await set(PREFS_KEY, prefs, documentStore);
}

/** Flush the active store document directly to IndexedDB immediately. */
export async function flushActiveProjectToIndexedDb(): Promise<void> {
  const state = useEditorStore.getState();
  state.setSaveState("saving");
  try {
    const saved = await saveProjectDocument(
      state.project,
      state.ui.spreadIndex,
    );
    if (useEditorStore.getState().project.id === saved.project.id) {
      useEditorStore.getState().setSaveState("saved");
      useEditorStore.getState().setLastSavedAt(saved.savedAt);
    }
  } catch {
    useEditorStore.getState().setSaveState("error");
  }
}

export function useProjectPersistence() {
  const hydrated = useEditorStore((state) => state.ui.hydrated);
  const pendingRef = useRef<{ project: Project; spreadIndex: number } | null>(
    null,
  );

  useEffect(() => {
    let cancelled = false;

    const hydrate = async () => {
      const [{ activeDoc }, prefs] = await Promise.all([
        ensureProjectsBootstrapped(),
        loadPrefs(),
      ]);
      if (cancelled) return;

      if (activeDoc) {
        useEditorStore.getState().replaceProject(activeDoc.project);
        useEditorStore.setState((state) => ({
          ui: {
            ...state.ui,
            spreadIndex: clampSpreadIndex(
              activeDoc.spreadIndex,
              activeDoc.project.pages,
            ),
            saveState: "saved",
            lastSavedAt: activeDoc.savedAt,
          },
        }));
      } else {
        // Persist initial seed document immediately so it appears in Dashboard.
        const initial = useEditorStore.getState();
        const saved = await saveProjectDocument(
          initial.project,
          initial.ui.spreadIndex,
        ).catch(() => null);
        if (!cancelled && saved) {
          useEditorStore.setState((state) => ({
            ui: {
              ...state.ui,
              saveState: "saved",
              lastSavedAt: saved.savedAt,
            },
          }));
        }
      }

      if (prefs) {
        useEditorStore.setState((state) => ({
          ui: {
            ...state.ui,
            activeTab:
              prefs.activeTab === "templates" ||
              prefs.activeTab === "layouts" ||
              prefs.activeTab === "backgrounds" ||
              prefs.activeTab === "stickers" ||
              prefs.activeTab === "setup"
                ? prefs.activeTab
                : "images",
            thumbnailsOpen:
              typeof prefs.thumbnailsOpen === "boolean"
                ? prefs.thumbnailsOpen
                : true,
          },
        }));
      }

      const idbFavs = Array.isArray(prefs?.favoriteLayoutIds)
        ? prefs.favoriteLayoutIds.filter(
            (id): id is string => typeof id === "string",
          )
        : [];
      let localFavs: string[] = [];
      try {
        const raw = window.localStorage.getItem(FAVORITE_LAYOUTS_STORAGE_KEY);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            localFavs = parsed.filter(
              (id): id is string => typeof id === "string",
            );
          }
        }
      } catch {
        /* ignore localStorage access issues */
      }
      const mergedFavs = Array.from(new Set([...idbFavs, ...localFavs]));
      if (mergedFavs.length > 0) {
        useEditorStore.getState().setFavoriteLayouts(mergedFavs);
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
    let previousSpreadIndex = useEditorStore.getState().ui.spreadIndex;

    const flush = (project: Project, spreadIndex: number) => {
      void saveProjectDocument(project, spreadIndex)
        .then((saved) => {
          const cur = useEditorStore.getState();
          if (cur.project === project) {
            cur.setSaveState("saved");
            cur.setLastSavedAt(saved.savedAt);
          }
        })
        .catch(() => {
          useEditorStore.getState().setSaveState("error");
        });
    };

    const unsubscribe = useEditorStore.subscribe((state) => {
      const projectChanged = state.project !== previousProject;
      const spreadChanged = state.ui.spreadIndex !== previousSpreadIndex;
      if (!projectChanged && !spreadChanged) return;

      const projectIdChanged = state.project.id !== previousProject.id;
      previousProject = state.project;
      previousSpreadIndex = state.ui.spreadIndex;

      if (projectIdChanged) {
        // Switching to a new/opened/imported project persists right away.
        pendingRef.current = null;
        if (timeout) clearTimeout(timeout);
        flush(state.project, state.ui.spreadIndex);
        return;
      }

      pendingRef.current = {
        project: state.project,
        spreadIndex: state.ui.spreadIndex,
      };
      useEditorStore.getState().setSaveState("saving");

      if (timeout) clearTimeout(timeout);
      timeout = setTimeout(() => {
        const pending = pendingRef.current;
        pendingRef.current = null;
        if (pending) flush(pending.project, pending.spreadIndex);
      }, AUTOSAVE_INTERVAL_MS);
    });

    const flushPendingNow = () => {
      if (pendingRef.current) {
        const pending = pendingRef.current;
        pendingRef.current = null;
        void saveProjectDocument(pending.project, pending.spreadIndex);
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        flushPendingNow();
      }
    };

    window.addEventListener("pagehide", flushPendingNow);
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      unsubscribe();
      if (timeout) clearTimeout(timeout);
      window.removeEventListener("pagehide", flushPendingNow);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hydrated]);

  useEffect(() => {
    if (!hydrated) return;

    let timeout: ReturnType<typeof setTimeout> | undefined;
    let previous = {
      activeTab: useEditorStore.getState().ui.activeTab,
      thumbnailsOpen: useEditorStore.getState().ui.thumbnailsOpen,
      favoriteLayoutIds: useEditorStore.getState().ui.favoriteLayoutIds,
    };

    const unsubscribe = useEditorStore.subscribe((state) => {
      if (
        state.ui.activeTab === previous.activeTab &&
        state.ui.thumbnailsOpen === previous.thumbnailsOpen &&
        state.ui.favoriteLayoutIds === previous.favoriteLayoutIds
      ) {
        return;
      }
      previous = {
        activeTab: state.ui.activeTab,
        thumbnailsOpen: state.ui.thumbnailsOpen,
        favoriteLayoutIds: state.ui.favoriteLayoutIds,
      };
      try {
        window.localStorage.setItem(
          FAVORITE_LAYOUTS_STORAGE_KEY,
          JSON.stringify(previous.favoriteLayoutIds),
        );
      } catch {
        /* ignore localStorage errors */
      }
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
