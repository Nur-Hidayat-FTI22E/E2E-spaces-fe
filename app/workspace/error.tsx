"use client";

import React, { useEffect } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function WorkspaceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Workspace error boundary caught:", error);
  }, [error]);

  return (
    <div className="p-8 rounded-xl border border-rose-900/40 bg-zinc-950/60 max-w-xl mx-auto my-12 text-center flex flex-col items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400">
        <AlertTriangle className="w-5 h-5" />
      </div>

      <div>
        <h3 className="text-sm font-bold text-white">Workspace View Error</h3>
        <p className="text-xs text-zinc-400 mt-1">
          {error.message || "Failed to render workspace component. You can reload this view."}
        </p>
      </div>

      {error.digest && (
        <span className="text-[10px] font-mono text-zinc-500">
          ID: {error.digest}
        </span>
      )}

      <Button
        variant="outline"
        size="sm"
        onClick={() => reset()}
        leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
        className="text-xs border-zinc-800 text-zinc-300 hover:text-white"
      >
        Retry Component
      </Button>
    </div>
  );
}
