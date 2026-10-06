"use client";

import React, { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";

// ── Skeleton primitives ────────────────────────────────────────────────────
function Sk({ className }: { className?: string }) {
  return <div className={`skeleton${className ? " " + className : ""}`} aria-hidden="true" />;
}

/** Full workspace-shell skeleton that mirrors the actual layout */
function WorkspaceAuthSkeleton() {
  return (
    <div className="min-h-screen bg-[#030304] flex text-zinc-100">
      {/* Sidebar skeleton — only on md+ */}
      <div className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-white/[0.06] bg-zinc-950/80 p-4 gap-4">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-1 pb-3 border-b border-white/[0.04]">
          <Sk className="w-7 h-7 rounded-lg" />
          <Sk className="h-4 w-24" />
        </div>
        {/* Nav items */}
        <div className="flex flex-col gap-1.5 mt-1">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex items-center gap-3 px-2 py-2 rounded-lg">
              <Sk className="w-4 h-4 rounded" />
              <Sk className="h-3 w-20" />
            </div>
          ))}
        </div>
        {/* Bottom user */}
        <div className="mt-auto flex items-center gap-2.5 pt-3 border-t border-white/[0.04]">
          <Sk className="w-8 h-8 rounded-full" />
          <div className="flex flex-col gap-1">
            <Sk className="h-3 w-20" />
            <Sk className="h-2.5 w-28" />
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Topbar */}
        <div className="h-14 border-b border-white/[0.06] bg-zinc-950/60 flex items-center justify-between px-6 shrink-0">
          <div className="flex items-center gap-3">
            <Sk className="w-6 h-6 rounded md:hidden" />
            <Sk className="h-4 w-32" />
          </div>
          <div className="flex items-center gap-2">
            <Sk className="h-7 w-24 rounded-lg" />
            <Sk className="w-7 h-7 rounded-full" />
          </div>
        </div>

        {/* Page content skeleton */}
        <div className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <div className="flex flex-col gap-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
              <div className="flex flex-col gap-2">
                <Sk className="h-6 w-36" />
                <Sk className="h-3 w-56" />
              </div>
              <Sk className="h-8 w-32 rounded-lg" />
            </div>
            {/* Cards grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-white/[0.06] bg-[#0c0d10] p-5 flex flex-col gap-4">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <Sk className="w-9 h-9 rounded-lg" />
                      <div className="flex flex-col gap-1.5">
                        <Sk className="h-4 w-28" />
                        <Sk className="h-3 w-20" />
                      </div>
                    </div>
                    <Sk className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="flex gap-2">
                    <Sk className="h-5 w-20 rounded-full" />
                    <Sk className="h-5 w-16 rounded-full" />
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.04]">
                    <Sk className="h-3 w-24" />
                    <Sk className="h-3 w-16" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.replace("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <WorkspaceAuthSkeleton />;
  }

  if (!isAuthenticated) {
    return null;
  }

  return <>{children}</>;
}
