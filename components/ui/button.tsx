"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { Loader2, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "danger-ghost";
export type ButtonSize = "sm" | "md" | "lg";

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    "bg-accent text-accent-ink shadow-sm hover:bg-accent-strong active:translate-y-px",
  secondary:
    "border border-line-strong bg-surface text-ink shadow-sm hover:bg-surface-muted active:translate-y-px",
  ghost: "text-ink-muted hover:bg-surface-muted hover:text-ink",
  danger: "bg-danger text-white shadow-sm hover:opacity-90 active:translate-y-px",
  "danger-ghost": "text-danger hover:bg-danger-soft",
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: "h-8 gap-1.5 rounded-field px-2.5 text-[12px]",
  md: "h-9 gap-2 rounded-field px-3.5 text-[13px]",
  lg: "h-10 gap-2 rounded-ui px-5 text-sm",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  leadingIcon?: LucideIcon;
  trailingIcon?: LucideIcon;
  block?: boolean;
  children?: ReactNode;
}

export function buttonStyles({
  variant = "secondary",
  size = "md",
  block = false,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  block?: boolean;
}) {
  return cn(
    "inline-flex select-none items-center justify-center font-medium transition-[background-color,color,border-color,opacity,transform,box-shadow] duration-150 ease-out-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-surface disabled:pointer-events-none disabled:opacity-45",
    variantClasses[variant],
    sizeClasses[size],
    block && "w-full",
  );
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "secondary",
      size = "md",
      loading = false,
      leadingIcon: LeadingIcon,
      trailingIcon: TrailingIcon,
      block,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || loading}
        aria-busy={loading || undefined}
        className={cn(buttonStyles({ variant, size, block }), className)}
        {...props}
      >
        {loading ? (
          <Loader2 className="size-4 animate-spin" aria-hidden="true" />
        ) : LeadingIcon ? (
          <LeadingIcon className="size-4 shrink-0" aria-hidden="true" />
        ) : null}
        {children}
        {TrailingIcon && !loading ? (
          <TrailingIcon className="size-4 shrink-0" aria-hidden="true" />
        ) : null}
      </button>
    );
  },
);
