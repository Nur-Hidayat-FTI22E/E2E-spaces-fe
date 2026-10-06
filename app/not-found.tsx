"use client";

import React from "react";
import Link from "next/link";
import { Terminal, Home, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#030304] text-zinc-100 flex flex-col items-center justify-center p-6 font-sans">
      <div className="w-full max-w-lg p-8 rounded-2xl border border-zinc-800 bg-zinc-950/80 shadow-2xl flex flex-col items-center text-center gap-5">
        <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400">
          <Terminal className="w-7 h-7" />
        </div>

        <div>
          <span className="text-[11px] font-mono tracking-widest text-cyan-400 uppercase font-semibold">
            HTTP 404 // RESOURCE_NOT_FOUND
          </span>
          <h1 className="text-2xl font-bold text-white mt-1.5 tracking-tight">
            Page Not Located
          </h1>
          <p className="text-xs text-zinc-400 mt-2 leading-relaxed max-w-sm">
            The route or resource you attempted to reach does not exist on this KotaCloud Spaces cluster.
          </p>
        </div>

        <div className="w-full p-3 rounded-lg bg-zinc-900/60 border border-zinc-800/80 text-[11px] font-mono text-zinc-400 text-left">
          <span className="text-zinc-600 select-none">$ </span>
          <span className="text-zinc-300">curl -I </span>
          <span className="text-rose-400">https://spaces.kotacloud.com/undefined</span>
          <br />
          <span className="text-zinc-600 select-none">&gt; </span>
          <span className="text-rose-400 font-semibold">HTTP/2 404 Not Found</span>
        </div>

        <div className="flex items-center gap-3 w-full pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.history.back()}
            leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
            className="flex-1 text-xs border-zinc-800 text-zinc-300 hover:text-white"
          >
            Go Back
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
