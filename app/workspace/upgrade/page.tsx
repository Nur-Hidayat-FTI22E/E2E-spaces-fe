"use client";

import React, { useEffect, useState, useMemo, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  getPlansApi,
  getSubscriptionApi,
  checkoutApi,
  simulatePaymentApi,
  PlanDefinition,
  SubscriptionResponse,
} from "@/lib/api/billing";
import { getFallbackPlan } from "@/lib/billing/fallback-plans";
import { useToast } from "@/lib/toast/toast-context";
import {
  CreditCard,
  QrCode,
  Building2,
  Smartphone,
  Lock,
  Loader2,
  Check,
  ArrowLeft,
  AlertCircle,
  ExternalLink,
} from "lucide-react";

type SnapCallbacks = {
  onSuccess: (result: Record<string, unknown>) => void;
  onPending: (result: Record<string, unknown>) => void;
  onError: (result: Record<string, unknown>) => void;
  onClose: () => void;
};

type SnapWindow = Window & {
  snap?: { pay: (token: string, callbacks: SnapCallbacks) => void };
};

// Muat snap.js sekali (sandbox atau production sesuai config backend).
function loadSnapScript(isProduction: boolean, clientKey: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const w = window as unknown as SnapWindow;
    if (w.snap) {
      resolve();
      return;
    }
    const src = isProduction
      ? "https://app.midtrans.com/snap/snap.js"
      : "https://app.sandbox.midtrans.com/snap/snap.js";
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Gagal memuat Midtrans Snap.")));
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    if (clientKey) {
      script.setAttribute("data-client-key", clientKey);
    }
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Gagal memuat Midtrans Snap."));
    document.body.appendChild(script);
  });
}

function UpgradeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const queryPlan = searchParams.get("plan");

  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string>("developer");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubscribing, setIsSubscribing] = useState(false);

  // Load plans & subscription
  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [plansData, subData] = await Promise.all([
          getPlansApi(),
          getSubscriptionApi().catch(() => null),
        ]);
        setPlans(plansData);
        if (subData) {
          setSubscription(subData);
        }
      } catch (err: unknown) {
        console.error("Failed to load plans data:", err);
      } finally {
        setIsLoading(false);
      }
    }
    loadData();
  }, []);

  // Update selected plan from query param
  useEffect(() => {
    if (!queryPlan) return;
    const normalized = queryPlan.toLowerCase();
    if (normalized === "pro") {
      setSelectedPlanId("professional");
    } else if (["starter", "developer", "professional", "business"].includes(normalized)) {
      setSelectedPlanId(normalized);
    }
  }, [queryPlan]);

  // Current selected plan definition
  const currentPlan = useMemo(() => {
    const found = plans.find((p) => p.id === selectedPlanId);
    if (found) return found;

    // Utamakan katalog dari API; fallback ke mirror lokal bila belum termuat/gagal.
    return plans.find((p) => p.id === selectedPlanId) || getFallbackPlan(selectedPlanId);
  }, [plans, selectedPlanId]);

  // Compute next / alternative switch links
  const switchTarget = useMemo(() => {
    switch (selectedPlanId) {
      case "starter":
        return { label: "Need more? Switch to Developer", planId: "developer" };
      case "developer":
        return { label: "Need more? Switch to Professional", planId: "professional" };
      case "professional":
        return { label: "Need less? Switch to Developer", planId: "developer" };
      case "business":
        return { label: "Need less? Switch to Professional", planId: "professional" };
      default:
        return { label: "Switch to Developer", planId: "developer" };
    }
  }, [selectedPlanId]);

  // Connected payment method from Billing
  const savedPaymentMethod = subscription?.payment_method;

  // Handle plan subscription: checkout -> Midtrans Snap -> webhook activates plan
  const handleSubscribe = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!currentPlan) return;

    if (currentPlan.price_idr <= 0) {
      toast.info("Plan Gratis", {
        message: "Starter aktif secara default dan tidak memerlukan pembayaran.",
      });
      return;
    }

    setIsSubscribing(true);

    try {
      // 1) Buat invoice pending + Snap token
      const co = await checkoutApi({ plan_id: currentPlan.id });

      // 2a) Mode simulasi (Midtrans belum dikonfigurasi di backend):
      // tandai invoice lunas langsung untuk testing alur end-to-end.
      if (co.simulated) {
        const paid = await simulatePaymentApi(co.invoice.id);
        await refreshUser?.();
        const until = paid.period_end
          ? new Date(paid.period_end).toLocaleDateString("id-ID", {
              day: "2-digit",
              month: "short",
              year: "numeric",
            })
          : "1 bulan ke depan";
        toast.success("Pembayaran Simulasi Berhasil!", {
          message: `Plan ${currentPlan.name} aktif hingga ${until}. Isi MIDTRANS_SERVER_KEY di backend untuk pembayaran nyata.`,
        });
        setTimeout(() => {
          router.push("/workspace/billing");
        }, 1400);
        return;
      }

      // 2b) Pembayaran nyata via Midtrans Snap popup
      await loadSnapScript(co.is_production, co.client_key || "");
      const snap = (window as unknown as SnapWindow).snap;
      if (!snap) {
        // Fallback: redirect ke halaman pembayaran Snap penuh
        if (co.snap_redirect_url) {
          window.location.href = co.snap_redirect_url;
        }
        return;
      }

      snap.pay(co.snap_token, {
        onSuccess: async () => {
          await refreshUser?.();
          toast.success("Pembayaran Berhasil!", {
            message: `Welcome to the ${currentPlan.name} Plan! Kuota dan resource Anda sudah di-upgrade.`,
          });
          setIsSubscribing(false);
          setTimeout(() => {
            router.push("/workspace/billing");
          }, 1200);
        },
        onPending: () => {
          toast.info("Menunggu Pembayaran", {
            message: "Selesaikan pembayaran. Anda bisa melanjutkannya dari halaman Billing.",
          });
          setIsSubscribing(false);
        },
        onError: () => {
          toast.error("Pembayaran Gagal", {
            message: "Terjadi kesalahan saat memproses pembayaran. Silakan coba lagi.",
          });
          setIsSubscribing(false);
        },
        onClose: () => {
          toast.warning("Checkout Ditutup", {
            message: "Invoice masih pending — lanjutkan pembayaran dari halaman Billing kapan saja.",
          });
          setIsSubscribing(false);
        },
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to process subscription";
      toast.error("Checkout Error", { message: msg });
      setIsSubscribing(false);
    }
  };

  return (
    <DashboardShell
      title="Subscribe"
      subtitle="Upgrade your resources, remove usage limits, and ship with ease."
      showCreateButton={false}
    >
      <div className="w-full max-w-3xl mx-auto py-4 space-y-7">
        {/* Back Link & Title */}
        <div className="flex items-center justify-between">
          <Link
            href="/workspace/plans"
            className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1.5"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Plans</span>
          </Link>

          {/* Quick Plan Switcher Pills */}
          <div className="flex items-center p-1 rounded-xl bg-zinc-900/80 border border-white/[0.06] text-xs font-mono">
            {(["starter", "developer", "professional", "business"] as const).map((id) => {
              const label =
                id === "starter"
                  ? "Starter"
                  : id === "developer"
                  ? "Developer"
                  : id === "professional"
                  ? "Professional"
                  : "Business";
              const isSelected = selectedPlanId === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() => setSelectedPlanId(id)}
                  className={`px-3 py-1 rounded-lg transition-all text-[11px] font-medium cursor-pointer ${
                    isSelected
                      ? "bg-zinc-800 text-white shadow-sm"
                      : "text-zinc-400 hover:text-zinc-200"
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Page Hero Heading (Matching Railway) */}
        <div className="text-center space-y-1.5 pt-1">
          <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
            Subscribe
          </h1>
          <p className="text-xs md:text-sm text-zinc-400">
            Upgrade your resources, remove usage limits, and ship with ease.
          </p>
        </div>

        {/* =======================================================
            TOP CARD: PLAN SPECIFICATION & DETAILS (Matching Railway)
        ======================================================= */}
        <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0d12] shadow-xl overflow-hidden">
          <div className="p-6 md:p-8 grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-8">
            {/* Left Column: Plan Name, Highlight & Pricing */}
            <div className="md:col-span-5 flex flex-col justify-between space-y-6">
              <div className="space-y-2">
                <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {currentPlan.name}
                </h2>
                <p className="text-xs text-zinc-400 leading-relaxed font-normal">
                  {currentPlan.highlight}
                </p>
              </div>

              {/* Price block */}
              <div className="pt-4">
                <div className="flex items-baseline gap-1.5">
                  <span className="text-3xl md:text-4xl font-black text-white tracking-tight font-sans">
                    {currentPlan.price_formatted}
                  </span>
                  <span className="text-xs text-zinc-400 font-mono">
                    /{currentPlan.id === "starter" ? "forever" : "mo"}
                  </span>
                </div>
                <div className="text-[10px] text-zinc-500 font-mono tracking-wider uppercase mt-1">
                  {currentPlan.id === "starter" ? "FREE WORKSPACE" : "MINIMUM USAGE"}
                </div>
              </div>
            </div>

            {/* Right Column: Spec List (Rows with clean separation) */}
            <div className="md:col-span-7 flex flex-col justify-center divide-y divide-white/[0.05] text-xs">
              {currentPlan.features.map((feature, idx) => (
                <div key={idx} className="py-2.5 first:pt-0 last:pb-0 flex items-start gap-2.5">
                  <Check className="w-3.5 h-3.5 text-purple-400 shrink-0 mt-0.5" />
                  <span className="text-zinc-300 text-[12px] leading-snug break-words">
                    {feature}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Bottom Switch Link Banner (e.g. "Need more? Switch to Pro") */}
          <div className="px-6 py-2.5 bg-zinc-950/60 border-t border-white/[0.05] flex items-center justify-center text-center">
            <button
              type="button"
              onClick={() => setSelectedPlanId(switchTarget.planId)}
              className="text-xs text-zinc-400 hover:text-white transition-colors flex items-center gap-1 cursor-pointer font-medium"
            >
              <span>{switchTarget.label}</span>
            </button>
          </div>
        </div>

        {/* =======================================================
            BOTTOM CARD: SUBSCRIPTION CONFIRMATION (Using Connected Billing Method)
        ======================================================= */}
        <div className="rounded-2xl border border-white/[0.08] bg-[#0c0d12] shadow-xl overflow-hidden p-6 md:p-8 space-y-6">
          {/* Header Row */}
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-white/[0.05] pb-5">
            <div className="space-y-0.5">
              <h3 className="text-sm font-semibold text-white">
                Start a new usage-based subscription
              </h3>
            </div>
            <div className="text-xs text-zinc-400 sm:text-right max-w-xs font-normal">
              {currentPlan.price_idr > 0 ? (
                <>We will charge you for your usage at {currentPlan.price_formatted} at the start of each billing cycle.</>
              ) : (
                <>Free forever. No payment method or usage charge required.</>
              )}
            </div>
          </div>

          {/* Payment Method Connected State */}
          <div className="space-y-4">
            {currentPlan.price_idr > 0 ? (
              savedPaymentMethod ? (
                /* Method is already connected in Billing */
                <div className="p-4 rounded-xl bg-zinc-900/60 border border-white/[0.06] flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-zinc-900 border border-white/[0.08] text-purple-400 flex items-center justify-center shrink-0">
                      {savedPaymentMethod.type === "card" && <CreditCard className="w-5 h-5" />}
                      {savedPaymentMethod.type === "qris" && <QrCode className="w-5 h-5" />}
                      {savedPaymentMethod.type === "va" && <Building2 className="w-5 h-5" />}
                      {savedPaymentMethod.type === "ewallet" && <Smartphone className="w-5 h-5" />}
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-white flex items-center gap-2">
                        <span>Paying with: {savedPaymentMethod.brand}{savedPaymentMethod.last4 ? ` •••• ${savedPaymentMethod.last4}` : ""}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40">
                          Connected
                        </span>
                      </div>
                      <div className="text-[11px] text-zinc-400 font-mono mt-0.5">
                        Recorded from your last Midtrans payment • Managed in Billing
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/workspace/billing"
                    className="text-xs font-medium text-purple-400 hover:text-purple-300 transition-colors flex items-center gap-1 shrink-0 ml-2"
                  >
                    <span>Change in Billing</span>
                    <ExternalLink className="w-3 h-3" />
                  </Link>
                </div>
              ) : (
                /* No payment method connected yet in Billing */
                <div className="p-4 rounded-xl bg-amber-950/20 border border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="flex items-start sm:items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 sm:mt-0">
                      <AlertCircle className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-semibold text-amber-200">
                        Pembayaran via Midtrans Snap
                      </div>
                      <div className="text-[11px] text-amber-300/70 leading-relaxed">
                        Checkout mendukung QRIS, Virtual Account, GoPay, ShopeePay, dan kartu kredit. Metode bayar dipilih saat checkout.
                      </div>
                    </div>
                  </div>
                  <Link
                    href="/workspace/billing"
                    className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/30 text-amber-300 text-xs font-medium transition-colors shrink-0 text-center flex items-center justify-center gap-1.5"
                  >
                    <span>Connect in Billing</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </Link>
                </div>
              )
            ) : (
              /* Starter free tier */
              <div className="p-4 rounded-xl bg-zinc-900/40 border border-white/[0.05] flex items-center justify-between text-xs text-zinc-400">
                <span>Free Starter Tier — No payment method required.</span>
                <span className="font-mono text-zinc-500 text-[11px]">Rp 0 / forever</span>
              </div>
            )}

            {/* Subscribe Action Button (Railway Signature Purple as in screenshot) */}
            <div className="space-y-2 pt-2">
              {
                /* Primary Subscribe Button — payment via Midtrans Snap checkout */
                <button
                  type="button"
                  onClick={() => handleSubscribe()}
                  disabled={isSubscribing}
                  className={`w-full py-3 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                    currentPlan.id === "starter"
                      ? "bg-white hover:bg-zinc-200 text-black shadow-sm"
                      : "bg-[#7027b7] hover:bg-[#8332d4] active:bg-[#601f9e] text-white shadow-[0_0_20px_-3px_rgba(147,51,234,0.4)]"
                  }`}
                >
                  {isSubscribing ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-current" />
                      <span>Processing Subscription...</span>
                    </>
                  ) : (
                    <>
                      <Lock className="w-3.5 h-3.5 text-current" />
                      <span>Subscribe to {currentPlan.name} Plan</span>
                    </>
                  )}
                </button>
              }

              {/* Disclaimer text under button (matching Railway screenshot) */}
              <p className="text-[11px] text-zinc-500 text-center font-normal">
                {currentPlan.price_idr > 0 ? (
                  <>Anda akan dibayar {currentPlan.price_formatted} di muka melalui Midtrans (QRIS / Virtual Account / GoPay / kartu).</>
                ) : (
                  <>You are activating the free Starter plan. No credit card required.</>
                )}
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardShell>
  );
}

export default function UpgradePage() {
  return (
    <Suspense
      fallback={
        <DashboardShell title="Subscribe" subtitle="Loading plan details..." showCreateButton={false}>
          <div className="p-20 flex items-center justify-center gap-2 text-zinc-400 text-xs font-mono">
            <Loader2 className="w-5 h-5 animate-spin text-purple-400" />
            <span>Loading subscribe details...</span>
          </div>
        </DashboardShell>
      }
    >
      <UpgradeContent />
    </Suspense>
  );
}
