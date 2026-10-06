"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Toast, ToastItem, ToastType } from "@/components/ui/toast";

interface ToastOptions {
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  toasts: ToastItem[];
  showToast: (type: ToastType, title: string, options?: ToastOptions) => void;
  success: (title: string, options?: ToastOptions) => void;
  error: (title: string, options?: ToastOptions) => void;
  warning: (title: string, options?: ToastOptions) => void;
  info: (title: string, options?: ToastOptions) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, options?: ToastOptions) => {
      const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
      const newToast: ToastItem = {
        id,
        type,
        title,
        message: options?.message,
        duration: options?.duration || 4000,
      };

      setToasts((prev) => [...prev.slice(-4), newToast]); // Keep maximum 5 concurrent toasts
    },
    []
  );

  const success = useCallback(
    (title: string, options?: ToastOptions) => showToast("success", title, options),
    [showToast]
  );

  const error = useCallback(
    (title: string, options?: ToastOptions) => showToast("error", title, options),
    [showToast]
  );

  const warning = useCallback(
    (title: string, options?: ToastOptions) => showToast("warning", title, options),
    [showToast]
  );

  const info = useCallback(
    (title: string, options?: ToastOptions) => showToast("info", title, options),
    [showToast]
  );

  return (
    <ToastContext.Provider
      value={{
        toasts,
        showToast,
        success,
        error,
        warning,
        info,
        dismiss,
      }}
    >
      {children}

      {/* Floating Toast Container */}
      <div
        aria-live="polite"
        className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-2.5 pointer-events-none"
      >
        {toasts.map((toast) => (
          <div key={toast.id} className="pointer-events-auto">
            <Toast toast={toast} onDismiss={dismiss} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within a ToastProvider");
  }
  return context;
}
