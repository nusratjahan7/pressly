"use client";

import { useEffect, useState } from "react";
import { resolveMediaUrl } from "@/lib/mediaStorage";

interface LoadedImage {
  image: HTMLImageElement;
  status: "loaded";
}

interface PendingImage {
  image: null;
  status: "loading" | "error";
}

export type ImageResult = LoadedImage | PendingImage;

const MAX_ENTRIES = 48;
const cache = new Map<string, ImageResult>();
const listeners = new Map<string, Set<() => void>>();
const loading = new Set<string>();

function publish(src: string, result: ImageResult) {
  cache.set(src, result);
  listeners.get(src)?.forEach((notify) => notify());
}

function evictIfNeeded() {
  while (cache.size > MAX_ENTRIES) {
    const oldest = cache.keys().next().value;
    if (oldest === undefined) break;
    const entry = cache.get(oldest);
    if (entry?.status === "loading") break;
    cache.delete(oldest);
    listeners.delete(oldest);
  }
}

function startLoad(src: string) {
  if (cache.has(src) || loading.has(src)) return;
  if (typeof window === "undefined") return;
  loading.add(src);

  void resolveMediaUrl(src)
    .then((resolvedUrl) => {
      if (!resolvedUrl) {
        loading.delete(src);
        publish(src, { image: null, status: "error" });
        return;
      }
      const image = new window.Image();
      if (/^https?:\/\//i.test(resolvedUrl)) {
        image.crossOrigin = "anonymous";
      }
      image.decoding = "async";
      image.onload = () => {
        loading.delete(src);
        publish(src, { image, status: "loaded" });
        evictIfNeeded();
      };
      image.onerror = () => {
        loading.delete(src);
        publish(src, { image: null, status: "error" });
      };
      image.src = resolvedUrl;
    })
    .catch(() => {
      loading.delete(src);
      publish(src, { image: null, status: "error" });
    });
}

/**
 * Loads and caches an image element by source. Shared across every node so a
 * 40+ page document holds each distinct image once.
 */
export function useHtmlImage(src: string): ImageResult {
  const [result, setResult] = useState<ImageResult>(() => {
    if (!src) return { image: null, status: "error" };
    return cache.get(src) ?? { image: null, status: "loading" };
  });

  useEffect(() => {
    if (!src) {
      setResult({ image: null, status: "error" });
      return;
    }

    const cached = cache.get(src);
    if (cached?.status === "loaded") {
      setResult(cached);
      return;
    }

    if (cached?.status === "error") {
      setResult(cached);
      return;
    }

    setResult({ image: null, status: "loading" });
    const notify = () => {
      const next = cache.get(src);
      if (next) setResult(next);
    };
    const set = listeners.get(src) ?? new Set<() => void>();
    set.add(notify);
    listeners.set(src, set);
    startLoad(src);

    return () => {
      set.delete(notify);
      if (set.size === 0) listeners.delete(src);
    };
  }, [src]);

  return result;
}
