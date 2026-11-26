"use client";

import { useEffect, useRef, useState } from "react";
import { RotateCcw } from "lucide-react";
import type { Page, Project } from "@/types";
import type { Spread } from "@/lib/spreads";
import { getEditablePageCount } from "@/lib/spreads";
import { getSpineWidth } from "@/lib/binding";
import { getBackground } from "@/lib/backgrounds";
import { PageView } from "@/components/editor/canvas/PageView";
import { cn } from "@/lib/cn";

interface Book3DPreviewProps {
  project: Project;
  spread: Spread;
  spreads: Spread[];
  spreadIndex: number;
  containerWidth: number;
  containerHeight: number;
  onPrevSpread: () => void;
  onNextSpread: () => void;
}

const DEFAULT_COVER_ANGLES = { x: -8, y: -26 };
const DEFAULT_OPEN_ANGLES = { x: 14, y: 0 };

/**
 * Interactive 3D book preview driven by the exact same `getSpreads()` output
 * as the canvas, thumbnails and PDF export.
 */
export function Book3DPreview({
  project,
  spread,
  spreads,
  spreadIndex,
  containerWidth,
  containerHeight,
  onPrevSpread,
  onNextSpread,
}: Book3DPreviewProps) {
  const { pageSize, pages } = project;
  const isCover = spread.isCover;

  const [angles, setAngles] = useState(
    isCover ? DEFAULT_COVER_ANGLES : DEFAULT_OPEN_ANGLES,
  );
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    baseX: number;
    baseY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    setAngles(isCover ? DEFAULT_COVER_ANGLES : DEFAULT_OPEN_ANGLES);
  }, [isCover]);

  const editableCount = getEditablePageCount(pages);
  const physicalSpineMm = getSpineWidth(pageSize.binding, editableCount);
  // Give thin books a minimal visible block edge in 3D so the book reads as a physical object.
  const visualDepthMm = Math.max(4, physicalSpineMm);

  const scale =
    containerWidth > 0 && containerHeight > 0
      ? isCover
        ? Math.min(
            (containerWidth - 140) / (pageSize.w * 1.35),
            (containerHeight - 130) / (pageSize.h * 1.15),
          )
        : Math.min(
            (containerWidth - 120) / (pageSize.w * 2.15),
            (containerHeight - 130) / (pageSize.h * 1.18),
          )
      : 0;

  if (scale <= 0) return null;

  const pageW = pageSize.w * scale;
  const pageH = pageSize.h * scale;
  const depthPx = Math.max(6, Math.min(44, visualDepthMm * scale));

  const coverPages = (spreads[0]?.pageIndices ?? [])
    .map((index) => pages[index])
    .filter((page): page is Page => Boolean(page));
  const backCover =
    coverPages.find((page) => page.coverSide === "back") ?? coverPages[0];
  const frontCover =
    coverPages.find((page) => page.coverSide === "front") ?? coverPages[1];
  const coverColor = backCover
    ? getBackground(backCover.backgroundId).baseColor
    : "#122056";

  const leftPage = pages[spread.pageIndices[0] ?? -1];
  const rightPage = pages[spread.pageIndices[1] ?? -1];

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return;
    dragRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      baseX: angles.x,
      baseY: angles.y,
      moved: false,
    };
    setDragging(true);
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    const dx = event.clientX - state.startX;
    const dy = event.clientY - state.startY;
    if (Math.hypot(dx, dy) > 4) state.moved = true;

    const nextY = state.baseY + dx * 0.45;
    const nextX = Math.max(-45, Math.min(45, state.baseX - dy * 0.35));
    setAngles({ x: nextX, y: nextY });
  };

  const handlePointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    const state = dragRef.current;
    if (!state || state.pointerId !== event.pointerId) return;
    dragRef.current = null;
    setDragging(false);
    event.currentTarget.releasePointerCapture?.(event.pointerId);
  };

  const interiorProgress =
    spreads.length > 2 ? (spreadIndex - 1) / (spreads.length - 2) : 0.5;
  const leftStackPx = Math.max(2, Math.round(depthPx * interiorProgress));
  const rightStackPx = Math.max(2, Math.round(depthPx * (1 - interiorProgress)));

  return (
    <div
      className={cn(
        "relative flex h-full w-full select-none items-center justify-center overflow-hidden",
        dragging ? "cursor-grabbing" : "cursor-grab",
      )}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerCancel={handlePointerUp}
      style={{ perspective: 1800 }}
    >
      {isCover && frontCover && backCover ? (
        <div
          className={cn(
            "relative",
            !dragging && "transition-transform duration-300 ease-out-soft",
          )}
          style={{
            width: pageW,
            height: pageH,
            transformStyle: "preserve-3d",
            transform: `rotateX(${angles.x}deg) rotateY(${angles.y}deg)`,
          }}
        >
          {/* Front cover */}
          <div
            className="absolute inset-0 overflow-hidden rounded-r-[3px] shadow-2xl"
            style={{
              transform: `translateZ(${depthPx / 2}px)`,
              backfaceVisibility: "hidden",
            }}
          >
            <PageView
              page={frontCover}
              pageSize={pageSize}
              scale={scale}
              decorative
            />
          </div>

          {/* Back cover */}
          <div
            className="absolute inset-0 overflow-hidden rounded-l-[3px] shadow-2xl"
            style={{
              transform: `rotateY(180deg) translateZ(${depthPx / 2}px)`,
              backfaceVisibility: "hidden",
            }}
          >
            <PageView
              page={backCover}
              pageSize={pageSize}
              scale={scale}
              decorative
            />
          </div>

          {/* Spine */}
          <div
            className="absolute left-0 top-0 flex items-center justify-center overflow-hidden border-y border-white/10"
            style={{
              width: depthPx,
              height: pageH,
              backgroundColor: coverColor,
              backgroundImage:
                "linear-gradient(to right, rgba(0,0,0,0.28), rgba(255,255,255,0.08) 50%, rgba(0,0,0,0.28))",
              transform: `translateX(${-depthPx / 2}px) rotateY(-90deg)`,
            }}
          >
            {depthPx >= 14 && (project.spineText ?? project.name) ? (
              <span
                className="truncate whitespace-nowrap text-[9px] font-semibold uppercase tracking-[0.22em] text-white/70"
                style={{
                  writingMode: "vertical-rl",
                  transform: "rotate(180deg)",
                  maxHeight: pageH * 0.8,
                }}
              >
                {project.spineText ?? project.name}
              </span>
            ) : null}
          </div>

          {/* Fore-edge paper block */}
          <div
            className="absolute right-0 top-[2px]"
            style={{
              width: depthPx - 2,
              height: pageH - 4,
              backgroundColor: "#f3f4fa",
              backgroundImage:
                "repeating-linear-gradient(to right, rgba(18,32,86,0.08) 0px, rgba(18,32,86,0.08) 1px, transparent 1px, transparent 3px)",
              transform: `translateX(${(depthPx - 2) / 2}px) rotateY(90deg)`,
            }}
          />

          {/* Top paper block */}
          <div
            className="absolute left-[1px] top-0"
            style={{
              width: pageW - 2,
              height: depthPx - 2,
              backgroundColor: "#eceef7",
              transform: `translateY(${-(depthPx - 2) / 2}px) rotateX(90deg)`,
            }}
          />

          {/* Bottom paper block */}
          <div
            className="absolute bottom-0 left-[1px]"
            style={{
              width: pageW - 2,
              height: depthPx - 2,
              backgroundColor: "#e2e5f2",
              transform: `translateY(${(depthPx - 2) / 2}px) rotateX(-90deg)`,
            }}
          />
        </div>
      ) : (
        <div
          className={cn(
            "relative flex items-center justify-center",
            !dragging && "transition-transform duration-300 ease-out-soft",
          )}
          style={{
            width: pageW * 2,
            height: pageH,
            transformStyle: "preserve-3d",
            transform: `rotateX(${angles.x}deg) rotateY(${angles.y}deg)`,
          }}
        >
          {/* Hardcover/backboard base beneath the open block */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -inset-x-[4px] -inset-y-[3px] rounded-[4px] shadow-2xl"
            style={{
              backgroundColor: coverColor,
              transform: `translateZ(${-Math.max(leftStackPx, rightStackPx) - 3}px)`,
            }}
          />

          {/* Left half */}
          <div
            className="relative shrink-0"
            onClick={() => {
              if (!dragRef.current?.moved && spreadIndex > 0) onPrevSpread();
            }}
            style={{
              width: pageW,
              height: pageH,
              transformOrigin: "right center",
              transform: "rotateY(7deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-[2px] left-0 w-full rounded-l-[2px]"
              style={{
                backgroundColor: "#e3e6f2",
                transform: `translateZ(${-leftStackPx}px)`,
                boxShadow: `-4px 0 ${leftStackPx}px rgba(0,0,0,0.28)`,
              }}
            />
            {leftPage ? (
              <div className="relative h-full w-full overflow-hidden rounded-l-[2px]">
                <PageView
                  page={leftPage}
                  pageSize={pageSize}
                  scale={scale}
                  decorative
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 right-0 w-10 bg-gradient-to-l from-black/20 to-transparent"
                />
              </div>
            ) : null}
          </div>

          {/* Right half (page or faded blank/end-paper half) */}
          <div
            className="relative shrink-0"
            onClick={() => {
              if (!dragRef.current?.moved && spreadIndex < spreads.length - 1) {
                onNextSpread();
              }
            }}
            style={{
              width: pageW,
              height: pageH,
              transformOrigin: "left center",
              transform: "rotateY(-7deg)",
              transformStyle: "preserve-3d",
            }}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-[2px] right-0 w-full rounded-r-[2px]"
              style={{
                backgroundColor: "#e3e6f2",
                transform: `translateZ(${-rightStackPx}px)`,
                boxShadow: `4px 0 ${rightStackPx}px rgba(0,0,0,0.28)`,
              }}
            />
            {rightPage ? (
              <div className="relative h-full w-full overflow-hidden rounded-r-[2px]">
                <PageView
                  page={rightPage}
                  pageSize={pageSize}
                  scale={scale}
                  decorative
                />
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 left-0 w-10 bg-gradient-to-r from-black/20 to-transparent"
                />
              </div>
            ) : (
              <div
                aria-hidden="true"
                className="h-full w-full rounded-r-[2px] border border-dashed border-white/15 bg-[#262A3C]/35"
              />
            )}
          </div>
        </div>
      )}

      {/* Quick angle presets */}
      <div
        className="absolute bottom-10 right-5 flex items-center gap-1 rounded-full border border-white/10 bg-black/50 p-1 text-[10px] text-white/80 backdrop-blur"
        onPointerDown={(event) => event.stopPropagation()}
      >
        {isCover ? (
          <>
            <button
              type="button"
              onClick={() => setAngles({ x: -4, y: 0 })}
              className="rounded-full px-2 py-1 hover:bg-white/10"
            >
              Front
            </button>
            <button
              type="button"
              onClick={() => setAngles({ x: -6, y: 72 })}
              className="rounded-full px-2 py-1 hover:bg-white/10"
            >
              Spine
            </button>
            <button
              type="button"
              onClick={() => setAngles({ x: -4, y: 180 })}
              className="rounded-full px-2 py-1 hover:bg-white/10"
            >
              Back
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => setAngles({ x: 0, y: 0 })}
            className="rounded-full px-2 py-1 hover:bg-white/10"
          >
            Flat
          </button>
        )}
        <button
          type="button"
          onClick={() =>
            setAngles(isCover ? DEFAULT_COVER_ANGLES : DEFAULT_OPEN_ANGLES)
          }
          aria-label="Reset 3D angle"
          className="inline-flex items-center gap-1 rounded-full px-2 py-1 hover:bg-white/10"
        >
          <RotateCcw className="size-3" aria-hidden="true" />
          Reset
        </button>
      </div>
    </div>
  );
}
