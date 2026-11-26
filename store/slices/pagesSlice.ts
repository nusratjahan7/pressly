import type { StateCreator } from "zustand";
import type { EditorStore, PagesSlice } from "@/store/types";
import type { ImageElement, MediaAsset, Page, TextElement } from "@/types";
import { createPage } from "@/lib/project";
import { createId } from "@/lib/id";
import { canAddSpread, getBinding } from "@/lib/binding";
import {
  buildPageLayoutElements,
  buildSpreadLayoutElements,
  computeFrameRectMm,
  DEFAULT_FRAME_GAP_MM,
  getLayoutById,
  type ReflowPhoto,
} from "@/lib/layouts";
import { useToastStore } from "@/store/toasts";
import {
  clampSpreadIndex,
  COVER_PAGE_COUNT,
  getEditablePageCount,
  getShortSpreadLabel,
  getSpreadIndexForPage,
  getSpreads,
} from "@/lib/spreads";

export const createPagesSlice: StateCreator<
  EditorStore,
  [],
  [],
  PagesSlice
> = (set, get) => ({
  addSpread: () => {
    const state = get();
    const pages = state.project.pages;
    const editable = getEditablePageCount(pages);
    if (!canAddSpread(state.project.pageSize.binding, editable)) {
      useToastStore.getState().pushToast({
        message: `Page limit reached for ${getBinding(state.project.pageSize.binding).name}.`,
      });
      return;
    }

    // New content pages go immediately before the final spread so the inside
    // back end paper stays glued to the end of the book.
    const spreads = getSpreads(pages);
    const lastSpread = spreads[spreads.length - 1];
    const lastContentBoundary =
      lastSpread && !lastSpread.isCover && !lastSpread.isFirstContent
        ? lastSpread.pageIndices[0]!
        : pages[pages.length - 1]?.isEndPaper
          ? pages.length - 1
          : pages.length;
    const insertAt = Math.max(COVER_PAGE_COUNT + 1, lastContentBoundary);
    const newPages: Page[] = [createPage("paper"), createPage("paper")];

    get().pushHistory();
    const nextPages = [
      ...pages.slice(0, insertAt),
      ...newPages,
      ...pages.slice(insertAt),
    ];
    set((current) => ({
      project: { ...current.project, pages: nextPages },
      selection: { pageId: null, elementId: null, elementIds: [], spineSelected: false },
      ui: {
        ...current.ui,
        spreadIndex: getSpreadIndexForPage(insertAt),
      },
    }));
  },

  duplicateSpread: () => {
    const state = get();
    const spreads = getSpreads(state.project.pages);
    const spread = spreads[state.ui.spreadIndex];
    // The cover, the first spread (end paper + page 1) and the final spread
    // (last page + end paper) are structural and cannot be duplicated.
    if (!spread || spread.isCover || spread.isFirstContent || spread.isLast) {
      return;
    }

    const editable = getEditablePageCount(state.project.pages);
    if (!canAddSpread(state.project.pageSize.binding, editable)) {
      useToastStore.getState().pushToast({
        message: `Page limit reached for ${getBinding(state.project.pageSize.binding).name}.`,
      });
      return;
    }

    const sourcePages = spread.pageIndices
      .map((index) => state.project.pages[index])
      .filter((page): page is Page => Boolean(page));

    const clones: Page[] = sourcePages.map((page) => ({
      ...page,
      id: createId(),
      elements: page.elements.map((element) => ({
        ...structuredClone(element),
        id: createId(),
      })),
    }));

    const insertAt = spread.pageIndices[spread.pageIndices.length - 1] + 1;
    const nextPages = [
      ...state.project.pages.slice(0, insertAt),
      ...clones,
      ...state.project.pages.slice(insertAt),
    ];

    get().pushHistory();
    set((current) => ({
      project: { ...current.project, pages: nextPages },
      selection: { pageId: null, elementId: null, elementIds: [], spineSelected: false },
      ui: {
        ...current.ui,
        spreadIndex: getSpreadIndexForPage(insertAt),
      },
    }));
  },

  removeSpread: () => {
    const state = get();
    const spreads = getSpreads(state.project.pages);
    const spread = spreads[state.ui.spreadIndex];
    if (!spread || spread.isCover || spread.isFirstContent || spread.isLast) {
      return;
    }

    const editable = getEditablePageCount(state.project.pages);
    if (!canAddSpread(state.project.pageSize.binding, editable)) {
      useToastStore.getState().pushToast({
        message: `Page limit reached for ${getBinding(state.project.pageSize.binding).name}.`,
      });
      return;
    }

    get().pushHistory();
    const removeSet = new Set(spread.pageIndices);
    const nextPages = state.project.pages.filter(
      (_, index) => !removeSet.has(index),
    );

    set((current) => ({
      project: { ...current.project, pages: nextPages },
      selection: { pageId: null, elementId: null, elementIds: [], spineSelected: false },
      ui: {
        ...current.ui,
        spreadIndex: clampSpreadIndex(current.ui.spreadIndex, nextPages),
      },
    }));

    const label = getShortSpreadLabel(spread, state.project.pages);
    useToastStore.getState().pushToast({
      message: `${label} removed`,
      action: { label: "Undo", onAct: () => get().undo() },
    });
  },

  moveSpread: (fromIndex, toIndex) => {
    const state = get();
    const spreads = getSpreads(state.project.pages);
    if (fromIndex === toIndex) return;

    const source = spreads[fromIndex];
    const target = spreads[toIndex];
    if (!source || !target) return;
    // Structural spreads stay put: cover, first spread and final spread.
    if (
      source.isCover ||
      source.isFirstContent ||
      source.isLast ||
      target.isCover ||
      target.isFirstContent ||
      target.isLast
    ) {
      return;
    }

    const pages = state.project.pages;
    const moving = source.pageIndices.map((index) => pages[index]!);
    const withoutMoving = pages.filter((_, index) => !source.pageIndices.includes(index));

    // Recompute the insertion point against the reduced array.
    let insertAt: number;
    if (toIndex < fromIndex) {
      insertAt = target.pageIndices[0]!;
    } else {
      insertAt = target.pageIndices[target.pageIndices.length - 1]! + 1;
    }
    const minInsert = COVER_PAGE_COUNT + 2;
    const maxInsert = Math.max(minInsert, withoutMoving.length - 2);
    insertAt = Math.max(minInsert, Math.min(insertAt, maxInsert));

    const nextPages = [
      ...withoutMoving.slice(0, insertAt),
      ...moving,
      ...withoutMoving.slice(insertAt),
    ];

    get().pushHistory();
    set((current) => ({
      project: { ...current.project, pages: nextPages },
      selection: { pageId: null, elementId: null, elementIds: [], spineSelected: false },
      ui: {
        ...current.ui,
        spreadIndex: getSpreadIndexForPage(insertAt),
      },
    }));
  },

  goToSpread: (index) => {
    const state = get();
    const next = clampSpreadIndex(index, state.project.pages);
    if (next === state.ui.spreadIndex) return;
    set((current) => ({
      ui: { ...current.ui, spreadIndex: next },
      selection: { pageId: null, elementId: null, elementIds: [], spineSelected: false },
    }));
  },

  nextSpread: () => {
    get().goToSpread(get().ui.spreadIndex + 1);
  },

  prevSpread: () => {
    get().goToSpread(get().ui.spreadIndex - 1);
  },

  setPageBackground: (pageId, backgroundId, options) => {
    const page = get().project.pages.find((candidate) => candidate.id === pageId);
    if (!page || page.isEndPaper || page.locked || page.backgroundId === backgroundId) {
      return;
    }
    if (options?.commit !== false) get().pushHistory();
    set((state) => ({
      project: {
        ...state.project,
        pages: state.project.pages.map((candidate) =>
          candidate.id === pageId
            ? { ...candidate, backgroundId }
            : candidate,
        ),
      },
    }));
  },

  applyPageTemplate: (pageId, template) => {
    const state = get();
    const page = state.project.pages.find((candidate) => candidate.id === pageId);
    if (!page || page.isEndPaper || page.locked) return;

    const elements = template.build({
      projectName: state.project.name,
      pageSize: state.project.pageSize,
    });

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((candidate) =>
          candidate.id === pageId
            ? {
                ...candidate,
                backgroundId: template.backgroundId,
                elements,
                layoutMeta: undefined,
              }
            : candidate,
        ),
      },
      selection: { pageId, elementId: null, elementIds: [], spineSelected: false },
    }));
  },

  applyLayout: (pageId, layout, options) => {
    const state = get();
    const pages = state.project.pages;
    const pageIndex = pages.findIndex((candidate) => candidate.id === pageId);
    if (pageIndex < 0) return;
    const targetPage = pages[pageIndex]!;
    if (targetPage.isEndPaper || targetPage.locked) return;

    const spreads = getSpreads(pages);
    const spread = spreads.find((s) => s.pageIndices.includes(pageIndex));
    const pageSize = state.project.pageSize;

    const mergeMediaLibrary = (
      existingLib: MediaAsset[] | undefined,
      photos: ReflowPhoto[],
    ): MediaAsset[] => {
      const lib = [...(existingLib ?? [])];
      const seen = new Set(lib.map((item) => item.src));
      for (const p of photos) {
        if (!p.src || seen.has(p.src)) continue;
        seen.add(p.src);
        lib.push({ id: createId(), src: p.src, alt: p.alt });
      }
      return lib;
    };

    const collectPhotos = (pageList: Page[]): ReflowPhoto[] =>
      pageList
        .flatMap((p) => p.elements)
        .filter((el): el is ImageElement => el.type === "image" && Boolean(el.src))
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .map((el) => ({
          src: el.src,
          alt: el.alt,
          fit: el.fit,
          cropScale: el.cropScale,
          cropX: el.cropX,
          cropY: el.cropY,
        }));

    const collectTexts = (pageList: Page[]): string[] =>
      pageList
        .flatMap((p) => p.elements)
        .filter(
          (el): el is TextElement =>
            el.type === "text" &&
            !el.isPlaceholder &&
            el.text.trim().length > 0,
        )
        .map((el) => el.text);

    if (layout.scope === "spread" && spread && spread.pageIndices.length === 2) {
      const leftIdx = spread.pageIndices[0]!;
      const rightIdx = spread.pageIndices[1]!;
      const leftPage = pages[leftIdx]!;
      const rightPage = pages[rightIdx]!;

      if (!leftPage.isEndPaper && !leftPage.locked && !rightPage.isEndPaper && !rightPage.locked) {
        const gapMm = options?.gapMm ?? leftPage.layoutMeta?.gapMm ?? DEFAULT_FRAME_GAP_MM;
        const marginMm = options?.marginMm ?? leftPage.layoutMeta?.marginMm ?? pageSize.safeMargin;
        const photos = collectPhotos([leftPage, rightPage]);
        const texts = collectTexts([leftPage, rightPage]);
        const { left, right } = buildSpreadLayoutElements(
          layout,
          pageSize,
          gapMm,
          marginMm,
          photos,
          texts,
        );

        get().pushHistory();
        const nextMedia = mergeMediaLibrary(state.project.mediaLibrary, photos);
        set((current) => ({
          project: {
            ...current.project,
            mediaLibrary: nextMedia,
            pages: current.project.pages.map((candidate) => {
              if (candidate.id === leftPage.id) {
                return {
                  ...candidate,
                  elements: left,
                  layoutMeta: { layoutId: layout.id, gapMm, marginMm },
                };
              }
              if (candidate.id === rightPage.id) {
                return {
                  ...candidate,
                  elements: right,
                  layoutMeta: { layoutId: layout.id, gapMm, marginMm },
                };
              }
              return candidate;
            }),
          },
          selection: { pageId, elementId: null, elementIds: [], spineSelected: false },
          ui: {
            ...current.ui,
            layoutAnimSeq: current.ui.layoutAnimSeq + 1,
            layoutAnimPageIds: [leftPage.id, rightPage.id],
          },
        }));
        return;
      }
    }

    const gapMm = options?.gapMm ?? targetPage.layoutMeta?.gapMm ?? DEFAULT_FRAME_GAP_MM;
    const marginMm = options?.marginMm ?? targetPage.layoutMeta?.marginMm ?? pageSize.safeMargin;
    const photos = collectPhotos([targetPage]);
    const texts = collectTexts([targetPage]);
    const nextElements = buildPageLayoutElements(
      layout,
      pageSize,
      gapMm,
      marginMm,
      photos,
      texts,
    );

    get().pushHistory();
    const nextMedia = mergeMediaLibrary(state.project.mediaLibrary, photos);
    set((current) => ({
      project: {
        ...current.project,
        mediaLibrary: nextMedia,
        pages: current.project.pages.map((candidate) =>
          candidate.id === pageId
            ? {
                ...candidate,
                elements: nextElements,
                layoutMeta: { layoutId: layout.id, gapMm, marginMm },
              }
            : candidate,
        ),
      },
      selection: { pageId, elementId: null, elementIds: [], spineSelected: false },
      ui: {
        ...current.ui,
        layoutAnimSeq: current.ui.layoutAnimSeq + 1,
        layoutAnimPageIds: [pageId],
      },
    }));
  },

  updatePageLayoutSpacing: (pageId, patch, options) => {
    const state = get();
    const page = state.project.pages.find((candidate) => candidate.id === pageId);
    if (!page || page.isEndPaper || page.locked || !page.layoutMeta) return;

    const layout = getLayoutById(page.layoutMeta.layoutId);
    if (!layout) return;

    const nextGap = patch.gapMm ?? page.layoutMeta.gapMm;
    const nextMargin = patch.marginMm ?? page.layoutMeta.marginMm;
    if (
      Math.abs(nextGap - page.layoutMeta.gapMm) < 0.01 &&
      Math.abs(nextMargin - page.layoutMeta.marginMm) < 0.01
    ) {
      return;
    }

    if (options?.commit !== false) get().pushHistory();

    const pageSize = state.project.pageSize;
    if (layout.scope === "page") {
      const ordered = [...page.elements].sort((a, b) => a.zIndex - b.zIndex);
      const nextElements = ordered.map((element, index) => {
        const frame = layout.frames[index];
        if (!frame) return element;
        const rect = computeFrameRectMm(
          frame,
          pageSize.w,
          pageSize.h,
          nextGap,
          nextMargin,
        );
        return { ...element, ...rect };
      });

      set((current) => ({
        project: {
          ...current.project,
          pages: current.project.pages.map((candidate) =>
            candidate.id === pageId
              ? {
                  ...candidate,
                  elements: nextElements,
                  layoutMeta: {
                    ...page.layoutMeta!,
                    gapMm: nextGap,
                    marginMm: nextMargin,
                  },
                }
              : candidate,
          ),
        },
      }));
    } else {
      // Spread layout: update metadata and reflow keeping existing content.
      const spread = getSpreads(state.project.pages).find((s) =>
        s.pageIndices.some((idx) => state.project.pages[idx]?.id === pageId),
      );
      if (!spread || spread.pageIndices.length < 2) return;
      const leftPage = state.project.pages[spread.pageIndices[0]!]!;
      const rightPage = state.project.pages[spread.pageIndices[1]!]!;
      const existingPhotos: ReflowPhoto[] = [...leftPage.elements, ...rightPage.elements]
        .filter((el): el is ImageElement => el.type === "image" && Boolean(el.src))
        .sort((a, b) => b.width * b.height - a.width * a.height)
        .map((el) => ({
          src: el.src,
          alt: el.alt,
          fit: el.fit,
          cropScale: el.cropScale,
          cropX: el.cropX,
          cropY: el.cropY,
        }));
      const existingTexts = [...leftPage.elements, ...rightPage.elements]
        .filter(
          (el): el is TextElement =>
            el.type === "text" && !el.isPlaceholder && el.text.trim().length > 0,
        )
        .map((el) => el.text);
      const { left, right } = buildSpreadLayoutElements(
        layout,
        pageSize,
        nextGap,
        nextMargin,
        existingPhotos,
        existingTexts,
      );
      set((current) => ({
        project: {
          ...current.project,
          pages: current.project.pages.map((candidate) => {
            if (candidate.id === leftPage.id) {
              return {
                ...candidate,
                elements: left,
                layoutMeta: { layoutId: layout.id, gapMm: nextGap, marginMm: nextMargin },
              };
            }
            if (candidate.id === rightPage.id) {
              return {
                ...candidate,
                elements: right,
                layoutMeta: { layoutId: layout.id, gapMm: nextGap, marginMm: nextMargin },
              };
            }
            return candidate;
          }),
        },
      }));
    }
  },

  autofillUnusedPhotos: () => {
    const state = get();
    const pages = state.project.pages;
    const library = state.project.mediaLibrary ?? [];

    const usedSrcs = new Set<string>();
    for (const p of pages) {
      for (const el of p.elements) {
        if (el.type === "image" && el.src) usedSrcs.add(el.src);
      }
    }

    const unused = library.filter((asset) => asset.src && !usedSrcs.has(asset.src));
    if (unused.length === 0) {
      useToastStore.getState().pushToast({
        message: "No unused photos to autofill.",
      });
      return 0;
    }

    // Walk editable pages in spread order, filling empty frames largest-first.
    const emptyTargets: Array<{ pageId: string; elementId: string }> = [];
    const spreads = getSpreads(pages);
    for (const spread of spreads) {
      for (const pageIndex of spread.pageIndices) {
        const page = pages[pageIndex];
        if (!page || page.isEndPaper || page.locked) continue;
        const frames = page.elements
          .filter((el): el is ImageElement => el.type === "image" && !el.src)
          .sort((a, b) => b.width * b.height - a.width * a.height);
        for (const frame of frames) {
          emptyTargets.push({ pageId: page.id, elementId: frame.id });
        }
      }
    }

    if (emptyTargets.length === 0) {
      useToastStore.getState().pushToast({
        message: "No empty photo frames across pages. Apply a layout first.",
      });
      return 0;
    }

    const count = Math.min(unused.length, emptyTargets.length);
    const assignments = new Map<string, { src: string; alt: string }>();
    for (let i = 0; i < count; i += 1) {
      const target = emptyTargets[i]!;
      const asset = unused[i]!;
      assignments.set(target.elementId, { src: asset.src, alt: asset.alt });
    }

    get().pushHistory();
    set((current) => ({
      project: {
        ...current.project,
        pages: current.project.pages.map((page) => ({
          ...page,
          elements: page.elements.map((el) => {
            const photo = assignments.get(el.id);
            if (!photo || el.type !== "image") return el;
            return {
              ...el,
              src: photo.src,
              alt: photo.alt,
              fit: "cover",
              cropScale: 1,
              cropX: 0,
              cropY: 0,
            };
          }),
        })),
      },
    }));

    useToastStore.getState().pushToast({
      message: `Placed ${count} ${count === 1 ? "photo" : "photos"} into empty frames`,
      action: { label: "Undo", onAct: () => get().undo() },
    });
    return count;
  },
});
