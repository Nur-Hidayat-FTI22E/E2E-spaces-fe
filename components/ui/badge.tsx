import React from "react";

export type BadgeVariant =
  | "cyan"
  | "green"
  | "yellow"
  | "red"
  | "zinc"
  | "purple"
  | "blue";

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: BadgeVariant;
  showDot?: boolean;
  pulseDot?: boolean;
}

export function Badge({
  children,
  variant = "zinc",
  showDot = false,
  pulseDot = false,
  className = "",
  ...props
}: BadgeProps) {
  const variantStyles = {
    cyan: "bg-cyan-950/40 text-cyan-300 border-cyan-800/40",
    green: "bg-emerald-950/40 text-emerald-300 border-emerald-800/40",
    yellow: "bg-amber-950/40 text-amber-300 border-amber-800/40",
    red: "bg-rose-950/40 text-rose-300 border-rose-800/40",
    zinc: "bg-zinc-900 text-zinc-400 border-zinc-800",
    purple: "bg-purple-950/40 text-purple-300 border-purple-800/40",
    blue: "bg-blue-950/40 text-blue-300 border-blue-800/40",
  }[variant];

  const dotStyles = {
    cyan: "bg-cyan-400",
    green: "bg-emerald-400",
    yellow: "bg-amber-400",
    red: "bg-rose-400",
    zinc: "bg-zinc-500",
    purple: "bg-purple-400",
    blue: "bg-blue-400",
  }[variant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border font-mono tracking-tight ${variantStyles} ${className}`}
      {...props}
    >
      {showDot && (
        <span
          className={`w-1.5 h-1.5 rounded-full ${dotStyles} ${
            pulseDot ? "animate-ping opacity-75" : ""
          }`}
        />
      )}
      {children}
    </span>
  );
}
