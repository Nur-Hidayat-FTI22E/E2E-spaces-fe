"use client";

import React, { useEffect } from "react";
import Link from "next/link";
import { AlertCircle, RefreshCw, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log unexpected runtime errors
    console.error("Global application error caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-[#030304] text-zinc-100 flex flex-col items-center justify-center p-6 select-none font-sans">
      <div className="w-full max-w-md p-6 rounded-2xl border border-rose-900/40 bg-zinc-950/80 shadow-2xl flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800/40 flex items-center justify-center text-rose-400">
          <AlertCircle className="w-6 h-6" />
        </div>

        <div>
          <span className="text-[10px] font-mono tracking-widest text-rose-400 uppercase font-semibold">
            SYSTEM EXCEPTION
          </span>
          <h2 className="text-lg font-bold text-white mt-1">Application Encountered an Error</h2>
          <p className="text-xs text-zinc-400 mt-1.5 leading-relaxed">
            A client-side runtime exception occurred. You can attempt to recover the state or navigate back to the workspace.
          </p>
        </div>

        {error.digest && (
          <div className="w-full p-2.5 rounded-lg bg-zinc-900/80 border border-zinc-800 text-[11px] font-mono text-zinc-400 flex items-center justify-between">
            <span className="text-zinc-500">DIGEST:</span>
            <span className="text-cyan-400 select-all">{error.digest}</span>
          </div>
        )}

        <div className="flex items-center gap-3 w-full pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => reset()}
            leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            className="flex-1 text-xs border-zinc-800 text-zinc-300 hover:text-white"
          >
            Try Again
          </Button>

          <Link href="/workspace/projects" className="flex-1">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Home className="w-3.5 h-3.5" />}
              className="w-full text-xs font-semibold"
            >
              Back to Projects
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
