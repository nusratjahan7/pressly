"use client";

import { createStore, del, get, set } from "idb-keyval";
import type { Page, Project } from "@/types";
import { createId } from "@/lib/id";
import {
  extractAssetId,
  getOriginalMediaBlob,
  isMediaRef,
  saveOriginalMediaBlob,
} from "@/lib/mediaStorage";
import {
  createCoverPage,
  createEndPaper,
  createPage,
  createSeedProject,
} from "@/lib/project";
import { getEditablePageCount } from "@/lib/spreads";
import { slugify } from "@/lib/cn";

export const documentStore = createStore("pressly", "documents");

const LEGACY_PROJECT_KEY = "pressly.project.v1";
const INDEX_KEY = "pressly.projects.index.v1";
const ACTIVE_ID_KEY = "pressly.activeProjectId.v1";
const docKey = (id: string) => `pressly.doc.${id}`;

export interface PersistedDocument {
  project: Project;
  spreadIndex: number;
  createdAt?: number;
  savedAt: number;
}

export interface ProjectSummary {
  id: string;
  name: string;
  createdAt: number;
  updatedAt: number;
  pageCount: number;
  pageSizeLabel: string;
  coverPage?: Page;
  pageSize: Project["pageSize"];
}

interface ExportJsonBundle {
  format: "pressly-project";
  version: 1;
  exportedAt: string;
  project: Project;
  embeddedMedia?: Record<string, string>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function isProject(value: unknown): value is Project {
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

export function migrateProject(project: Project): Project {
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

function summaryFromDocument(doc: PersistedDocument): ProjectSummary {
  const project = doc.project;
  const coverPage =
    project.pages.find((p) => p.coverSide === "front") ??
    project.pages[1] ??
    project.pages[0];
  const now = doc.savedAt || Date.now();
  return {
    id: project.id,
    name: project.name,
    createdAt: doc.createdAt ?? now,
    updatedAt: now,
    pageCount: getEditablePageCount(project.pages),
    pageSizeLabel: `${Math.round(project.pageSize.w)} × ${Math.round(project.pageSize.h)} mm`,
    coverPage,
    pageSize: project.pageSize,
  };
}

async function readIndex(): Promise<ProjectSummary[]> {
  try {
    const raw = await get<ProjectSummary[]>(INDEX_KEY, documentStore);
    if (!Array.isArray(raw)) return [];
    return [...raw].sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

async function writeIndex(summaries: ProjectSummary[]): Promise<void> {
  const sorted = [...summaries].sort((a, b) => b.updatedAt - a.updatedAt);
  await set(INDEX_KEY, sorted, documentStore);
}

export async function getActiveProjectId(): Promise<string | null> {
  try {
    return (await get<string>(ACTIVE_ID_KEY, documentStore)) ?? null;
  } catch {
    return null;
  }
}

export async function setActiveProjectId(id: string): Promise<void> {
  await set(ACTIVE_ID_KEY, id, documentStore);
}

export async function listProjectSummaries(): Promise<ProjectSummary[]> {
  return readIndex();
}

export async function loadProjectDocument(
  id: string,
): Promise<PersistedDocument | null> {
  try {
    const raw = await get<PersistedDocument>(docKey(id), documentStore);
    if (!raw || !isProject(raw.project)) return null;
    return {
      ...raw,
      project: migrateProject(raw.project),
    };
  } catch {
    return null;
  }
}

export async function saveProjectDocument(
  project: Project,
  spreadIndex: number,
): Promise<PersistedDocument> {
  const now = Date.now();
  const existing = await get<PersistedDocument>(docKey(project.id), documentStore);
  const doc: PersistedDocument = {
    project,
    spreadIndex,
    createdAt: existing?.createdAt ?? now,
    savedAt: now,
  };
  await set(docKey(project.id), doc, documentStore);
  await setActiveProjectId(project.id);

  const summary = summaryFromDocument(doc);
  const currentIndex = await readIndex();
  const nextIndex = [
    summary,
    ...currentIndex.filter((item) => item.id !== project.id),
  ];
  await writeIndex(nextIndex);
  return doc;
}

/**
 * Bootstraps multi-project storage and migrates any legacy single-project key.
 */
export async function ensureProjectsBootstrapped(): Promise<{
  activeDoc: PersistedDocument | null;
  summaries: ProjectSummary[];
}> {
  let summaries = await readIndex();
  const activeId = await getActiveProjectId();

  // Migrate legacy single-project storage if the multi-project index is empty.
  if (summaries.length === 0) {
    try {
      const legacy = await get<PersistedDocument>(
        LEGACY_PROJECT_KEY,
        documentStore,
      );
      if (legacy && isProject(legacy.project)) {
        const migrated = migrateProject(legacy.project);
        const saved = await saveProjectDocument(migrated, legacy.spreadIndex ?? 0);
        summaries = await readIndex();
        return { activeDoc: saved, summaries };
      }
    } catch {
      /* ignore legacy migration failure */
    }
  }

  if (activeId) {
    const activeDoc = await loadProjectDocument(activeId);
    if (activeDoc) return { activeDoc, summaries };
  }

  if (summaries.length > 0) {
    const firstDoc = await loadProjectDocument(summaries[0]!.id);
    if (firstDoc) {
      await setActiveProjectId(firstDoc.project.id);
      return { activeDoc: firstDoc, summaries };
    }
  }

  return { activeDoc: null, summaries };
}

export async function renameStoredProject(
  id: string,
  name: string,
): Promise<ProjectSummary[]> {
  const trimmed = name.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!trimmed) return readIndex();
  const doc = await loadProjectDocument(id);
  if (doc) {
    await saveProjectDocument(
      { ...doc.project, name: trimmed },
      doc.spreadIndex,
    );
  }
  return readIndex();
}

export async function duplicateStoredProject(
  id: string,
): Promise<{ created: PersistedDocument; summaries: ProjectSummary[] } | null> {
  const doc = await loadProjectDocument(id);
  if (!doc) return null;

  const cloned: Project = {
    ...structuredClone(doc.project),
    id: createId(),
    name: `${doc.project.name} (Copy)`.slice(0, 80),
  };
  const now = Date.now();
  const createdDoc: PersistedDocument = {
    project: cloned,
    spreadIndex: doc.spreadIndex,
    createdAt: now,
    savedAt: now,
  };
  await set(docKey(cloned.id), createdDoc, documentStore);
  const currentIndex = await readIndex();
  const nextIndex = [
    summaryFromDocument(createdDoc),
    ...currentIndex.filter((s) => s.id !== cloned.id),
  ];
  await writeIndex(nextIndex);
  return { created: createdDoc, summaries: nextIndex };
}

export async function deleteStoredProject(id: string): Promise<{
  summaries: ProjectSummary[];
  fallbackDoc: PersistedDocument | null;
}> {
  await del(docKey(id), documentStore);
  const remaining = (await readIndex()).filter((item) => item.id !== id);
  await writeIndex(remaining);

  const activeId = await getActiveProjectId();
  if (activeId !== id) {
    return { summaries: remaining, fallbackDoc: null };
  }

  if (remaining.length > 0) {
    const nextDoc = await loadProjectDocument(remaining[0]!.id);
    if (nextDoc) {
      await setActiveProjectId(nextDoc.project.id);
      return { summaries: remaining, fallbackDoc: nextDoc };
    }
  }

  const fresh = createSeedProject();
  const savedFresh = await saveProjectDocument(fresh, 0);
  const updated = await readIndex();
  return { summaries: updated, fallbackDoc: savedFresh };
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      resolve(typeof reader.result === "string" ? reader.result : "");
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read blob"));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const [header, body = ""] = dataUrl.split(",");
  const mimeMatch = /data:([^;]+)/.exec(header ?? "");
  const mime = mimeMatch?.[1] ?? "application/octet-stream";
  const binary = atob(body);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

function collectMediaRefs(project: Project): string[] {
  const refs = new Set<string>();
  for (const asset of project.mediaLibrary ?? []) {
    if (isMediaRef(asset.src)) refs.add(asset.src);
  }
  for (const page of project.pages) {
    if (isMediaRef(page.background?.imageSrc)) {
      refs.add(page.background!.imageSrc!);
    }
    for (const el of page.elements) {
      if (el.type === "image" && isMediaRef(el.src)) refs.add(el.src);
      if (el.type === "sticker" && isMediaRef(el.src)) refs.add(el.src!);
    }
  }
  return Array.from(refs);
}

/**
 * Exports a project (including any IndexedDB original blobs) as a portable
 * `.pressly.json` file download.
 */
export async function exportProjectToJsonFile(project: Project): Promise<void> {
  const embeddedMedia: Record<string, string> = {};
  const refs = collectMediaRefs(project);

  for (const ref of refs) {
    const assetId = extractAssetId(ref);
    if (!assetId) continue;
    try {
      const blob = await getOriginalMediaBlob(assetId);
      if (blob) {
        embeddedMedia[ref] = await blobToDataUrl(blob);
      }
    } catch {
      /* ignore missing blob */
    }
  }

  const bundle: ExportJsonBundle = {
    format: "pressly-project",
    version: 1,
    exportedAt: new Date().toISOString(),
    project,
    ...(Object.keys(embeddedMedia).length > 0 ? { embeddedMedia } : {}),
  };

  const json = JSON.stringify(bundle, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${slugify(project.name) || "pressly-project"}.pressly.json`;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 2000);
}

/**
 * Parses a `.json` or `.pressly.json` project file, restores embedded media into
 * IndexedDB, saves the imported project under a fresh ID, and returns it.
 */
export async function importProjectFromJsonFile(
  file: File,
): Promise<PersistedDocument> {
  const text = await file.text();
  const parsed: unknown = JSON.parse(text);

  let rawProject: unknown = null;
  let embeddedMedia: Record<string, string> = {};

  if (isRecord(parsed) && parsed.format === "pressly-project" && isProject(parsed.project)) {
    rawProject = parsed.project;
    if (isRecord(parsed.embeddedMedia)) {
      for (const [k, v] of Object.entries(parsed.embeddedMedia)) {
        if (typeof v === "string" && v.startsWith("data:")) {
          embeddedMedia[k] = v;
        }
      }
    }
  } else if (isProject(parsed)) {
    rawProject = parsed;
  }

  if (!isProject(rawProject)) {
    throw new Error("Invalid Pressly project JSON file.");
  }

  // Restore embedded media blobs under new IDs so imported assets never collide.
  const refRemap = new Map<string, string>();
  for (const [oldRef, dataUrl] of Object.entries(embeddedMedia)) {
    const newAssetId = createId();
    const blob = dataUrlToBlob(dataUrl);
    const nextRef = await saveOriginalMediaBlob(newAssetId, blob);
    refRemap.set(oldRef, nextRef);
  }

  const remapSrc = (src: string | undefined): string => {
    if (!src) return "";
    return refRemap.get(src) ?? src;
  };

  const cloned = structuredClone(rawProject);
  const importedProject: Project = migrateProject({
    ...cloned,
    id: createId(),
    mediaLibrary: cloned.mediaLibrary?.map((asset) => ({
      ...asset,
      id: createId(),
      src: remapSrc(asset.src),
    })),
    pages: cloned.pages.map((page) => ({
      ...page,
      background:
        page.background && page.background.imageSrc
          ? {
              ...page.background,
              imageSrc: remapSrc(page.background.imageSrc),
            }
          : page.background,
      elements: page.elements.map((el) => {
        if (el.type === "image") {
          return { ...el, src: remapSrc(el.src) };
        }
        if (el.type === "sticker" && el.src) {
          return { ...el, src: remapSrc(el.src) };
        }
        return el;
      }),
    })),
  });

  return saveProjectDocument(importedProject, 0);
}
