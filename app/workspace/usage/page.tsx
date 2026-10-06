"use client";

import React from "react";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Cpu, HardDrive, Wifi, Zap, ArrowUpRight } from "lucide-react";

export default function UsagePage() {
  return (
    <DashboardShell title="Usage" subtitle="Monitor compute resources, memory, and network usage across your workspace.">
      <div className="space-y-6 max-w-5xl">
        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Compute (vCPU)</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mt-1">0.14 / 8 vCPU</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Peak usage over last 30 days</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: "8%" }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">RAM Usage</span>
                <HardDrive className="w-4 h-4 text-cyan-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mt-1">512 MB / 16 GB</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Across all active containers</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-cyan-500 h-full rounded-full" style={{ width: "12%" }} />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Egress Bandwidth</span>
                <Wifi className="w-4 h-4 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mt-1">1.2 GB / 100 GB</CardTitle>
              <CardDescription className="text-xs text-zinc-500">Resets on next billing cycle</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
                <div className="bg-emerald-500 h-full rounded-full" style={{ width: "3%" }} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Breakdown Card */}
        <Card className="bg-zinc-900/30 border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-base text-zinc-200">Resource Consumption Breakdown</CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Live consumption measured per minute across your active services.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="p-6 rounded-xl border border-dashed border-white/[0.08] bg-zinc-950/40 text-center flex flex-col items-center justify-center">
              <Zap className="w-8 h-8 text-cyan-400/80 mb-2" />
              <p className="text-sm font-medium text-zinc-300">All services operating within included workspace limits</p>
              <p className="text-xs text-zinc-500 max-w-md mt-1">
                You currently have 0 active deployments exceeding basic tier quotas.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
