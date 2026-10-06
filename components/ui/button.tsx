import React from "react";
import { Loader2 } from "lucide-react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "outline" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      className = "",
      variant = "secondary",
      size = "md",
      isLoading = false,
      leftIcon,
      rightIcon,
      disabled,
      ...props
    },
    ref
  ) => {
    const baseStyles =
      "relative inline-flex flex-row items-center justify-center font-medium transition-all duration-150 rounded-lg select-none disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/50 whitespace-nowrap";

    const variantStyles = {
      primary:
        "bg-cyan-400 text-black hover:bg-cyan-300 shadow-[0_0_20px_-3px_rgba(0,210,255,0.4)] border border-cyan-300/40 font-semibold",
      secondary:
        "bg-zinc-900/90 text-zinc-200 border border-white/[0.08] hover:bg-zinc-800/90 hover:border-white/[0.15] hover:text-white",
      outline:
        "bg-transparent text-zinc-300 border border-white/[0.08] hover:border-white/[0.16] hover:text-white hover:bg-white/[0.04]",
      ghost:
        "bg-transparent text-zinc-400 hover:text-zinc-100 hover:bg-white/[0.04]",
      danger:
        "bg-red-950/40 text-red-400 border border-red-800/40 hover:bg-red-900/50 hover:border-red-700 hover:text-red-300",
    }[variant];

    const sizeStyles = {
      sm: "h-8 px-3 text-xs gap-1.5",
      md: "h-9.5 px-4 text-sm gap-2",
      lg: "h-11 px-6 text-base gap-2.5",
    }[size];

    return (
      <button
        ref={ref}
        disabled={disabled || isLoading}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {isLoading ? (
          <Loader2 className="w-4 h-4 animate-spin text-current" />
        ) : (
          leftIcon
        )}
        <span className="inline-flex flex-row items-center gap-1.5 whitespace-nowrap leading-none">
          {children}
        </span>
        {!isLoading && rightIcon}
      </button>
    );
  }
);

Button.displayName = "Button";
