import React from "react";

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: React.ReactNode;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ label, error, helperText, leftIcon, rightIcon, className = "", id, ...props }, ref) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, "-") : undefined);

    return (
      <div className="w-full flex flex-col gap-1.5">
        {label && (
          <label htmlFor={inputId} className="text-xs font-medium text-zinc-400">
            {label}
          </label>
        )}

        <div className="relative flex items-center">
          {leftIcon && (
            <div className="absolute left-3 text-zinc-500 flex items-center pointer-events-none">
              {leftIcon}
            </div>
          )}

          <input
            ref={ref}
            id={inputId}
            className={`w-full bg-zinc-900/40 text-zinc-100 text-sm placeholder:text-zinc-600 border rounded-lg transition-all duration-150 py-2 outline-none
              ${leftIcon ? "pl-9" : "pl-3.5"}
              ${rightIcon ? "pr-9" : "pr-3.5"}
              ${
                error
                  ? "border-red-500/70 focus:border-red-400 focus:ring-1 focus:ring-red-400/30"
                  : "border-white/[0.08] hover:border-white/[0.14] focus:border-cyan-400/60 focus:ring-1 focus:ring-cyan-400/20"
              }
              ${className}`}
            {...props}
          />

          {rightIcon && (
            <div className="absolute right-3 text-zinc-500 flex items-center">
              {rightIcon}
            </div>
          )}
        </div>

        {error && <p className="text-xs text-red-400 mt-0.5">{error}</p>}
        {!error && helperText && (
          <p className="text-xs text-zinc-500 mt-0.5">{helperText}</p>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";
