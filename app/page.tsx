"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/use-auth";
import { getStoredToken } from "@/lib/auth/token";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { Button } from "@/components/ui/button";
import { HeroNetworkCanvas } from "@/components/ui/hero-network-canvas";
import { StackedFeatureCards } from "@/components/ui/stacked-feature-cards";
import {
  Sparkles,
  ArrowRight,
  Loader2,
} from "lucide-react";

export default function LandingPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading } = useAuth();
  const [activeTab, setActiveTab] = useState("git");

  const [hasToken, setHasToken] = useState(() => {
    if (typeof window !== "undefined") {
      const token = getStoredToken();
      if (token) {
        document.cookie = "kospaces_session=1; path=/; max-age=604800; SameSite=Lax";
        return true;
      }
    }
    return false;
  });

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        document.cookie = "kospaces_session=1; path=/; max-age=604800; SameSite=Lax";
        router.replace("/workspace/projects");
      } else {
        setHasToken(false);
      }
    }
  }, [isAuthenticated, isLoading, router]);

  // If user is authenticated, loading auth, or has stored token, do not render landing page
  if (isLoading || isAuthenticated || hasToken) {
    return (
      <div className="min-h-screen bg-[#030304] flex flex-col items-center justify-center gap-3">
        <Loader2 className="w-7 h-7 text-cyan-400 animate-spin" />
        <span className="text-xs font-mono text-zinc-500">
          Loading KotaCloud Spaces...
        </span>
      </div>
    );
  }

  const frameworks = [
    { name: "JavaScript", icon: "JS" },
    { name: "Python", icon: "PY" },
    { name: "Go", icon: "GO" },
    { name: "Rust", icon: "RS" },
    { name: "TypeScript", icon: "TS" },
    { name: "PHP", icon: "PHP" },
  ];

  const previewTabs = [
    { id: "git", label: "Git Push to Deploy" },
    { id: "docker", label: "Docker Runtimes" },
    { id: "cli", label: "Local CLI Upload" },
    { id: "domains", label: "Custom Subdomains" },
    { id: "logs", label: "Real-time Telemetry" },
  ];

  return (
    <div className="min-h-screen bg-[#030304] text-zinc-100 flex flex-col selection:bg-cyan-400 selection:text-black relative">
      {/* Background Starfield & Radial Glow */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[500px] bg-radial-glow pointer-events-none" />

      {/* Top Navigation */}
      <Navbar />

      {/* Hero Section with Network Constellation Animation */}
      <section className="relative w-full min-h-screen flex flex-col items-center justify-center pt-20 pb-16 overflow-hidden">
        {/* Animated Constellation Canvas with Moving Dots along Paths */}
        <HeroNetworkCanvas />

        {/* Hero Content in Foreground */}
        <div className="relative z-10 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 text-center flex flex-col items-center">
          {/* Main Headline */}
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-white max-w-4xl leading-[1.1]">
            Build and deploy on the{" "}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">
              AI Cloud.
            </span>
          </h1>

          {/* Description Subtitle */}
          <p className="mt-6 text-base sm:text-lg text-zinc-400 max-w-2xl font-normal leading-relaxed">
            KotaCloud Spaces provides the developer tools and cloud infrastructure
            to build, scale, and secure a faster, more personalized web.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-4 w-full sm:w-auto">
            <Link href="/login" className="w-full sm:w-auto">
              <Button
                variant="primary"
                size="lg"
                className="rounded-full px-7 font-semibold text-sm w-full sm:w-auto"
                leftIcon={<Sparkles className="w-4 h-4 text-black" />}
              >
                Start Deploying
              </Button>
            </Link>

            <Link href="/workspace/projects" className="w-full sm:w-auto">
              <Button
                variant="secondary"
                size="lg"
                className="rounded-full px-7 text-sm w-full sm:w-auto bg-zinc-900/80 border-zinc-700/80"
                rightIcon={<ArrowRight className="w-4 h-4 text-zinc-400" />}
              >
                Explore Projects
              </Button>
            </Link>
          </div>

          {/* Technology & Framework Badges */}
          <div className="mt-14 w-full max-w-4xl border border-zinc-850/80 rounded-2xl bg-zinc-950/60 p-4 backdrop-blur-md">
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {frameworks.map((fw) => (
                <div
                  key={fw.name}
                  className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-zinc-900/50 border border-zinc-800/60 hover:border-cyan-500/40 transition-all text-xs font-mono group"
                >
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded border border-zinc-750 bg-zinc-800/80 text-zinc-300 group-hover:text-cyan-400 group-hover:border-cyan-500/40 transition-colors">
                    {fw.icon}
                  </span>
                  <span className="text-zinc-300 font-medium group-hover:text-white transition-colors">{fw.name}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Main Content Sections: Interactive Console, Callouts, Features */}
      <section className="relative pb-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center flex flex-col items-center">
        {/* Interactive PaaS Console Preview Card */}
        <div className="w-full max-w-5xl rounded-2xl border border-zinc-800 bg-[#07070a] shadow-2xl overflow-hidden text-left">
          {/* Mock Window Titlebar */}
          <div className="px-4 py-3 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-[#ff5f56] border border-[#e0443e]/50 shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#ffbd2e] border border-[#dea123]/50 shadow-sm" />
              <span className="w-3 h-3 rounded-full bg-[#27c93f] border border-[#1aab29]/50 shadow-sm" />
              <span className="ml-2 text-xs font-mono text-zinc-400">
                kotacloud-spaces // control-plane
              </span>
            </div>

            <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Engine Status: Online</span>
            </div>
          </div>

          {/* Interactive Preview Tabs */}
          <div className="px-4 py-2.5 border-b border-zinc-850 bg-zinc-900/40 flex items-center gap-2 overflow-x-auto">
            {previewTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`px-3 py-1 rounded-md text-xs font-mono transition-all cursor-pointer ${
                  activeTab === tab.id
                    ? "bg-zinc-800 text-cyan-300 border border-zinc-700 shadow-sm"
                    : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-850"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Console Output Body */}
          <div className="p-6 font-mono text-xs text-zinc-300 flex flex-col gap-2 min-h-[220px] bg-black/80">
            {activeTab === "git" && (
              <>
                <p className="text-zinc-500">
                  # Trigger deployment from Git repository via webhook or CLI
                </p>
                <p className="text-cyan-400">
                  $ kospaces deploy --git https://github.com/kotacloud-lab/microservice.git --branch main
                </p>
                <p className="text-zinc-400">[12:31:02] Resolving project context: <span className="text-white">microservice-prod</span></p>
                <p className="text-zinc-400">[12:31:04] Assigned container port: <span className="text-cyan-300">3000</span> | Allocated host port: <span className="text-cyan-300">3042</span></p>
                <p className="text-zinc-300">[12:31:08] <span className="text-amber-300 font-medium">Status: BUILDING</span> — Building container image...</p>
                <p className="text-zinc-400">[12:31:25] Build complete. Pushing to isolated execution plane...</p>
                <p className="text-emerald-400 font-semibold">[12:31:30] Status: RUNNING — Container is active and healthy.</p>
                <p className="text-zinc-300 mt-2">
                  Public URL: <a href="https://microservice.spaces.kotacloud.com" target="_blank" className="text-cyan-400 underline underline-offset-4">https://microservice.spaces.kotacloud.com</a>
                </p>
              </>
            )}

            {activeTab === "docker" && (
              <>
                <p className="text-zinc-500"># Direct Docker container deployment without local build</p>
                <p className="text-cyan-400">$ kospaces deploy --image redis:alpine --port 6379 --memory 256MB</p>
                <p className="text-zinc-400">[14:10:01] Engine verifying image signature from Docker Hub...</p>
                <p className="text-zinc-400">[14:10:04] Allocating dedicated cgroups: 0.5 CPU, 256MB RAM</p>
                <p className="text-emerald-400 font-semibold">[14:10:08] Status: RUNNING — Container started with ID 8f9b2a1c</p>
              </>
            )}

            {activeTab === "cli" && (
              <>
                <p className="text-zinc-500"># Instant local directory packaging and direct deployment</p>
                <p className="text-cyan-400">$ kospaces deploy ./my-web-app --subdomain myapp</p>
                <p className="text-zinc-400">[16:02:11] Creating archive: project.zip (4.2 MB)</p>
                <p className="text-zinc-400">[16:02:14] Uploading to KotaCloud Spaces Control Plane...</p>
                <p className="text-emerald-400 font-semibold">[16:02:22] Status: RUNNING — Deployed to myapp.spaces.kotacloud.com</p>
              </>
            )}

            {activeTab === "domains" && (
              <>
                <p className="text-zinc-500"># Automated reverse-proxy SSL & subdomain configuration</p>
                <p className="text-cyan-400">$ kospaces domain add api.company.com --project microservice</p>
                <p className="text-zinc-400">[09:15:02] DNS Verification: CNAME checked successfully</p>
                <p className="text-zinc-400">[09:15:05] Provisioning TLS certificate via Let&apos;s Encrypt...</p>
                <p className="text-emerald-400 font-semibold">[09:15:09] Active: https://api.company.com (HTTP/2 + TLS 1.3)</p>
              </>
            )}

            {activeTab === "logs" && (
              <>
                <p className="text-zinc-500"># High-throughput streaming container logs</p>
                <p className="text-cyan-400">$ kospaces logs --follow --level INFO</p>
                <p className="text-zinc-400">[18:00:01] [INFO] Server started on port 3000</p>
                <p className="text-zinc-400">[18:00:05] [INFO] Connected to PostgreSQL instance</p>
                <p className="text-zinc-400">[18:00:12] [INFO] HTTP GET /api/v1/health 200 OK (1.2ms)</p>
              </>
            )}
          </div>
        </div>

        {/* Two Callout Cards matching Screenshot 1 bottom layout */}
        <div className="mt-16 w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6 text-left">
          {/* Card 1 */}
          <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Ready to deploy?
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Start building with a free account. Speak to an expert for your{" "}
                <span className="text-cyan-400 font-semibold">Pro</span> or{" "}
                <span className="text-zinc-200 font-semibold">Enterprise</span> needs.
              </p>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <Link href="/login">
                <Button variant="primary" size="md" className="rounded-full px-5 text-xs font-semibold">
                  Start Deploying
                </Button>
              </Link>
              <Link href="/workspace/projects">
                <Button variant="outline" size="md" className="rounded-full px-5 text-xs">
                  Talk to an Expert
                </Button>
              </Link>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-8 rounded-2xl border border-zinc-800 bg-zinc-950/70 backdrop-blur-md flex flex-col justify-between">
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">
                Explore KotaCloud Spaces
              </h3>
              <p className="mt-2 text-sm text-zinc-400 leading-relaxed">
                Experience an interactive product tour, trial, or a personalized
                demonstration of container lifecycle management.
              </p>
            </div>

            <div className="mt-6">
              <Link href="/workspace/projects">
                <Button
                  variant="secondary"
                  size="md"
                  className="rounded-full px-5 text-xs"
                  rightIcon={<ArrowRight className="w-3.5 h-3.5 text-zinc-400" />}
                >
                  Explore Workspace
                </Button>
              </Link>
            </div>
          </div>
        </div>

        {/* Architecture & Features with Stacking Cards Animation */}
        <div id="features" className="mt-32 w-full max-w-5xl text-left">
          <div className="text-center mb-10">
            <h2 className="text-xs font-mono uppercase tracking-widest text-cyan-400 mb-2">
              Architecture & Features
            </h2>
            <p className="text-3xl sm:text-4xl font-bold text-white tracking-tight">
              Built for speed, developer ergonomics, and total control.
            </p>
            <p className="mt-3 text-sm text-zinc-400 max-w-xl mx-auto">
              Production-ready cloud architecture designed for containerized applications, automated routing, and instant telemetry.
            </p>
          </div>

          {/* Stacking Cards Container */}
          <StackedFeatureCards />
        </div>
      </section>

      {/* Footer */}
      <Footer />
    </div>
  );
}
