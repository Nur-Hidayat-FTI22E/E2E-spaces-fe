"use client";

import React, { useEffect, useState } from "react";
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from "lucide-react";

export type ToastType = "success" | "error" | "info" | "warning";

export interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastProps {
  toast: ToastItem;
  onDismiss: (id: string) => void;
}

export function Toast({ toast, onDismiss }: ToastProps) {
  const [isExiting, setIsExiting] = useState(false);
  const duration = toast.duration || 4000;

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsExiting(true);
      setTimeout(() => onDismiss(toast.id), 250);
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, toast.id, onDismiss]);

  const handleManualDismiss = () => {
    setIsExiting(true);
    setTimeout(() => onDismiss(toast.id), 250);
  };

  const config = {
    success: {
      icon: CheckCircle2,
      border: "border-cyan-500/40",
      bg: "bg-zinc-950/95 border",
      text: "text-cyan-400",
      progress: "bg-cyan-500",
    },
    error: {
      icon: AlertCircle,
      border: "border-rose-500/40",
      bg: "bg-zinc-950/95 border",
      text: "text-rose-400",
      progress: "bg-rose-500",
    },
    warning: {
      icon: AlertTriangle,
      border: "border-zinc-700",
      bg: "bg-zinc-950/95 border",
      text: "text-zinc-300",
      progress: "bg-zinc-600",
    },
    info: {
      icon: Info,
      border: "border-cyan-500/40",
      bg: "bg-zinc-950/95 border",
      text: "text-cyan-400",
      progress: "bg-cyan-500",
    },
  }[toast.type];

  const Icon = config.icon;

  return (
    <div
      role="alert"
      className={`relative overflow-hidden rounded-xl ${config.border} ${config.bg} p-4 shadow-2xl backdrop-blur-md transition-all duration-300 w-80 sm:w-96 ${
        isExiting ? "opacity-0 translate-y-2 scale-95" : "opacity-100 translate-y-0 scale-100"
      }`}
    >
      <div className="flex items-start gap-3">
        <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${config.text}`} />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs font-semibold text-zinc-100 tracking-wide font-sans">
            {toast.title}
          </h4>
          {toast.message && (
            <p className="text-[11px] text-zinc-400 mt-0.5 leading-relaxed font-sans break-words">
              {toast.message}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={handleManualDismiss}
          className="text-zinc-500 hover:text-zinc-300 transition-colors shrink-0 p-0.5"
          aria-label="Dismiss notification"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Subtle Progress Bar */}
      <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-zinc-800/50">
        <div
          className={`h-full ${config.progress} transition-all`}
          style={{
            animation: `shrink ${duration}ms linear forwards`,
          }}
        />
      </div>
    </div>
  );
}
