"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
} from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import {
  buttonStyles,
  type ButtonSize,
  type ButtonVariant,
} from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";

export interface IconButtonProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children"> {
  icon: LucideIcon;
  label: string;
  tooltip?: string;
  shortcut?: string;
  variant?: ButtonVariant;
  size?: "sm" | "md";
  tooltipSide?: "top" | "bottom" | "left" | "right";
  iconClassName?: string;
}

const iconSizeClasses: Record<"sm" | "md", string> = {
  sm: "size-7 rounded-field",
  md: "size-8 rounded-field",
};

const buttonSizeMap: Record<"sm" | "md", ButtonSize> = {
  sm: "sm",
  md: "sm",
};

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  function IconButton(
    {
      icon: Icon,
      label,
      tooltip,
      shortcut,
      variant = "ghost",
      size = "md",
      tooltipSide = "top",
      className,
      iconClassName,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <Tooltip
        content={tooltip ?? label}
        shortcut={shortcut}
        side={tooltipSide}
      >
        <button
          ref={ref}
          type={type}
          aria-label={label}
          className={cn(
            buttonStyles({
              variant,
              size: buttonSizeMap[size],
            }),
            "px-0",
            iconSizeClasses[size],
            className,
          )}
          {...props}
        >
          <Icon
            className={cn(
              size === "sm" ? "size-3.5" : "size-4",
              iconClassName,
            )}
            aria-hidden="true"
          />
        </button>
      </Tooltip>
    );
  },
);
