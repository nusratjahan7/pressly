"use client";

import { createStore, del, get, set } from "idb-keyval";

const mediaStore = createStore("pressly", "media-originals");
const IDB_PREFIX = "idb:";

/** In-memory cache of resolved Object URLs for `idb:<id>` references. */
const objectUrlCache = new Map<string, string>();
const pendingUrlLookups = new Map<string, Promise<string>>();

export function makeMediaRef(assetId: string): string {
  return `${IDB_PREFIX}${assetId}`;
}

export function isMediaRef(src: string | undefined | null): boolean {
  return Boolean(src && src.startsWith(IDB_PREFIX));
}

export function extractAssetId(src: string): string | null {
  return isMediaRef(src) ? src.slice(IDB_PREFIX.length) : null;
}

/** Saves a full-resolution original image Blob in IndexedDB. */
export async function saveOriginalMediaBlob(
  assetId: string,
  blob: Blob,
): Promise<string> {
  await set(assetId, blob, mediaStore);
  const existing = objectUrlCache.get(assetId);
  if (existing) URL.revokeObjectURL(existing);
  const url = URL.createObjectURL(blob);
  objectUrlCache.set(assetId, url);
  return makeMediaRef(assetId);
}

/** Deletes an original Blob from IndexedDB and revokes any cached Object URL. */
export async function deleteOriginalMediaBlob(assetId: string): Promise<void> {
  const existing = objectUrlCache.get(assetId);
  if (existing) {
    URL.revokeObjectURL(existing);
    objectUrlCache.delete(assetId);
  }
  try {
    await del(assetId, mediaStore);
  } catch {
    /* ignore missing keys */
  }
}

/** Synchronous cache lookup for an `idb:` ref; returns null if not yet loaded. */
export function getCachedMediaUrl(src: string): string | null {
  if (!isMediaRef(src)) return src || null;
  const id = extractAssetId(src);
  if (!id) return null;
  return objectUrlCache.get(id) ?? null;
}

/**
 * Resolves any image source (`idb:<id>`, data URL, or HTTP URL) into a
 * browser-loadable URL for rendering, DPI measurement, and PDF export.
 */
export async function resolveMediaUrl(src: string): Promise<string> {
  if (!src) return "";
  if (!isMediaRef(src)) return src;
  const id = extractAssetId(src);
  if (!id) return "";

  const cached = objectUrlCache.get(id);
  if (cached) return cached;

  const inflight = pendingUrlLookups.get(id);
  if (inflight) return inflight;

  const task = (async () => {
    try {
      const blob = await get<Blob>(id, mediaStore);
      if (!blob) return "";
      const url = URL.createObjectURL(blob);
      objectUrlCache.set(id, url);
      return url;
    } catch {
      return "";
    } finally {
      pendingUrlLookups.delete(id);
    }
  })();

  pendingUrlLookups.set(id, task);
  return task;
}

/** Decodes an image Blob / File / URL into an HTMLImageElement. */
export function loadDecodedImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Unable to decode image"));
    img.src = src;
  });
}

/**
 * Generates a lightweight client-side thumbnail DataURL (max edge 320px) and
 * returns the natural dimensions of the original file.
 */
export async function generateClientThumbnail(
  blob: Blob,
  maxEdge = 320,
): Promise<{
  thumbSrc: string;
  width: number;
  height: number;
}> {
  const tempUrl = URL.createObjectURL(blob);
  try {
    const img = await loadDecodedImage(tempUrl);
    const width = img.naturalWidth || 1;
    const height = img.naturalHeight || 1;
    const scale = Math.min(1, maxEdge / Math.max(width, height));
    const tw = Math.max(1, Math.round(width * scale));
    const th = Math.max(1, Math.round(height * scale));

    const canvas = document.createElement("canvas");
    canvas.width = tw;
    canvas.height = th;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return { thumbSrc: tempUrl, width, height };
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(img, 0, 0, tw, th);

    const hasAlpha =
      blob.type === "image/png" || blob.type === "image/webp" || blob.type === "image/gif";
    const thumbSrc = canvas.toDataURL(
      hasAlpha ? "image/webp" : "image/jpeg",
      0.82,
    );
    return { thumbSrc, width, height };
  } finally {
    URL.revokeObjectURL(tempUrl);
  }
}

export interface ImageFilterParams {
  brightness?: number;
  contrast?: number;
  saturation?: number;
  grayscale?: number;
  blur?: number;
  flipX?: boolean;
  flipY?: boolean;
}

export function buildCssFilterString(params: ImageFilterParams): string {
  const b = params.brightness ?? 100;
  const c = params.contrast ?? 100;
  const s = params.saturation ?? 100;
  const g = params.grayscale ?? 0;
  const blur = params.blur ?? 0;

  const parts: string[] = [];
  if (Math.abs(b - 100) > 0.5) parts.push(`brightness(${b}%)`);
  if (Math.abs(c - 100) > 0.5) parts.push(`contrast(${c}%)`);
  if (Math.abs(s - 100) > 0.5) parts.push(`saturate(${s}%)`);
  if (g > 0.5) parts.push(`grayscale(${g}%)`);
  if (blur > 0.1) parts.push(`blur(${blur}px)`);
  return parts.join(" ");
}

export function hasNonDefaultFilters(params: ImageFilterParams): boolean {
  return buildCssFilterString(params).length > 0;
}
