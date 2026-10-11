"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Cpu, HardDrive, Wifi, Zap, ExternalLink, RefreshCw, AlertTriangle } from "lucide-react";
import { getUsageApi, UsageSummary, ServiceUsage } from "@/lib/api/usage";
import { useAuth } from "@/hooks/use-auth";
import { platformServiceUrl } from "@/lib/platform";

function fmtMB(v: number | undefined | null): string {
  const mb = v || 0;
  if (mb >= 1024) return `${(mb / 1024).toFixed(2)} GB`;
  if (mb < 1 && mb > 0) return `${(mb * 1024).toFixed(0)} KB`;
  return `${mb.toFixed(mb < 10 ? 1 : 0)} MB`;
}

function fmtNum(v: number | undefined | null): string {
  return (v || 0).toFixed(2).replace(/\.00$/, "");
}

function Bar({ pct, danger }: { pct: number; danger?: boolean }) {
  const w = Math.min(100, Math.max(0, pct));
  return (
    <div className="w-full bg-zinc-800/80 rounded-full h-1.5 overflow-hidden">
      <div
        className={`${danger ? "bg-rose-500" : "bg-cyan-500"} h-full rounded-full transition-all duration-500`}
        style={{ width: `${w}%` }}
      />
    </div>
  );
}

const STATUS_COLOR: Record<string, string> = {
  RUNNING: "text-emerald-400",
  BUILDING: "text-amber-400",
  DEPLOYING: "text-amber-400",
  STOPPED: "text-zinc-400",
  FAILED: "text-rose-400",
  IDLE: "text-zinc-400",
};

