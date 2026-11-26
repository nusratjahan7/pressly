import { Fragment } from "react";
import { getSticker } from "@/lib/stickers";
import { cn } from "@/lib/cn";

interface StickerArtProps {
  stickerId: string;
  color?: string;
  className?: string;
}

export function StickerArt({
  stickerId,
  color = "currentColor",
  className,
}: StickerArtProps) {
  const sticker = getSticker(stickerId);
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
            fill={path.fill === "currentColor" ? "currentColor" : "none"}
            stroke={path.stroke === "currentColor" ? "currentColor" : "none"}
            strokeWidth={path.strokeWidth ?? 0}
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </Fragment>
      ))}
    </svg>
  );
}
