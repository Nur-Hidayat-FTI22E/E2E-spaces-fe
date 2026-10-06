"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  getSubscriptionApi,
  getInvoicesApi,
  getPlansApi,
  checkoutApi,
  simulatePaymentApi,
  syncInvoiceStatusApi,
  PlanDefinition,
  SubscriptionResponse,
  Invoice,
} from "@/lib/api/billing";
import { getFallbackPlan } from "@/lib/billing/fallback-plans";
import { useToast } from "@/lib/toast/toast-context";
import {
  CreditCard,
  Sparkles,
  QrCode,
  Building2,
  Smartphone,
  Loader2,
  CheckCircle2,
  Clock,
  XCircle,
  FileText,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  BadgeCheck,
} from "lucide-react";

// Kartu promo "Billing Info" adaptif terhadap plan aktif:
// Starter → Developer, Developer → Professional, Professional → Business.
// Plan Business (tertinggi) tidak menampilkan promo — lihat status card di bawah.
const NEXT_PLAN_PROMO: Record<
  string,
  { planId: "developer" | "professional" | "business"; title: string; spec: string; price: string }
> = {
  starter: {
    planId: "developer",
    title: "Unlock Developer Plan",
    spec: "Hingga 5 layanan dengan 0.5 vCPU / 512 MB RAM per service, 3 project workspace, auto-deploy GitHub & GitLab, database terkelola, dan Always-On uptime.",
    price: "Rp 49.000",
  },
  developer: {
    planId: "professional",
    title: "Upgrade to Professional",
    spec: "Hingga 10 layanan berperforma tinggi dengan 1.0 vCPU / 2 GB RAM per service, project workspace tak terbatas, database tak terbatas, dan dukungan prioritas.",
    price: "Rp 149.000",
  },
  professional: {
    planId: "business",
    title: "Upgrade to Business",
    spec: "Project & layanan tak terbatas dengan 4.0 vCPU / 8 GB RAM per service, kolaborasi tim, backup database otomatis, dan SLA 99.9%.",
    price: "Rp 499.000",
  },
};

const fmtMem = (mb: number) => (mb >= 1024 ? `${mb / 1024} GB` : `${mb} MB`);

