"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { useAuth } from "@/hooks/use-auth";
import {
  getPlansApi,
  getSubscriptionApi,
  PlanDefinition,
  SubscriptionResponse,
} from "@/lib/api/billing";
import { getFallbackPlan, FALLBACK_PLAN_LIST } from "@/lib/billing/fallback-plans";
import { useToast } from "@/lib/toast/toast-context";
import {
  Sparkles,
  Check,
  ChevronRight,
  Loader2,
} from "lucide-react";

export default function PlansPage() {
  const { user, refreshUser } = useAuth();
  const toast = useToast();

  const [plans, setPlans] = useState<PlanDefinition[]>([]);
  const [subscription, setSubscription] = useState<SubscriptionResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Load plans & subscription
  const loadData = async () => {
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
  };

  useEffect(() => {
    loadData();
  }, []);

  const activePlanId = subscription?.plan?.id || user?.plan || "starter";
  const activePlan = useMemo(() => {
    return (
      plans.find((p) => p.id === activePlanId) ||
      subscription?.plan ||
      getFallbackPlan(activePlanId)
    );
  }, [plans, activePlanId, subscription]);

  // User avatar resolver
  const avatarUrl = user?.avatar_url || (user?.email ? `https://unavatar.io/${encodeURIComponent(user.email)}` : null);
  const userName = user?.name || user?.email?.split("@")[0] || "Developer";

  return (
    <DashboardShell
      title="Plans"
      subtitle="Manage compute capacity, pod resource limits, and KotaCloud Spaces service tiers."
      showCreateButton={false}
    >
      <div className="space-y-10 w-full max-w-6xl mx-auto py-2">
        {/* SECTION 1: Active Plan (Railway-Style Large Card) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-semibold tracking-wider text-zinc-400 uppercase">
              Active Plan
            </h2>
            <button
              onClick={() => {
                document.getElementById("plan-comparison")?.scrollIntoView({ behavior: "smooth" });
              }}
              className="text-xs font-medium text-cyan-400 hover:text-cyan-300 transition-colors flex items-center gap-1.5 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>View Upgrade Options</span>
            </button>
          </div>

          <div className="relative rounded-2xl border border-white/[0.08] bg-[#0c0d12] p-8 md:p-9 shadow-xl overflow-hidden">
            {/* Subtle ambient background glow */}
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-80 h-40 bg-gradient-to-b from-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

            <div className="relative z-10 flex flex-col items-center text-center max-w-xl mx-auto space-y-5">
              {/* User Avatar with refined ring */}
              <div className="relative">
                <div className="w-16 h-16 rounded-full p-0.5 border border-cyan-500/30 bg-zinc-900/80 shadow-[0_0_12px_rgba(0,210,255,0.12)] flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={userName}
                      className="w-full h-full object-cover rounded-full"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-gradient-to-br from-cyan-900/60 to-zinc-900 flex items-center justify-center text-lg font-bold text-cyan-200">
                      {userName.slice(0, 2).toUpperCase()}
                    </div>
                  )}
                </div>
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-zinc-900 border border-cyan-500/40 text-cyan-300 font-bold text-[9px] tracking-wider uppercase shadow-sm">
                  {activePlan.name}
                </div>
              </div>

              {/* Title & description */}
              <div className="space-y-1.5">
                <h3 className="text-xl md:text-2xl font-bold text-white tracking-tight">
                  {activePlan.name} Plan
                </h3>
                <p className="text-xs md:text-sm text-zinc-400 leading-relaxed">
                  {activePlan.id === "starter"
                    ? "You are currently on the free Starter Plan. Upgrade to Developer or Professional for always-on pods, custom domains with SSL, and managed databases."
                    : `You are subscribed to the ${activePlan.name} Plan. Enjoy managed compute capacity and active production features.`}
                </p>
              </div>

              {/* Badges / Specs Pill Row */}
              <div className="w-full grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-2">
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.05] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-medium">Projects</span>
                  <span className="text-xs font-bold text-zinc-200 mt-0.5">
                    {subscription?.projects_count ?? 0} / {activePlan.max_projects === -1 ? "Unlimited" : activePlan.max_projects}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.05] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-medium">Services</span>
                  <span className="text-xs font-bold text-zinc-200 mt-0.5">
                    {subscription?.services_count ?? 0} / {activePlan.max_services === -1 ? "Unlimited" : activePlan.max_services}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.05] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-medium">RAM per Service</span>
                  <span className="text-xs font-bold text-zinc-200 mt-0.5">
                    {activePlan.memory_mb_per_service >= 1024
                      ? `${activePlan.memory_mb_per_service / 1024} GB`
                      : `${activePlan.memory_mb_per_service} MB`}
                  </span>
                </div>
                <div className="p-3 rounded-xl bg-zinc-900/40 border border-white/[0.05] flex flex-col items-center justify-center text-center">
                  <span className="text-[10px] uppercase font-mono text-zinc-500 font-medium">CPU Limit</span>
                  <span className="text-xs font-bold text-zinc-200 mt-0.5">
                    {activePlan.cpu_share} vCPU
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 2: Plan Comparison Grid */}
        <div id="plan-comparison" className="space-y-6 pt-4">
          <div className="text-center max-w-xl mx-auto space-y-2">
            <h2 className="text-xl md:text-2xl font-bold text-white tracking-tight">
              Ready to go further with a monthly plan?
            </h2>
            <p className="text-xs text-zinc-400">
              Upgrade and outship the competition with dedicated compute limits & transparent local pricing.
            </p>
          </div>

          {isLoading ? (
            <div className="p-16 flex items-center justify-center gap-3 text-zinc-400">
              <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
              <span className="text-xs font-mono">Loading plan tiers...</span>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4.5">
              {(plans.length > 0 ? plans : FALLBACK_PLAN_LIST).map((plan) => {
                const isCurrent = plan.id === activePlanId;
                const isPopular = plan.is_popular;

                return (
                  <div
                    key={plan.id}
                    className={`relative rounded-2xl flex flex-col justify-between transition-all duration-200 ${
                      isPopular
                        ? "border border-cyan-500/40 bg-gradient-to-b from-cyan-950/15 via-[#0c0d12] to-[#0c0d12] shadow-[0_0_16px_-4px_rgba(0,210,255,0.12)]"
                        : "border border-white/[0.07] bg-[#0c0d12] hover:border-zinc-700/80"
                    }`}
                  >
                    {/* Refined Popular / Recommended Pill */}
                    {isPopular && (
                      <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full bg-[#0c0d12] border border-cyan-400/50 text-cyan-300 font-bold text-[10px] tracking-wider uppercase shadow-sm flex items-center gap-1">
                        <Sparkles className="w-3 h-3 fill-current text-cyan-400" />
                        <span>Most Popular</span>
                      </div>
                    )}

                    <div className="p-5.5 space-y-4.5">
                      {/* Plan Name & Highlight */}
                      <div>
                        <div className="flex items-center justify-between">
                          <h3 className="text-base font-bold text-white">{plan.name}</h3>
                          {isCurrent && (
                            <span className="text-[10px] font-mono font-medium px-2 py-0.5 rounded-md bg-zinc-900 text-cyan-400 border border-cyan-500/25">
                              Active
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-zinc-400 mt-1 font-medium">{plan.highlight}</p>
                      </div>

                      {/* Pricing */}
                      <div className="pt-0.5">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-2xl font-black text-white tracking-tight">
                            {plan.price_formatted}
                          </span>
                          <span className="text-xs text-zinc-400 font-mono">
                            /{plan.id === "starter" ? "forever" : "mo"}
                          </span>
                        </div>
                        <div className="text-[10px] text-zinc-500 font-mono mt-0.5">
                          {plan.price_usd_equiv} USD equivalent
                        </div>
                      </div>

                      {/* Spec Badges Quick Row */}
                      <div className="p-2.5 rounded-xl bg-zinc-950/70 border border-white/[0.04] space-y-1 text-[11px] font-mono">
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="text-zinc-500">RAM/pod:</span>
                          <span className="font-semibold text-zinc-200">
                            {plan.memory_mb_per_service >= 1024
                              ? `${plan.memory_mb_per_service / 1024} GB`
                              : `${plan.memory_mb_per_service} MB`}
                          </span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="text-zinc-500">vCPU:</span>
                          <span className="font-semibold text-zinc-200">{plan.cpu_share} Core</span>
                        </div>
                        <div className="flex items-center justify-between text-zinc-300">
                          <span className="text-zinc-500">Limits:</span>
                          <span className="font-semibold text-zinc-200">
                            {plan.max_projects === -1 ? "∞" : plan.max_projects} Proj •{" "}
                            {plan.max_services === -1 ? "∞" : plan.max_services} Svc
                          </span>
                        </div>
                      </div>

                      {/* Features Checklist */}
                      <div className="space-y-2 pt-2 border-t border-white/[0.05]">
                        <span className="text-[10px] font-mono uppercase font-semibold text-zinc-500 tracking-wider">
                          Features
                        </span>
                        <ul className="space-y-2 text-xs">
                          {plan.features.map((feature, i) => (
                            <li key={i} className="flex items-start gap-2 text-zinc-300 text-[11px] min-w-0">
                              <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                              <span className="leading-snug break-words min-w-0 flex-1">{feature}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {/* Footer Action Button */}
                    <div className="p-5.5 pt-0">
                      {isCurrent ? (
                        <div className="w-full py-2.5 px-4 rounded-xl bg-zinc-900/80 border border-zinc-800 text-zinc-500 text-xs font-semibold text-center select-none cursor-default">
                          Current Plan
                        </div>
                      ) : (
                        <Link
                          href={`/workspace/upgrade?plan=${plan.id}`}
                          className={`w-full py-2.5 px-4 rounded-xl font-semibold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                            isPopular
                              ? "bg-cyan-400 hover:bg-cyan-300 text-black shadow-[0_0_12px_rgba(0,210,255,0.2)]"
                              : "bg-white hover:bg-zinc-200 text-black"
                          }`}
                        >
                          <span>{plan.price_idr === 0 ? "Downgrade to Starter" : `Choose ${plan.name}`}</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Link>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </DashboardShell>
  );
}
