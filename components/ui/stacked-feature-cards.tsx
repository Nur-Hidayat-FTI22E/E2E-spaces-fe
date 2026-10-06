"use client";

import React from "react";
import {
  Code2,
  Layers,
  Globe,
  Terminal,
  ShieldCheck,
  CheckCircle2,
  Check,
  Sparkles,
  Lock,
} from "lucide-react";

interface FeatureCardData {
  id: string;
  badgeIcon: React.ReactNode;
  accentColor: string;
  glowColor: string;
  topGlow: string;
  title: string;
  subtitle: string;
  bullets: string[];
  mockup: React.ReactNode;
}

export function StackedFeatureCards() {
  const cards: FeatureCardData[] = [
    {
      id: "git-deploy",
      badgeIcon: <Code2 className="w-6 h-6 text-cyan-400" />,
      accentColor: "border-cyan-500/30",
      glowColor: "rgba(0, 229, 255, 0.15)",
      topGlow: "from-cyan-500/15",
      title: "Connect repo. Git push to deploy.",
      subtitle:
        "Connect GitHub or GitLab. KotaCloud Spaces automatically detects your runtime, builds your container with layer caching, and launches with zero DevOps hassle.",
      bullets: [
        "Auto-detect frameworks (Next.js, Node, Python, Go, Rust)",
        "Zero-downtime rolling container deployments",
        "High-throughput BuildKit engine with layer caching",
        "Instant one-click rollback to previous commits",
      ],
      mockup: (
        <div className="rounded-2xl border border-zinc-800/90 bg-zinc-950/70 backdrop-blur-md p-5 w-full max-w-2xl mx-auto shadow-xl">
          {/* Pipeline stages */}
          <div className="flex items-center justify-between gap-2 pb-4 border-b border-zinc-850">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Check className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-mono text-emerald-400 block font-semibold">Push</span>
                <span className="text-[10px] text-zinc-500">Verified</span>
              </div>
            </div>

            <div className="w-8 sm:w-12 h-0.5 bg-emerald-500/40 rounded-full" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Check className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-mono text-emerald-400 block font-semibold">Build</span>
                <span className="text-[10px] text-zinc-500">28s cached</span>
              </div>
            </div>

            <div className="w-8 sm:w-12 h-0.5 bg-emerald-500/40 rounded-full" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Check className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-mono text-emerald-400 block font-semibold">Test</span>
                <span className="text-[10px] text-zinc-500">42 passed</span>
              </div>
            </div>

            <div className="w-8 sm:w-12 h-0.5 bg-cyan-500/40 rounded-full" />

            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 animate-pulse">
                <Sparkles className="w-4 h-4" />
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-mono text-cyan-300 block font-semibold">Deploy</span>
                <span className="text-[10px] text-cyan-400/80">Live</span>
              </div>
            </div>
          </div>

          {/* Commit detail bar */}
          <div className="mt-4 flex items-center justify-between text-xs font-mono">
            <div className="flex items-center gap-2.5 truncate">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-zinc-300 font-medium truncate">feat: add distributed cache layer</span>
              <span className="text-zinc-500 text-[11px] hidden sm:inline">main ← #a7f3c2</span>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-cyan-300 text-[10px] font-bold">
              v1.0.4 Live
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "docker-runtimes",
      badgeIcon: <Layers className="w-6 h-6 text-indigo-400" />,
      accentColor: "border-indigo-500/30",
      glowColor: "rgba(99, 102, 241, 0.15)",
      topGlow: "from-indigo-500/15",
      title: "Run any container in isolated sandboxes.",
      subtitle:
        "Pull standard Docker images from public or private registries, or compile custom Dockerfiles. Allocate dedicated vCPU and RAM with full lifecycle controls.",
      bullets: [
        "Public & private registry support (Docker Hub, GHCR, Quay)",
        "Configurable vCPU & RAM limits with dynamic throttling",
        "Instant lifecycle triggers: Start, Stop, Restart, and Terminate",
        "Encrypted internal pod virtualization on Linux namespaces",
      ],
      mockup: (
        <div className="w-full max-w-2xl mx-auto grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Pod Card 1 */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-sm text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-indigo-400 text-xs font-mono">
                  JS
                </div>
                <span className="text-xs font-bold text-white font-mono">web-app</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                running
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 border-t border-zinc-850 pt-2.5">
              <span>2 vCPU · 2GB RAM</span>
              <span className="text-cyan-400">Port :3000</span>
            </div>

            {/* Load meter */}
            <div className="mt-2.5">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                <span>CPU Load</span>
                <span className="text-zinc-300">32%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-indigo-400 rounded-full w-[32%]" />
              </div>
            </div>
          </div>

          {/* Pod Card 2 */}
          <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-sm text-left">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 text-xs font-mono">
                  GO
                </div>
                <span className="text-xs font-bold text-white font-mono">api-service</span>
              </div>
              <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-[10px] font-mono text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                running
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between text-[11px] font-mono text-zinc-400 border-t border-zinc-850 pt-2.5">
              <span>4 vCPU · 4GB RAM</span>
              <span className="text-cyan-400">Port :8080</span>
            </div>

            {/* Load meter */}
            <div className="mt-2.5">
              <div className="flex justify-between text-[10px] font-mono text-zinc-500 mb-1">
                <span>Memory</span>
                <span className="text-zinc-300">48%</span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-cyan-400 rounded-full w-[48%]" />
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "custom-subdomains",
      badgeIcon: <Globe className="w-6 h-6 text-emerald-400" />,
      accentColor: "border-emerald-500/30",
      glowColor: "rgba(16, 185, 129, 0.15)",
      topGlow: "from-emerald-500/15",
      title: "Instant subdomains with automatic SSL.",
      subtitle:
        "Every deployed container instantly gets a fast HTTPS domain under .spaces.kotacloud.com. Add your custom domains with zero DNS hassle and automated TLS certificates.",
      bullets: [
        "Free automatic *.spaces.kotacloud.com subdomains",
        "Automated Let's Encrypt Wildcard SSL certificates",
        "Instant global reverse proxy with automatic HTTP->HTTPS",
        "Apex & CNAME custom domain verification in seconds",
      ],
      mockup: (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-sm p-4 w-full max-w-2xl mx-auto text-left shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
            <span className="text-xs font-mono uppercase tracking-wider text-zinc-400">Assigned Endpoints</span>
            <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Edge Proxy Active
            </span>
          </div>

          <div className="mt-3 space-y-2.5">
            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span className="text-white font-medium">demo-app.spaces.kotacloud.com</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="px-2 py-0.5 rounded bg-zinc-800 text-cyan-300 text-[10px]">Default</span>
                <span>TLS 1.3 Active</span>
              </div>
            </div>

            <div className="p-3 rounded-xl border border-zinc-800 bg-zinc-900/50 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-mono">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-white font-medium">api.kotacloud.dev</span>
              </div>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400">
                <span className="px-2 py-0.5 rounded bg-emerald-950/50 text-emerald-300 border border-emerald-500/30 text-[10px]">
                  Custom Domain
                </span>
                <span>Verified</span>
              </div>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "terminal-logs",
      badgeIcon: <Terminal className="w-6 h-6 text-violet-400" />,
      accentColor: "border-violet-500/30",
      glowColor: "rgba(168, 85, 247, 0.15)",
      topGlow: "from-violet-500/15",
      title: "Log & debug directly without SSH.",
      subtitle:
        "Stream live build and runtime stdout/stderr logs straight into your browser. Search, filter by severity level, and diagnose issues without configuring server access.",
      bullets: [
        "High-performance Server-Sent Events (SSE) streaming",
        "Log-level severity badges (INFO, WARN, ERROR, DEBUG)",
        "Instant regex and keyword search across live output",
        "Zero server SSH key management or port opening",
      ],
      mockup: (
        <div className="rounded-2xl border border-zinc-800 bg-[#07070a] shadow-xl overflow-hidden w-full max-w-2xl mx-auto text-left font-mono">
          {/* Mock titlebar */}
          <div className="px-4 py-2.5 border-b border-zinc-800 bg-zinc-950 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              <span className="ml-2 text-zinc-400 text-[11px]">telemetry-viewer // live-stream</span>
            </div>
            <div className="flex items-center gap-2 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>LIVE</span>
            </div>
          </div>

          {/* Terminal log lines */}
          <div className="p-4 text-xs space-y-1.5 bg-[#050508]/90">
            <p className="text-zinc-500">[19:42:01] [INFO] Container engine initialized in 21ms</p>
            <p className="text-cyan-400">[19:42:02] [INFO] HTTP server listening on 0.0.0.0:8080</p>
            <p className="text-zinc-400">[19:42:03] [INFO] Database pool connected (pool_size=16)</p>
            <p className="text-emerald-400">[19:42:08] [INFO] Health check 200 OK — latency 1.4ms</p>
            <p className="text-zinc-400">[19:42:12] [INFO] TLS handshake completed via Edge Gateway</p>
          </div>
        </div>
      ),
    },
    {
      id: "secret-management",
      badgeIcon: <ShieldCheck className="w-6 h-6 text-amber-400" />,
      accentColor: "border-amber-500/30",
      glowColor: "rgba(245, 158, 11, 0.15)",
      topGlow: "from-amber-500/15",
      title: "Encrypted secrets with runtime injection.",
      subtitle:
        "Store sensitive tokens, database connection strings, and API credentials securely. Variables are encrypted at rest with AES-256 and seamlessly injected into containers at boot.",
      bullets: [
        "AES-256 encrypted key-value vault for production credentials",
        "One-click value masking with clipboard copy safety",
        "Instant container environment variable synchronization",
        "Zero secrets hardcoded or committed to git repositories",
      ],
      mockup: (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 backdrop-blur-sm p-4 w-full max-w-2xl mx-auto text-left shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-zinc-850">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-mono uppercase tracking-wider text-white font-semibold">
                Environment Variables
              </span>
            </div>
            <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400 text-[10px] font-mono">
              AES-256 Encrypted
            </span>
          </div>

          <div className="mt-3 space-y-2 font-mono text-xs">
            <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <span className="text-cyan-300 font-medium">DATABASE_URL</span>
              <span className="text-zinc-500">postgresql://user:••••••••••••@kospaces:5432</span>
            </div>

            <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <span className="text-cyan-300 font-medium">JWT_SECRET_KEY</span>
              <span className="text-zinc-500">••••••••••••••••••••••••••••••••</span>
            </div>

            <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-900/50 flex items-center justify-between">
              <span className="text-cyan-300 font-medium">GITHUB_CLIENT_SECRET</span>
              <span className="text-zinc-500">••••••••••••••••••••••••••••••••</span>
            </div>
          </div>
        </div>
      ),
    },
  ];

  return (
    <div className="relative w-full max-w-5xl mx-auto mt-12 pb-16">
      {cards.map((card, index) => {
        // Stacking formula:
        // Base sticky top: 84px (well below the 64px navbar), with offset of 32px per card
        const topOffset = 84 + index * 32;
        // Cards layer on top of previous cards (10, 12, 14, 16, 18), but always slide under navbar (z-[100])
        const zIndex = 10 + index * 2;

        return (
          <div
            key={card.id}
            className="sticky transition-all duration-300 mb-14"
            style={{
              top: `${topOffset}px`,
              zIndex: zIndex,
            }}
          >
            {/* Card Shell */}
            <div
              className={`relative rounded-3xl border ${card.accentColor} bg-[#08080c] overflow-hidden text-center transition-all duration-300 shadow-[0_-15px_40px_-10px_rgba(0,0,0,0.8),0_25px_50px_-12px_rgba(0,0,0,0.9)]`}
              style={{
                boxShadow: `0 -10px 30px -10px ${card.glowColor}, 0 25px 50px -12px rgba(0, 0, 0, 0.9)`,
              }}
            >
              {/* Top ambient color glow */}
              <div
                className={`absolute top-0 left-0 right-0 h-40 bg-gradient-to-b ${card.topGlow} to-transparent pointer-events-none`}
              />

              {/* Top rim accent line */}
              <div
                className="absolute top-0 left-12 right-12 h-[1px] opacity-70"
                style={{
                  background: `linear-gradient(90deg, transparent 0%, ${card.glowColor.replace("0.15", "0.8")} 50%, transparent 100%)`,
                }}
              />

              {/* Card Body */}
              <div className="relative z-10 px-6 py-10 sm:px-12 sm:py-14 flex flex-col items-center">
                {/* Icon Badge */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 mb-6 shadow-inner">
                  {card.badgeIcon}
                </div>

                {/* Card Title */}
                <h3 className="text-2xl sm:text-4xl font-bold tracking-tight text-white max-w-2xl leading-tight">
                  {card.title}
                </h3>

                {/* Subtitle */}
                <p className="mt-3.5 text-sm sm:text-base text-zinc-400 max-w-xl font-normal leading-relaxed">
                  {card.subtitle}
                </p>

                {/* Feature Bullet Points */}
                <div className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2.5 max-w-3xl">
                  {card.bullets.map((bullet, bIdx) => (
                    <div key={bIdx} className="flex items-center gap-2 text-xs text-zinc-300">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{bullet}</span>
                    </div>
                  ))}
                </div>

                {/* Rich Mockup Graphics */}
                <div className="mt-8 w-full">{card.mockup}</div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
