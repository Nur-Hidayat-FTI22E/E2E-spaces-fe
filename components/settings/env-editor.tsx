"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import {
  Key,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Check,
  Download,
  FileText,
  AlertCircle,
  X,
  Lock,
} from "lucide-react";

interface EnvEditorProps {
  initialEnvVars?: Record<string, string>;
  onSave?: (envVars: Record<string, string>) => Promise<void> | void;
  onChange?: (envVars: Record<string, string>) => void;
  isSaving?: boolean;
  title?: string;
  description?: string;
  readOnly?: boolean;
  /** Keys that are shown but cannot be edited or deleted (value is read-only). */
  lockedKeys?: string[];
  /** Keys that are completely hidden from the editor list (managed elsewhere). */
  hiddenKeys?: string[];
  /** When true, hide the delete button on all rows (still allows editing unless key is locked). */
  hideDelete?: boolean;
  className?: string;
}

export function EnvEditor({
  initialEnvVars = {},
  onSave,
  onChange,
  isSaving = false,
  title = "Environment Variables",
  description = "Variables exposed to your deployment runtime container.",
  readOnly = false,
  lockedKeys = [],
  hiddenKeys = [],
  hideDelete = false,
  className = "",
}: EnvEditorProps) {
  const [envVars, setEnvVars] = useState<Record<string, string>>(initialEnvVars);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [showSecrets, setShowSecrets] = useState(false);
  const [revealedKeys, setRevealedKeys] = useState<Record<string, boolean>>({});

  // Bulk import state
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [bulkText, setBulkText] = useState("");
  const [bulkError, setBulkError] = useState<string | null>(null);

  const [copied, setCopied] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    setEnvVars(initialEnvVars || {});
    setHasChanges(false);
  }, [initialEnvVars]);

  // Toggle single secret visibility
  const toggleKeyReveal = (key: string) => {
    setRevealedKeys((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAddPair = (e: React.FormEvent) => {
    e.preventDefault();
    const key = newKey.trim().toUpperCase().replace(/[^A-Z0-9_]/g, "_");
    if (!key) return;

    const updated = { ...envVars, [key]: newValue.trim() };
    setEnvVars(updated);
    setNewKey("");
    setNewValue("");
    setHasChanges(true);
    onChange?.(updated);
  };

  const handleDeletePair = (key: string) => {
    const copy = { ...envVars };
    delete copy[key];
    setEnvVars(copy);
    setHasChanges(true);
    onChange?.(copy);
  };

  const handleUpdateValue = (key: string, val: string) => {
    const updated = { ...envVars, [key]: val };
    setEnvVars(updated);
    setHasChanges(true);
    onChange?.(updated);
  };

  // Bulk parser
  const handleApplyBulk = () => {
    setBulkError(null);
    if (!bulkText.trim()) {
      setShowBulkModal(false);
      return;
    }

    const lines = bulkText.split("\n");
    const parsed: Record<string, string> = {};

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line || line.startsWith("#")) continue;

      const eqIndex = line.indexOf("=");
      if (eqIndex === -1) {
        setBulkError(`Line ${i + 1} is invalid: missing '=' character.`);
        return;
      }

      let key = line.slice(0, eqIndex).trim();
      let val = line.slice(eqIndex + 1).trim();

      // Clean key
      key = key.replace(/^export\s+/, "").toUpperCase().replace(/[^A-Z0-9_]/g, "_");

      // Strip surrounding quotes
      if (
        (val.startsWith('"') && val.endsWith('"')) ||
        (val.startsWith("'") && val.endsWith("'"))
      ) {
        val = val.slice(1, -1);
      }

      parsed[key] = val;
    }

    const updated = { ...envVars, ...parsed };
    setEnvVars(updated);
    setBulkText("");
    setShowBulkModal(false);
    setHasChanges(true);
    onChange?.(updated);
  };

  // Copy as .env
  const handleCopyEnv = async () => {
    const text = Object.entries(envVars)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download .env file
  const handleDownloadEnv = () => {
    const text = Object.entries(envVars)
      .map(([k, v]) => `${k}=${v}`)
      .join("\n");
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = ".env";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleSave = async () => {
    if (onSave) {
      await onSave(envVars);
      setHasChanges(false);
    }
  };

  const lockedSet = new Set(lockedKeys);
  const hiddenSet = new Set(hiddenKeys);
  const entries = Object.entries(envVars).filter(([key]) => !hiddenSet.has(key));

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 w-full">
          <div>
            <div className="flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <CardTitle>{title}</CardTitle>
            </div>
            <CardDescription className="mt-1">{description}</CardDescription>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowSecrets(!showSecrets)}
              className="text-xs text-zinc-400 hover:text-white h-7 px-2"
              title={showSecrets ? "Mask Secrets" : "Reveal Secrets"}
            >
              {showSecrets ? <EyeOff className="w-3.5 h-3.5 mr-1" /> : <Eye className="w-3.5 h-3.5 mr-1" />}
              {showSecrets ? "Mask All" : "Reveal All"}
            </Button>

            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(true)}
                className="text-xs text-zinc-400 hover:text-white h-7 px-2"
                title="Bulk import .env file"
              >
                <FileText className="w-3.5 h-3.5 mr-1" /> Bulk Import
              </Button>
            )}

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCopyEnv}
              disabled={entries.length === 0}
              className="text-xs text-zinc-400 hover:text-white h-7 px-2"
              title="Copy all as .env"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-cyan-400" /> : <Copy className="w-3.5 h-3.5" />}
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadEnv}
              disabled={entries.length === 0}
              className="text-xs text-zinc-400 hover:text-white h-7 px-2"
              title="Download .env"
            >
              <Download className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex flex-col gap-4">
        {/* New Variable Add Form */}
        {!readOnly && (
          <form
            onSubmit={handleAddPair}
            className="p-3.5 rounded-xl border border-zinc-850 bg-zinc-900/50 flex flex-col sm:flex-row sm:items-end gap-3"
          >
            <div className="flex-1">
              <Input
                label="Variable Key"
                placeholder="e.g. DATABASE_URL"
                value={newKey}
                onChange={(e) => setNewKey(e.target.value.toUpperCase())}
                className="font-mono text-xs"
              />
            </div>

            <div className="flex-1">
              <Input
                label="Variable Value"
                placeholder="e.g. postgresql://..."
                value={newValue}
                onChange={(e) => setNewValue(e.target.value)}
                className="font-mono text-xs"
              />
            </div>

            <Button
              type="submit"
              variant="secondary"
              size="sm"
              disabled={!newKey.trim()}
              leftIcon={<Plus className="w-3.5 h-3.5" />}
              className="text-xs h-9"
            >
              Add Variable
            </Button>
          </form>
        )}

        {/* Variables List */}
        {entries.length === 0 ? (
          <div className="p-8 rounded-xl border border-zinc-850 bg-zinc-950/40 text-center font-mono text-xs text-zinc-500">
            No environment variables configured for this application.
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {entries.map(([key, val]) => {
              const isRevealed = showSecrets || Boolean(revealedKeys[key]);
              const isLocked = lockedSet.has(key);

              return (
                <div
                  key={key}
                  className="p-2.5 rounded-lg border border-zinc-850 bg-zinc-900/60 font-mono text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="flex items-center gap-2 min-w-0 flex-1">
                    <span className="font-semibold text-cyan-300 w-44 truncate flex-shrink-0">
                      {key}
                    </span>
                    <span className="text-zinc-600">=</span>

                    {(readOnly || isLocked) ? (
                      <span className="text-zinc-300 break-all">
                        {isRevealed ? val : "••••••••••••"}
                      </span>
                    ) : (
                      <input
                        type={isRevealed ? "text" : "password"}
                        value={val}
                        onChange={(e) => handleUpdateValue(key, e.target.value)}
                        className="bg-transparent text-zinc-200 focus:outline-none focus:bg-zinc-950/80 px-2 py-1 rounded border border-transparent focus:border-zinc-800 flex-1 min-w-0"
                      />
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 self-end sm:self-center">
                    {isLocked && (
                      <span
                        title="This value is managed by KotaCloud and cannot be changed."
                        className="flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono bg-amber-950/60 text-amber-400 border border-amber-800/50 select-none"
                      >
                        <Lock className="w-2.5 h-2.5" />
                        Managed
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => toggleKeyReveal(key)}
                      className="p-1.5 text-zinc-500 hover:text-zinc-300 rounded cursor-pointer"
                      title={isRevealed ? "Mask" : "Reveal"}
                    >
                      {isRevealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>

                    {!readOnly && !isLocked && !hideDelete && (
                      <button
                        type="button"
                        onClick={() => handleDeletePair(key)}
                        className="p-1.5 text-zinc-500 hover:text-rose-400 rounded cursor-pointer"
                        title="Delete variable"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Save Bar if modified and onSave provided */}
        {onSave && !readOnly && hasChanges && (
          <div className="p-3.5 rounded-xl border border-cyan-500/40 bg-cyan-950/20 flex items-center justify-between gap-4 mt-2">
            <span className="text-xs text-cyan-300 font-mono">
              You have unsaved environment variable changes.
            </span>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={handleSave}
              isLoading={isSaving}
              className="text-xs"
            >
              Save Changes
            </Button>
          </div>
        )}
      </CardContent>

      {/* Bulk Import Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-[#09090b] shadow-2xl p-6 flex flex-col gap-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white tracking-tight">Bulk Import .env</h3>
                <p className="text-xs text-zinc-400 mt-1 font-mono">
                  Paste raw environment variables in standard KEY=VALUE format.
                </p>
              </div>
              <button
                onClick={() => setShowBulkModal(false)}
                className="text-zinc-500 hover:text-white cursor-pointer p-1 rounded hover:bg-zinc-900 transition-colors"
                aria-label="Close modal"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {bulkError && (
              <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                <span>{bulkError}</span>
              </div>
            )}

            <textarea
              rows={8}
              placeholder={`# Example configuration\nPORT=3000\nNODE_ENV=production\nDATABASE_URL=postgres://user:secret@db.spaces:5432/app`}
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
              className="w-full bg-zinc-950 font-mono text-xs text-zinc-200 border border-zinc-800 rounded-xl p-3 focus:outline-none focus:border-cyan-500/60 leading-relaxed"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-850">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowBulkModal(false)}
              >
                Cancel
              </Button>

              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleApplyBulk}
              >
                Import Variables
              </Button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