export default function UsagePage() {
  const { isAuthenticated } = useAuth();
  const [usage, setUsage] = useState<UsageSummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const load = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const data = await getUsageApi();
      setUsage(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal memuat data usage");
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    load();
    const interval = setInterval(() => load(), 5000);
    return () => clearInterval(interval);
  }, [isAuthenticated, load]);

  // Persentase dihitung terhadap LIMIT TERPASANG (jumlah limit service yang
  // sudah dibuat), bukan kuota teoritis plan — sesuai apa yang benar-benar
  // diprotes Docker saat container berjalan.
  const usedMemPct = usage && usage.allocated_memory_mb > 0 ? (usage.used_memory_mb / usage.allocated_memory_mb) * 100 : 0;
  // used_cpu_percent = akumulasi % host CPU dari docker stats (100% = 1 core).
  // Limit vCPU terpasang = alkasi semua service; bandingkan langsung.
  const usedVcpu = usage ? usage.used_cpu_percent / 100 : 0; // %host / 100 = vCPU nyata
  const allocCpus = usage?.allocated_cpus ?? 0;
  const cpuPct = allocCpus > 0 ? (usedVcpu / allocCpus) * 100 : 0;
  const egress = usage ? usage.total_net_tx_mb : 0;
  const egressQuotaMB = 100 * 1024; // placeholder 100 GB hingga metering bandwidth bulanan
  const egressPct = (egress / egressQuotaMB) * 100;
  const maxSvc = usage?.plan_max_services ?? 0; // -1 = unlimited

  return (
    <DashboardShell title="Usage" subtitle="Monitor compute, memory, and network usage across your workspace in real time.">
      <div className="space-y-6 max-w-5xl">
        {/* Toolbar refresh + waktu snapshot */}
        <div className="flex items-center justify-between">
          <div className="text-[11px] font-mono text-zinc-500">
            {usage ? (<>Snapshot: {new Date(usage.generated_at).toLocaleTimeString()}</>) : "Memuat…"}
            {usage?.engine_offline && (
              <span className="ml-2 text-amber-400 inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Engine offline — menampilkan alokasi saja
              </span>
            )}
          </div>
          <button
            onClick={() => load(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white border border-zinc-800 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? "animate-spin text-cyan-400" : ""}`} />
            <span>Refresh</span>
          </button>
        </div>

        {error && (
          <Card className="border-rose-500/30 bg-rose-950/10">
            <CardContent className="pt-4">
              <p className="text-xs text-rose-300 font-mono">{error}</p>
              <p className="text-xs text-zinc-500 mt-1">Coba lagi dengan tombol Refresh. Pastikan Anda sudah login.</p>
            </CardContent>
          </Card>
        )}

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">RAM Usage</span>
                <HardDrive className="w-4 h-4 text-cyan-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mt-1">
                {fmtMB(usage?.used_memory_mb)} <span className="text-sm text-zinc-500 font-normal">/ {fmtMB(usage?.allocated_memory_mb)} terpasang</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Dipakai vs jumlah limit RAM semua service yang sudah dibuat ({usage?.services_count ?? 0} service × kuota per-service). Kuota plan: {fmtMB(usage?.plan_max_memory_mb)} total.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Bar pct={usedMemPct} danger={usedMemPct > 90} />
              <p className="text-[10px] font-mono text-zinc-600 mt-1">{usedMemPct.toFixed(1)}% dari limit RAM terpasang</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Compute (vCPU)</span>
                <Cpu className="w-4 h-4 text-cyan-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mt-1">
                {usedVcpu.toFixed(2)} <span className="text-sm text-zinc-500 font-normal">/ {fmtNum(usage?.allocated_cpus ?? 0)} vCPU terpasang</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Pemakaian vCPU nyata (dari docker stats {fmtNum(usage?.used_cpu_percent ?? 0)}% host) dibanding jumlah limit vCPU semua service yang sudah dibuat. Kuota plan: {fmtNum(usage?.plan_max_cpus ?? 0)} vCPU total.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Bar pct={cpuPct} danger={cpuPct > 90} />
              <p className="text-[10px] font-mono text-zinc-600 mt-1">{cpuPct.toFixed(1)}% dari limit vCPU terpasang</p>
            </CardContent>
          </Card>

          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Network I/O</span>
                <Wifi className="w-4 h-4 text-emerald-400" />
              </div>
              <CardTitle className="text-2xl font-bold text-white mt-1">
                ↓ {fmtMB(usage?.total_net_rx_mb)} <span className="text-sm text-zinc-500 font-normal">↑ {fmtMB(usage?.total_net_tx_mb)}</span>
              </CardTitle>
              <CardDescription className="text-xs text-zinc-500">
                Akumulasi RX/TX sejak container dibuat (docker net_io)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Bar pct={egressPct} danger={egressPct > 90} />
              <p className="text-[10px] font-mono text-zinc-600 mt-1">Estimasi kuota bulanan 100 GB</p>
            </CardContent>
          </Card>
        </div>

        {/* Services Breakdown */}
        <Card className="bg-zinc-900/30 border-white/[0.06]">
          <CardHeader>
            <CardTitle className="text-base text-zinc-200">Per-Service Breakdown</CardTitle>
            <CardDescription className="text-xs text-zinc-500">
              Pemakaian nyata per container (auto-refresh tiap 5 detik) — plan {usage?.plan ?? "…"} ({maxSvc === -1 ? "service tak terbatas" : `maks ${maxSvc} service`})
              {maxSvc > 0 && usage ? ` • ${usage.services_count}/${maxSvc}` : ""}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {usage && usage.services.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-xs font-mono">
                  <thead>
                    <tr className="text-left text-zinc-500 border-b border-white/[0.06]">
                      <th className="py-2 pr-3 font-medium">Service</th>
                      <th className="py-2 pr-3 font-medium">Status</th>
                      <th className="py-2 pr-3 font-medium">Domain</th>
                      <th className="py-2 pr-3 font-medium">RAM (used/limit)</th>
                      <th className="py-2 pr-3 font-medium">CPU</th>
                      <th className="py-2 pr-3 font-medium">Net ↓/↑</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usage.services.map((s: ServiceUsage) => (
                      <tr key={s.service_id} className="border-b border-white/[0.04] text-zinc-300">
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          <span className="text-white font-semibold">{s.name}</span>
                          <span className="ml-2 text-[10px] text-zinc-600 uppercase">{s.type}</span>
                        </td>
                        <td className={`py-2.5 pr-3 ${STATUS_COLOR[s.status] || "text-zinc-400"}`}>● {s.status}</td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {s.subdomain && s.running ? (
                            <a
                              href={platformServiceUrl(s.subdomain) || "#"}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-cyan-400 hover:text-cyan-300 inline-flex items-center gap-1"
                            >
                              <span className="truncate max-w-48">{s.subdomain}</span>
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          ) : (
                            <span className="text-zinc-600">{s.subdomain || "—"}</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap min-w-40">
                          {s.running ? (
                            <div className="flex items-center gap-2">
                              <span className="w-28"><Bar pct={s.mem_percent} danger={s.mem_percent > 90} /></span>
                              <span>{fmtMB(s.mem_used_mb)}/{fmtMB(s.memory_limit_mb)}</span>
                            </div>
                          ) : (
                            <span className="text-zinc-600">{fmtMB(s.memory_limit_mb)} limit</span>
                          )}
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {s.running ? <span className={s.cpu_percent > 80 ? "text-amber-400" : ""}>{s.cpu_percent.toFixed(1)}%</span> : <span className="text-zinc-600">—</span>}
                          <span className="ml-2 text-zinc-600">({s.cpus_limit.toFixed(2)} vCPU)</span>
                        </td>
                        <td className="py-2.5 pr-3 whitespace-nowrap">
                          {s.running ? (
                            <span>↓{fmtMB(s.net_rx_mb)} ↑{fmtMB(s.net_tx_mb)}</span>
                          ) : (
                            <span className="text-zinc-600">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : usage ? (
              <div className="p-6 rounded-xl border border-dashed border-white/[0.08] bg-zinc-950/40 text-center flex flex-col items-center justify-center">
                <Zap className="w-8 h-8 text-cyan-400/80 mb-2" />
                <p className="text-sm font-medium text-zinc-300">Belum ada service di workspace ini</p>
                <p className="text-xs text-zinc-500 max-w-md mt-1">
                  Deploy service pertama Anda untuk mulai memantau penggunaan resource secara real-time.
                </p>
              </div>
            ) : (
              <div className="p-6 text-center text-xs font-mono text-zinc-500">Memuat data usage…</div>
            )}
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
