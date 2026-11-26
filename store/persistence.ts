"use client";

import { useEffect, useRef } from "react";
import { createStore, get, set } from "idb-keyval";
import type { Page, Project } from "@/types";
import { useEditorStore } from "@/store";
import { createCoverPage, createEndPaper, createPage } from "@/lib/project";
import { clampSpreadIndex } from "@/lib/spreads";

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

function migratePages(pages: Page[]): Page[] {
  const hasBookStructure = pages.some((page) => page.coverSide || page.isEndPaper);
  if (hasBookStructure) {
    return pages.map((page) =>
      page.isEndPaper ? { ...page, locked: true } : page,
    );
  }

  // Legacy documents had [frontCover, ...middle, backCover]. Rebuild into the
  // printed book layout: [backCover, frontCover, endPaper, ...pages, endPaper].
  const legacyFront = pages[0];
  const legacyBack = pages.length > 1 ? pages[pages.length - 1] : undefined;
  const backCover: Page = legacyBack
    ? { ...legacyBack, coverSide: "back" }
    : createCoverPage("back");
  const frontCover: Page = legacyFront
    ? { ...legacyFront, coverSide: "front" }
    : createCoverPage("front", "ivory");

  const interior = pages.slice(1, Math.max(1, pages.length - 1));
  if (interior.length === 0) {
    interior.push(createPage("paper"), createPage("paper"));
  } else if (interior.length % 2 === 1) {
    interior.push(createPage("paper"));
  }

  return [backCover, frontCover, createEndPaper(), ...interior, createEndPaper()];
}

/**
 * Documents saved before page setup existed have no `safeMargin` or `binding`.
 * Fill them in rather than discarding the user's work.
 */
function migrateProject(project: Project): Project {
  const pageSize = project.pageSize;
  const binding =
    pageSize.binding === "saddle-stitch" ||
    pageSize.binding === "perfect-bound" ||
    pageSize.binding === "hardcover"
      ? pageSize.binding
      : "perfect-bound";

  return {
    ...project,
    pageSize: {
      ...pageSize,
      unit: "mm",
      safeMargin:
        typeof pageSize.safeMargin === "number" ? pageSize.safeMargin : 5,
      binding,
    },
    pages: migratePages(project.pages),
  };
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
        const migrated = migrateProject(document.project);
        useEditorStore.getState().replaceProject(migrated);
        useEditorStore.setState((state) => ({
          ui: {
            ...state.ui,
            spreadIndex: clampSpreadIndex(document.spreadIndex, migrated.pages),
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
