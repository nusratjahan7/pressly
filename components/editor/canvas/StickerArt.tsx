import { Fragment } from "react";
import { getSticker } from "@/lib/stickers";
import { cn } from "@/lib/cn";

interface StickerArtProps {
  stickerId: string;
  color?: string;
  src?: string;
  name?: string;
  className?: string;
}

export function StickerArt({
  stickerId,
  color = "currentColor",
  src,
  name,
  className,
}: StickerArtProps) {
  const sticker = getSticker(stickerId);
  const resolvedSrc = src ?? sticker.src;

  if (resolvedSrc) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={resolvedSrc}
        alt={name ?? sticker.name}
        loading="lazy"
        decoding="async"
        className={cn("block h-full w-full object-contain", className)}
      />
    );
  }

  return (
    <svg
      viewBox={sticker.viewBox}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
      focusable="false"
      className={cn("block h-full w-full", className)}
      style={{ color }}
    >
      {sticker.paths.map((path, index) => (
        <Fragment key={index}>
          <path
            d={path.d}
            fill={
              path.fill === "currentColor"
                ? "currentColor"
                : path.fill ?? "none"
            }
            stroke={
              path.stroke === "currentColor"
                ? "currentColor"
                : path.stroke ?? "none"
            }
            strokeWidth={path.strokeWidth ?? 0}
            opacity={path.opacity}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Fragment>
      ))}
    </svg>
  );
}
