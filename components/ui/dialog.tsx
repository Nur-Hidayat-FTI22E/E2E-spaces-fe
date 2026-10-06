"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { X, AlertTriangle } from "lucide-react";

export interface ConfirmDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  variant?: "danger" | "primary";
  isLoading?: boolean;
  verificationKeyword?: string;
  verificationPlaceholder?: string;
}

export function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmText = "Confirm",
  cancelText = "Cancel",
  variant = "danger",
  isLoading = false,
  verificationKeyword,
  verificationPlaceholder,
}: ConfirmDialogProps) {
  const [verificationInput, setVerificationInput] = useState("");

  useEffect(() => {
    if (isOpen) {
      setVerificationInput("");
    }
  }, [isOpen, verificationKeyword]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen && !isLoading) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, isLoading, onClose]);

  if (!isOpen) return null;

  const isVerificationMatched =
    !verificationKeyword || verificationInput.trim() === verificationKeyword.trim();

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={isLoading ? undefined : onClose}
      />

      {/* Dialog box */}
      <div className="relative w-full max-w-md rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {variant === "danger" && (
              <div className="w-9 h-9 rounded-lg bg-rose-950/40 border border-rose-800/50 flex items-center justify-center text-rose-400 flex-shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
            )}
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
              <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isLoading}
            className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors disabled:opacity-50"
            aria-label="Close dialog"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {verificationKeyword && (
          <div className="flex flex-col gap-2 pt-3 border-t border-zinc-850/80">
            <label className="text-xs text-zinc-300 select-none">
              To confirm, type <span className="font-mono font-semibold text-rose-300 select-none px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 pointer-events-none inline-block" onCopy={(e) => e.preventDefault()}>{verificationKeyword}</span> below:
            </label>
            <div className="relative">
              <input
                type="text"
                value={verificationInput}
                onChange={(e) => setVerificationInput(e.target.value)}
                onPaste={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  e.preventDefault();
                }}
                onKeyDown={(e) => {
                  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "v") {
                    e.preventDefault();
                  }
                  if (e.key === "Enter" && isVerificationMatched && !isLoading) {
                    e.preventDefault();
                    onConfirm();
                  }
                }}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder={verificationPlaceholder || `Type "${verificationKeyword}" to confirm`}
                className={`w-full px-3 py-2 bg-zinc-900/90 border rounded-lg text-xs text-white placeholder:text-zinc-600 focus:outline-none transition-all font-mono ${
                  verificationInput.length > 0 && !isVerificationMatched
                    ? "border-rose-500/60 focus:border-rose-500 focus:ring-1 focus:ring-rose-500/30"
                    : isVerificationMatched && verificationInput.length > 0
                    ? "border-emerald-500/60 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500/30"
                    : "border-zinc-800 focus:border-zinc-700"
                }`}
              />
            </div>
          </div>
        )}

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-zinc-850 mt-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isLoading}
            className="text-xs"
          >
            {cancelText}
          </Button>

          <Button
            variant={variant === "danger" ? "danger" : "primary"}
            size="sm"
            onClick={onConfirm}
            isLoading={isLoading}
            disabled={isLoading || !isVerificationMatched}
            className="text-xs font-semibold px-4"
          >
            {confirmText}
          </Button>
        </div>
      </div>
    </div>
  );
}

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  description?: string;
  children: React.ReactNode;
  maxWidth?: string;
}

export function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = "max-w-md",
}: ModalProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Modal box */}
      <div
        className={`relative w-full ${maxWidth} rounded-xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl z-10 flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto`}
      >
        {title && (
          <div className="flex items-start justify-between pb-3 border-b border-zinc-850">
            <div>
              <h3 className="text-sm font-semibold text-white tracking-tight">{title}</h3>
              {description && (
                <p className="text-xs text-zinc-400 mt-1 leading-relaxed">{description}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="text-zinc-500 hover:text-zinc-300 p-1 rounded transition-colors cursor-pointer"
              aria-label="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {children}
      </div>
    </div>
  );
}

