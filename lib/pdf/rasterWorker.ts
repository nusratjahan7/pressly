"use client";

export interface RasterImageJob {
  targetWidth: number;
  targetHeight: number;
  drawX: number;
  drawY: number;
  drawWidth: number;
  drawHeight: number;
  flipX?: boolean;
  flipY?: boolean;
  radiusPx: number;
  filterStr: string;
  borderWidthPx: number;
  borderColor?: string;
  mime: "image/jpeg" | "image/png";
  quality: number;
}

const WORKER_SOURCE = `
self.onmessage = async (event) => {
  const { id, bitmap, job } = event.data;
  try {
    const canvas = new OffscreenCanvas(job.targetWidth, job.targetHeight);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("No 2d context");

    if (job.mime === "image/jpeg") {
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, job.targetWidth, job.targetHeight);
    }

    if (job.radiusPx > 0 && typeof ctx.roundRect === "function") {
      ctx.beginPath();
      ctx.roundRect(0, 0, job.targetWidth, job.targetHeight, job.radiusPx);
      ctx.clip();
    }

    ctx.save();
    if (job.filterStr) ctx.filter = job.filterStr;
    if (job.flipX || job.flipY) {
      ctx.translate(
        job.flipX ? job.targetWidth : 0,
        job.flipY ? job.targetHeight : 0,
      );
      ctx.scale(job.flipX ? -1 : 1, job.flipY ? -1 : 1);
    }
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(
      bitmap,
      job.drawX,
      job.drawY,
      job.drawWidth,
      job.drawHeight,
    );
    ctx.restore();

    if (
      job.borderWidthPx > 0 &&
      job.borderColor &&
      job.borderColor !== "transparent"
    ) {
      const bw = job.borderWidthPx;
      ctx.save();
      ctx.strokeStyle = job.borderColor;
      ctx.lineWidth = bw;
      if (job.radiusPx > 0 && typeof ctx.roundRect === "function") {
        ctx.beginPath();
        ctx.roundRect(
          bw / 2,
          bw / 2,
          job.targetWidth - bw,
          job.targetHeight - bw,
          job.radiusPx,
        );
        ctx.stroke();
      } else {
        ctx.strokeRect(
          bw / 2,
          bw / 2,
          job.targetWidth - bw,
          job.targetHeight - bw,
        );
      }
      ctx.restore();
    }

    const blob = await canvas.convertToBlob({
      type: job.mime,
      quality: job.quality,
    });
    const buffer = await blob.arrayBuffer();
    if (typeof bitmap.close === "function") bitmap.close();
    self.postMessage({ id, ok: true, buffer, mime: job.mime }, [buffer]);
  } catch (err) {
    try {
      if (bitmap && typeof bitmap.close === "function") bitmap.close();
    } catch {}
    self.postMessage({ id, ok: false, error: String(err) });
  }
};
`;

export interface WorkerRasterSession {
  rasterize: (
    image: HTMLImageElement,
    job: RasterImageJob,
    signal?: AbortSignal,
  ) => Promise<{ bytes: Uint8Array; mime: "image/jpeg" | "image/png" } | null>;
  dispose: () => void;
}

export function createWorkerRasterSession(): WorkerRasterSession | null {
  if (
    typeof window === "undefined" ||
    typeof Worker === "undefined" ||
    typeof OffscreenCanvas === "undefined" ||
    typeof createImageBitmap !== "function"
  ) {
    return null;
  }

  let worker: Worker;
  let blobUrl: string;
  try {
    const blob = new Blob([WORKER_SOURCE], { type: "application/javascript" });
    blobUrl = URL.createObjectURL(blob);
    worker = new Worker(blobUrl);
  } catch {
    return null;
  }

  let nextId = 1;
  const inflight = new Map<
    number,
    {
      resolve: (
        value: { bytes: Uint8Array; mime: "image/jpeg" | "image/png" } | null,
      ) => void;
    }
  >();

  worker.onmessage = (event) => {
    const { id, ok, buffer, mime } = event.data as {
      id: number;
      ok: boolean;
      buffer?: ArrayBuffer;
      mime?: "image/jpeg" | "image/png";
    };
    const entry = inflight.get(id);
    if (!entry) return;
    inflight.delete(id);
    if (!ok || !buffer) {
      entry.resolve(null);
      return;
    }
    entry.resolve({
      bytes: new Uint8Array(buffer),
      mime: mime === "image/jpeg" ? "image/jpeg" : "image/png",
    });
  };

  worker.onerror = () => {
    for (const [, entry] of inflight) entry.resolve(null);
    inflight.clear();
  };

  return {
    async rasterize(image, job, signal) {
      if (signal?.aborted) return null;
      let bitmap: ImageBitmap;
      try {
        bitmap = await createImageBitmap(image);
      } catch {
        return null;
      }
      if (signal?.aborted) {
        bitmap.close();
        return null;
      }

      const id = nextId++;
      return new Promise((resolve) => {
        const onAbort = () => {
          inflight.delete(id);
          resolve(null);
        };
        signal?.addEventListener("abort", onAbort, { once: true });
        inflight.set(id, {
          resolve: (val) => {
            signal?.removeEventListener("abort", onAbort);
            resolve(val);
          },
        });
        try {
          worker.postMessage({ id, bitmap, job }, [bitmap]);
        } catch {
          inflight.delete(id);
          signal?.removeEventListener("abort", onAbort);
          bitmap.close();
          resolve(null);
        }
      });
    },
    dispose() {
      for (const [, entry] of inflight) entry.resolve(null);
      inflight.clear();
      worker.terminate();
      URL.revokeObjectURL(blobUrl);
    },
  };
}
