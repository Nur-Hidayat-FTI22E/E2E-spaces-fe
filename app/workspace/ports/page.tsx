"use client";

import React, { useCallback, useEffect, useState } from "react";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Network, RefreshCw, AlertTriangle, CheckCircle2, HelpCircle } from "lucide-react";
import { fetchAdminPorts, type PortAllocation, type AdminPortsResponse } from "@/lib/api/admin";
import { useAuth } from "@/hooks/use-auth";

type Filter = "all" | "occupied" | "free" | "foreign";

const FILTERS: { key: Filter; label: string }[] = [
  { key: "all", label: "Semua" },
  { key: "occupied", label: "Terpakai" },
  { key: "foreign", label: "Asing" },
  { key: "free", label: "Bebas" },
];

function stateColor(a: PortAllocation): string {
  switch (a.state) {
    case "occupied":
      return "text-cyan-400";
    case "foreign":
      return "text-amber-400";
    default:
      return "text-zinc-600";
  }
}

function stateBadge(a: PortAllocation) {
  if (a.state === "occupied") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
        <CheckCircle2 className="w-3 h-3" /> terpakai
      </span>
    );
  }
  if (a.state === "foreign") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-300 border border-amber-500/20">
        <AlertTriangle className="w-3 h-3" /> asing
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono uppercase px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-500 border border-white/[0.06]">
      bebas
    </span>
  );
}

export default function PortAuditPage() {
  const { user } = useAuth();
  const [filter, setFilter] = useState<Filter>("all");
  const [data, setData] = useState<AdminPortsResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (f: Filter) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetchAdminPorts(f);
      if (resp.success && resp.data) setData(resp.data);
      else setError("Gagal memuat data audit port");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Gagal memuat data audit port");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [filter, load]);

  const isAdmin = (user?.email || "").toLowerCase() === (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

  if (process.env.NEXT_PUBLIC_ADMIN_EMAIL && !isAdmin) {
    return (
      <DashboardShell title="Port Audit" subtitle="Halaman ini hanya untuk admin platform.">
        <Card className="bg-zinc-900/40 border-white/[0.06] max-w-lg">
          <CardContent className="flex flex-col items-center py-12 gap-3 text-center">
            <HelpCircle className="w-10 h-10 text-zinc-600" />
            <p className="text-zinc-400 text-sm">
              Akun kamu tidak memiliki akses ke halaman admin. Hubungi pemilik platform bila merasa ini keliru.
            </p>
          </CardContent>
        </Card>
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Port Audit"
      subtitle="Peta port host 10001–20000 yang dialokasikan untuk container tenant."
    >
      <div className="space-y-6 max-w-5xl">
        {/* Ringkasan */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs font-mono uppercase text-zinc-500">Total Port</CardDescription>
              <CardTitle className="text-xl text-white">{data?.total_ports ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs font-mono uppercase text-cyan-400">Terpakai</CardDescription>
              <CardTitle className="text-xl text-cyan-300">{data?.occupied ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs font-mono uppercase text-amber-400">Asing</CardDescription>
              <CardTitle className="text-xl text-amber-300">{data?.foreign ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
          <Card className="bg-zinc-900/40 border-white/[0.06]">
            <CardHeader className="pb-1">
              <CardDescription className="text-xs font-mono uppercase text-zinc-500">Bebas</CardDescription>
              <CardTitle className="text-xl text-zinc-300">{data?.free ?? "—"}</CardTitle>
            </CardHeader>
          </Card>
        </div>

        {/* Filter + refresh */}
        <div className="flex items-center gap-2 flex-wrap">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 rounded-md text-xs font-mono uppercase border transition-colors ${
                filter === f.key
                  ? "bg-cyan-500/10 text-cyan-300 border-cyan-500/30"
                  : "bg-zinc-900/60 text-zinc-500 border-white/[0.06] hover:text-zinc-300"
              }`}
            >
              {f.label}
            </button>
          ))}
          <button
            onClick={() => load(filter)}
            disabled={loading}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-mono uppercase bg-zinc-900/60 text-zinc-400 border border-white/[0.06] hover:text-cyan-300 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} /> Muat ulang
          </button>
        </div>

        {error && (
          <Card className="bg-red-950/30 border-red-500/20">
            <CardContent className="py-4 text-sm text-red-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> {error}
            </CardContent>
          </Card>
        )}

        {/* Tabel port */}
        <Card className="bg-zinc-900/40 border-white/[0.06]">
          <CardHeader>
            <div className="flex items-center gap-2">
              <Network className="w-4 h-4 text-cyan-400" />
              <CardTitle className="text-base text-white">Detail Port</CardTitle>
            </div>
            <CardDescription>
              Rentang {data?.range_start ?? 10001}–{data?.range_end ?? 20000}. Status container diperoleh live dari engine.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-[10px] font-mono uppercase tracking-wider text-zinc-500 border-b border-white/[0.06]">
                    <th className="py-2 pr-3">Port</th>
                    <th className="py-2 pr-3">Status</th>
                    <th className="py-2 pr-3">Jenis</th>
                    <th className="py-2 pr-3">Pemilik</th>
                    <th className="py-2 pr-3">User</th>
                    <th className="py-2 pr-3">Subdomain</th>
                    <th className="py-2">Container</th>
                  </tr>
                </thead>
                <tbody>
                  {(data?.ports ?? []).map((a) => (
                    <tr key={a.port} className="border-b border-white/[0.04] hover:bg-white/[0.02]">
                      <td className={`py-2 pr-3 font-mono font-semibold ${stateColor(a)}`}>{a.port}</td>
                      <td className="py-2 pr-3">{stateBadge(a)}</td>
                      <td className="py-2 pr-3 text-zinc-400 text-xs font-mono">{a.owner_type || "—"}</td>
                      <td className="py-2 pr-3 text-zinc-300 text-xs">{a.owner || "—"}</td>
                      <td className="py-2 pr-3 text-zinc-400 text-xs">{a.user_email || "—"}</td>
                      <td className="py-2 pr-3 text-zinc-400 text-xs font-mono">{a.subdomain || "—"}</td>
                      <td className="py-2 text-zinc-400 text-xs font-mono">{a.status || "—"}</td>
                    </tr>
                  ))}
                  {(!data || data.ports.length === 0) && !loading && (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-zinc-500 text-xs">
                        Tidak ada port pada filter ini.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardShell>
  );
}