export default function BillingPage() {
  const { user } = useAuth();
  const toast = useToast();

  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isPayingInvoice, setIsPayingInvoice] = useState<string | null>(null);
  const [isSyncingInvoice, setIsSyncingInvoice] = useState<string | null>(null);

  // Fetch billing data
  const loadBillingData = async () => {
    try {
      setIsLoading(true);
      const [subData, invData, plansData] = await Promise.all([
        getSubscriptionApi().catch(() => null),
        getInvoicesApi().catch(() => []),
        getPlansApi().catch(() => []),
      ]);
      if (subData) setSubscription(subData);
      setInvoices(invData || []);
      setPlans(plansData || []);
    } catch (err: unknown) {
      console.error("Failed to load billing data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadBillingData();
  }, []);

  // Data plan dari API; bila subscription belum termuat, pakai fallback Starter
  // (netral & gratis) dari mirror katalog bersama.
  const currentPlan = subscription?.plan || getFallbackPlan("starter");

  const paymentMethod = subscription?.payment_method;
  const pendingInvoice = subscription?.pending_invoice || null;
  const simulationMode = subscription?.simulation_mode ?? false;

  // Kartu promo adaptif: promosikan plan berikutnya yang relevan dengan plan
  // aktif. Data diambil dari API plans (harga & spek akurat); fallback ke copy
  // statis bila plans belum termuat.
  const nextPromo = NEXT_PLAN_PROMO[currentPlan.id];
  const nextPlan = nextPromo ? plans.find((p) => p.id === nextPromo.planId) : undefined;
  const promoSpec = nextPlan
    ? `${nextPlan.max_services === -1 ? "Layanan tak terbatas" : `Hingga ${nextPlan.max_services} layanan`} dengan ${nextPlan.cpu_share} vCPU / ${fmtMem(nextPlan.memory_mb_per_service)} RAM per service, ${nextPlan.max_projects === -1 ? "project workspace tak terbatas" : `${nextPlan.max_projects} project workspace`}, auto-deploy GitHub & GitLab, database terkelola, dan Always-On uptime.`
    : (nextPromo?.spec ?? "");
  const promoPrice = nextPlan ? nextPlan.price_formatted : (nextPromo?.price ?? "");

  // Lanjutkan pembayaran invoice pending (mode simulasi)
  const handleContinuePayment = async () => {
    if (!pendingInvoice) return;
    setIsPayingInvoice(pendingInvoice.id);
    try {
      if (simulationMode) {
        const paid = await simulatePaymentApi(pendingInvoice.id);
        toast.success("Pembayaran Berhasil", {
          message: `Invoice ${paid.invoice_number} lunas — plan ${paid.plan_name} aktif.`,
        });
      } else {
        // Dengan Midtrans aktif, arahkan ulang ke checkout Snap untuk invoice ini.
        const co = await checkoutApi({ plan_id: pendingInvoice.plan_id });
        if (co.snap_redirect_url) {
          window.location.href = co.snap_redirect_url;
          return;
        }
      }
      await loadBillingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memproses pembayaran";
      toast.error("Pembayaran Gagal", { message: msg });
    } finally {
      setIsPayingInvoice(null);
    }
  };

  // Sinkronkan status invoice pending langsung dari Midtrans Status API
  // (jaring pengaman kalau webhook tidak sampai).
  const handleSyncStatus = async () => {
    if (!pendingInvoice) return;
    setIsSyncingInvoice(pendingInvoice.id);
    try {
      const inv = await syncInvoiceStatusApi(pendingInvoice.id);
      if (inv.status === "paid") {
        toast.success("Pembayaran Terkonfirmasi", {
          message: `Invoice ${inv.invoice_number} lunas — plan ${inv.plan_name} aktif.`,
        });
      } else if (inv.status === "failed" || inv.status === "cancelled") {
        toast.warning("Pembayaran Gagal", {
          message: `Midtrans melaporkan invoice ${inv.invoice_number} sebagai ${inv.status}.`,
        });
      } else {
        toast.info("Masih Menunggu", {
          message: `Invoice ${inv.invoice_number} belum dibayar di Midtrans. Coba lagi setelah menyelesaikan pembayaran.`,
        });
      }
      await loadBillingData();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal sinkronisasi status";
      toast.error("Sinkronisasi Gagal", { message: msg });
    } finally {
      setIsSyncingInvoice(null);
    }
  };

  return (
    <DashboardShell
      title="Billing"
      subtitle="View your subscription status, payment method, and KotaCloud Spaces invoice history."
      showCreateButton={false}
    >
      <div className="space-y-8 w-full max-w-5xl mx-auto py-2">
        {/* PENDING INVOICE BANNER: lanjutkan pembayaran */}
        {pendingInvoice && (
          <div className="rounded-2xl border border-amber-500/25 bg-amber-950/20 p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs font-semibold text-amber-200">
                  Invoice {pendingInvoice.invoice_number} menunggu pembayaran
                </div>
                <div className="text-[11px] text-amber-300/70 leading-relaxed mt-0.5">
                  {pendingInvoice.plan_name} — {new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 }).format(pendingInvoice.amount_idr)}. Selesaikan untuk mengaktifkan plan.
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleSyncStatus}
                disabled={isSyncingInvoice === pendingInvoice.id}
                className="px-4 py-2 rounded-xl border border-amber-500/40 hover:border-amber-400 bg-amber-950/30 hover:bg-amber-900/30 text-amber-300 text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isSyncingInvoice === pendingInvoice.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <RefreshCw className="w-3.5 h-3.5" />
                )}
                <span>Sync Status</span>
              </button>
              <button
                type="button"
                onClick={handleContinuePayment}
                disabled={isPayingInvoice === pendingInvoice.id}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-black text-xs font-semibold transition-colors disabled:opacity-50 flex items-center gap-2"
              >
                {isPayingInvoice === pendingInvoice.id && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Lanjutkan Pembayaran</span>
              </button>
            </div>
          </div>
        )}

        {/* SECTION 1: Active Plan Summary (Matching Railway Screenshot) */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Active Plan
          </h2>
          <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="space-y-1 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white">{currentPlan.name} Plan</span>
                <span className="px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-300 font-mono text-[10px] border border-white/[0.06]">
                  {currentPlan.price_formatted} / {currentPlan.id === "starter" ? "forever" : "month"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {currentPlan.id === "starter"
                  ? "Free workspace for testing. Quota: 1 project, 1 service, 256 MB RAM, and 0.25 vCPU limit. Service pods auto-sleep after 30 minutes of idle."
                  : `Active paid workspace. Quota: ${currentPlan.memory_mb_per_service >= 1024 ? `${currentPlan.memory_mb_per_service / 1024} GB` : `${currentPlan.memory_mb_per_service} MB`} RAM per service, ${currentPlan.cpu_share} vCPU, and Always-On uptime.`}
              </p>
            </div>
            <Link
              href="/workspace/plans"
              className="px-3.5 py-1.5 rounded-xl border border-white/[0.08] hover:border-zinc-700 bg-zinc-900/60 hover:bg-zinc-800 text-xs font-medium text-zinc-200 transition-colors shrink-0 text-center"
            >
              Manage Plan
            </Link>
          </div>
        </div>

        <div className="h-[1px] bg-white/[0.06]" />

        {/* SECTION 2: Billing Info (Two cards side by side - matching Railway) */}
        <div className="space-y-3">
          <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
            Billing Info
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Card 1: Payment Method — recorded automatically from Midtrans webhook */}
            <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-5.5 flex flex-col justify-between space-y-4">
              <div className="space-y-1">
                <h3 className="text-xs font-semibold text-white">Payment Method</h3>
                <p className="text-[11px] text-zinc-400 leading-relaxed">
                  Metode dipilih saat checkout di jendela Midtrans Snap — kartu, e-wallet, QRIS,
                  atau virtual account. Kami tidak pernah menyimpan nomor kartu atau CVC.
                </p>
              </div>

              {/* Payment Method Display */}
              <div className="p-3.5 rounded-xl bg-zinc-900/40 border border-white/[0.04] flex items-center justify-between gap-3">
                {paymentMethod ? (
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-8 h-8 rounded-lg bg-zinc-900 border border-white/[0.08] text-zinc-300 flex items-center justify-center shrink-0">
                      {paymentMethod.type === "qris" ? (
                        <QrCode className="w-4 h-4" />
                      ) : paymentMethod.type === "va" ? (
                        <Building2 className="w-4 h-4" />
                      ) : paymentMethod.type === "ewallet" ? (
                        <Smartphone className="w-4 h-4" />
                      ) : (
                        <CreditCard className="w-4 h-4" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-white truncate">
                        {paymentMethod.brand}
                        {paymentMethod.last4 ? ` •••• ${paymentMethod.last4}` : ""}
                      </div>
                      <div className="text-[10px] font-mono text-zinc-500">
                        Terakhir dipakai{" "}
                        {new Date(paymentMethod.updated_at).toLocaleDateString("id-ID", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-zinc-500 font-mono">
                    Belum ada metode pembayaran terpakai
                  </div>
                )}

                <Link
                  href="/workspace/plans"
                  className="px-3 py-1.5 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-xs font-medium text-white transition-colors cursor-pointer border border-zinc-700/60 shrink-0 text-center"
                >
                  Kelola Plan
                </Link>
              </div>

              <div className="flex items-center gap-1.5 text-[10px] text-zinc-500">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-500/80 shrink-0" />
                <span>Diproses aman oleh Midtrans Snap — data kartu tidak menyentuh server kami.</span>
              </div>
            </div>

            {/* Card 2: Promo plan berikutnya — adaptif terhadap plan aktif.
                Business (plan tertinggi) menampilkan status card, bukan promo. */}
            {nextPromo ? (
              <div className="relative rounded-2xl border border-white/[0.08] hover:border-purple-500/25 bg-gradient-to-br from-purple-950/10 via-[#0c0d12] to-[#0c0d12] p-5.5 flex flex-col justify-between space-y-4 overflow-hidden transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-purple-500/5 blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-2 text-purple-300 font-semibold text-xs">
                    <Sparkles className="w-3.5 h-3.5 text-purple-400 fill-current" />
                    <span>{nextPromo.title}</span>
                  </div>
                  <Link
                    href={`/workspace/upgrade?plan=${nextPromo.planId}`}
                    className="px-3.5 py-1.5 rounded-xl bg-purple-600/90 hover:bg-purple-500 text-white font-semibold text-xs transition-all shadow-[0_0_10px_rgba(168,85,247,0.2)] cursor-pointer shrink-0"
                  >
                    Upgrade
                  </Link>
                </div>

                <div className="text-[11px] text-zinc-400 leading-relaxed relative z-10">
                  {promoSpec}
                </div>
                {promoPrice && (
                  <div className="text-[11px] text-purple-300/90 font-mono font-semibold relative z-10">
                    {promoPrice} / bulan
                  </div>
                )}
              </div>
            ) : (
              <div className="relative rounded-2xl border border-white/[0.08] hover:border-emerald-500/25 bg-gradient-to-br from-emerald-950/10 via-[#0c0d12] to-[#0c0d12] p-5.5 flex flex-col justify-between space-y-4 overflow-hidden transition-all">
                <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-2xl pointer-events-none" />

                <div className="flex items-start justify-between gap-4 relative z-10">
                  <div className="flex items-center gap-2 text-emerald-300 font-semibold text-xs">
                    <BadgeCheck className="w-3.5 h-3.5 text-emerald-400 fill-current" />
                    <span>Plan Tertinggi Aktif</span>
                  </div>
                  <span className="px-3.5 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-semibold text-xs shrink-0">
                    {currentPlan.name}
                  </span>
                </div>

                <div className="text-[11px] text-zinc-400 leading-relaxed relative z-10">
                  Anda sudah berada di plan tertinggi KotaCloud Spaces: {currentPlan.cpu_share} vCPU /{" "}
                  {fmtMem(currentPlan.memory_mb_per_service)} RAM per service, kolaborasi tim, backup
                  database otomatis, SLA 99.5%, dan dukungan prioritas 24/7.
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="h-[1px] bg-white/[0.06]" />

        {/* SECTION 3: Billing History (Invoices) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Billing History
            </h2>
            <span className="text-[11px] text-zinc-500 font-mono">
              {invoices.length} invoices recorded
            </span>
          </div>

          {isLoading ? (
            <div className="p-12 flex items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
              <Loader2 className="w-4 h-4 animate-spin text-cyan-400" />
              <span>Loading invoice history...</span>
            </div>
          ) : invoices.length === 0 ? (
            <div className="p-10 rounded-2xl border border-white/[0.06] bg-[#0c0d12] text-center space-y-2">
              <FileText className="w-8 h-8 text-zinc-600 mx-auto" />
              <p className="text-xs text-zinc-400 font-medium">No billing history found</p>
              <p className="text-[11px] text-zinc-500 max-w-sm mx-auto">
                Payment invoices will appear here after you subscribe to a plan or add compute credits.
              </p>
            </div>
          ) : (
            <div className="rounded-2xl border border-white/[0.06] bg-[#0c0d12] overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-white/[0.06] bg-zinc-950/60 text-zinc-400 font-mono text-[10px] uppercase">
                      <th className="px-5 py-3">Invoice</th>
                      <th className="px-5 py-3">Plan</th>
                      <th className="px-5 py-3">Amount (IDR)</th>
                      <th className="px-5 py-3">Payment Method</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3 text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04] text-zinc-300">
                    {invoices.map((inv) => (
                      <tr key={inv.id} className="hover:bg-zinc-900/30 transition-colors">
                        <td className="px-5 py-3.5 font-mono text-white font-semibold">
                          {inv.invoice_number}
                        </td>
                        <td className="px-5 py-3.5">{inv.plan_name}</td>
                        <td className="px-5 py-3.5 font-mono text-cyan-400 font-semibold">
                          Rp {inv.amount_idr.toLocaleString("id-ID")}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-400">{inv.payment_method}</td>
                        <td className="px-5 py-3.5 text-zinc-400 font-mono text-[11px]">
                          {new Date(inv.created_at).toLocaleDateString("id-ID", {
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          })}
                        </td>
                        <td className="px-5 py-3.5 text-right">
                          {inv.status === "paid" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-950/60 text-emerald-400 border border-emerald-800/40 text-[10px] font-mono font-medium">
                              <CheckCircle2 className="w-3 h-3" />
                              <span>Paid</span>
                            </span>
                          ) : inv.status === "pending" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-400 border border-amber-800/40 text-[10px] font-mono font-medium">
                              <Clock className="w-3 h-3" />
                              <span>Pending</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-zinc-900/80 text-zinc-500 border border-zinc-800 text-[10px] font-mono font-medium">
                              <XCircle className="w-3 h-3" />
                              <span>{inv.status === "failed" ? "Failed" : "Cancelled"}</span>
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

    </DashboardShell>
  );
}
