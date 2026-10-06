"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import {
  FolderGit2,
  Activity,
  Settings,
  BookOpen,
  ArrowUpRight,
  Search,
  LogOut,
  Server,
  Sparkles,
  CreditCard,
} from "lucide-react";

import { useAuth } from "@/hooks/use-auth";
import { getEngineHealthApi, getEngineHealthStreamUrl } from "@/lib/api/engine";

interface SidebarProps {
  userEmail?: string;
  userName?: string;
  onLogout?: () => void;
  collapsed?: boolean;
}

export function Sidebar({
  userEmail: propEmail,
  userName: propName,
  onLogout: propLogout,
}: SidebarProps) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [avatarError, setAvatarError] = useState(false);
  const [githubAuth, setGithubAuth] = useState<{ username?: string; user?: { avatar_url?: string } } | null>(null);

  const [engineStatus, setEngineStatus] = useState<"READY" | "OFFLINE" | "CHECKING" | "DEGRADED">("CHECKING");
  const [engineVersion, setEngineVersion] = useState<string>("v1.0.0-stable");
  const [isRefreshingEngine, setIsRefreshingEngine] = useState(false);

  const fetchEngineHealth = async (manual = false) => {
    if (manual) setIsRefreshingEngine(true);
    try {
      const data = await getEngineHealthApi();
      if (data?.status === "ready" || data?.status === "ok" || data?.status === "healthy") {
        setEngineStatus("READY");
      } else if (data?.status === "degraded") {
        setEngineStatus("DEGRADED");
      } else {
        setEngineStatus("OFFLINE");
      }
      if (data?.version) {
        setEngineVersion(data.version);
      }
    } catch {
      setEngineStatus("OFFLINE");
    } finally {
      if (manual) {
        setTimeout(() => setIsRefreshingEngine(false), 500);
      }
    }
  };

  // Real-time engine health subscription via SSE + fast polling fallback
  useEffect(() => {
    let eventSource: EventSource | null = null;
    let pollInterval: NodeJS.Timeout | null = null;

    const applyStatus = (status?: string, version?: string) => {
      if (status === "ready" || status === "ok" || status === "healthy") {
        setEngineStatus("READY");
      } else if (status === "degraded") {
        setEngineStatus("DEGRADED");
      } else if (status === "offline") {
        setEngineStatus("OFFLINE");
      }
      if (version) {
        setEngineVersion(version);
      }
    };

    // 1. Initial check immediately
    fetchEngineHealth();

    // 2. Real-time Server-Sent Events (SSE) stream for instant updates
    try {
      const streamUrl = getEngineHealthStreamUrl();
      eventSource = new EventSource(streamUrl);

      eventSource.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data);
          applyStatus(payload.status, payload.version);
        } catch { }
      };

      eventSource.onerror = () => {
        // If SSE fails or reconnects, the poll interval handles continuity
      };
    } catch { }

    // 3. Fast 2.5s interval to ensure updates happen automatically without manual actions
    pollInterval = setInterval(() => {
      fetchEngineHealth();
    }, 2500);

    // 4. Instant check when window gains focus or tab becomes visible
    const handleFocus = () => {
      fetchEngineHealth();
    };
    window.addEventListener("focus", handleFocus);
    document.addEventListener("visibilitychange", handleFocus);

    return () => {
      if (eventSource) {
        eventSource.close();
      }
      if (pollInterval) {
        clearInterval(pollInterval);
      }
      window.removeEventListener("focus", handleFocus);
      document.removeEventListener("visibilitychange", handleFocus);
    };
  }, []);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("kospaces_github_auth");
      if (stored) {
        setGithubAuth(JSON.parse(stored));
      }
    } catch { }
  }, []);

  const userEmail = propEmail || user?.email || "developer@kotacloud.com";
  const userName =
    propName ||
    user?.name ||
    (user?.email ? user.email.split("@")[0] : "Syahrul Ramadhan");
  const handleLogout = propLogout || logout;

  // Resolve user avatar:
  // 1. Explicit user.avatar_url from backend (Google / GitHub / saved profile)
  // 2. Connected GitHub profile avatar (live via https://github.com/${username}.png)
  // 3. Fallback to unavatar by email (which automatically grabs Google / Gravatar / GitHub)
  const avatarUrl = useMemo(() => {
    if (user?.avatar_url) return user.avatar_url;
    if (githubAuth?.user?.avatar_url) return githubAuth.user.avatar_url;
    if (githubAuth?.username) return `https://github.com/${githubAuth.username}.png`;
    if (user?.github_username) return `https://github.com/${user.github_username}.png`;
    if (userEmail && userEmail.includes("@") && !userEmail.includes("developer@kotacloud.com")) {
      return `https://unavatar.io/${encodeURIComponent(userEmail)}`;
    }
    return null;
  }, [user?.avatar_url, user?.github_username, githubAuth, userEmail]);

  // Section 1: Main workspace links (KotaCloud Spaces original icons)
  const primaryNavigation = [
    {
      name: "Projects",
      href: "/workspace/projects",
      icon: FolderGit2,
    },
  ];

  // Section 2: Workspace management links
  const secondaryNavigation = [
    {
      name: "Usage",
      href: "/workspace/usage",
      icon: Activity,
    },
    {
      name: "Plans",
      href: "/workspace/plans",
      icon: Sparkles,
    },
    {
      name: "Billing",
      href: "/workspace/billing",
      icon: CreditCard,
    },
    {
      name: "Settings",
      href: "/workspace/settings",
      icon: Settings,
    },
  ];

  // Section 3: External documentation link
  const externalNavigation = [
    {
      name: "Docs",
      href: "https://docs.kotacloud.com",
      icon: BookOpen,
    },
  ];

  const isCurrent = (href: string) => {
    if (href === "/workspace/projects") {
      return pathname === "/workspace" || pathname.startsWith("/workspace/projects");
    }
    return pathname.startsWith(href);
  };

  return (
    <aside className="w-64 border-r border-white/[0.06] bg-[#060608] flex flex-col h-screen sticky top-0 select-none z-30">
      {/* Top section */}
      <div className="flex flex-col p-4 gap-4 flex-1 overflow-y-auto">
        {/* Logo */}
        <div className="px-1 py-1">
          <Logo href="/workspace" size="md" />
        </div>

        {/* Minimal Search box */}
        <div className="relative flex items-center">
          <Search className="w-3.5 h-3.5 absolute left-3 text-zinc-500 pointer-events-none" />
          <input
            type="text"
            placeholder="Search projects..."
            className="w-full bg-zinc-900/40 border border-white/[0.06] rounded-lg pl-9 pr-3 py-1.5 text-xs text-zinc-200 placeholder:text-zinc-600 focus:outline-none focus:border-cyan-500/40 focus:ring-1 focus:ring-cyan-500/10 transition-all font-mono"
          />
          <kbd className="absolute right-2.5 text-[10px] text-zinc-500 bg-zinc-900/60 border border-white/[0.06] px-1.5 rounded font-mono">
            ⌘K
          </kbd>
        </div>

        {/* Navigation list in Railway layout style with KotaCloud Spaces branding */}
        <nav className="flex flex-col mt-1">
          {/* Group 1: Projects */}
          <div className="flex flex-col gap-1">
            {primaryNavigation.map((item) => {
              const active = isCurrent(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                    active
                      ? "bg-zinc-900/80 text-white font-semibold border border-white/[0.08]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Divider between Projects and Usage/People/Settings */}
          <div className="my-3 border-t border-white/[0.06]" />

          {/* Group 2: Usage, People, Settings */}
          <div className="flex flex-col gap-1">
            {secondaryNavigation.map((item) => {
              const active = isCurrent(item.href);
              const Icon = item.icon;

              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group ${
                    active
                      ? "bg-zinc-900/80 text-white font-semibold border border-white/[0.08]"
                      : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-colors ${
                      active ? "text-cyan-400" : "text-zinc-500 group-hover:text-zinc-300"
                    }`}
                  />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </div>

          {/* Divider between workspace management and docs/help */}
          <div className="my-3 border-t border-white/[0.06]" />

          {/* Group 3: Documentation */}
          <div className="flex flex-col gap-1">
            {externalNavigation.map((item) => {
              const Icon = item.icon;

              return (
                <a
                  key={item.name}
                  href={item.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 px-3 py-2 rounded-lg text-xs font-medium transition-all group text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/40"
                >
                  <Icon className="w-4 h-4 text-zinc-500 group-hover:text-zinc-300 transition-colors" />
                  <span className="inline-flex items-center gap-1">
                    <span>{item.name}</span>
                    <ArrowUpRight className="w-3 h-3 text-zinc-500 group-hover:text-zinc-400 opacity-60" />
                  </span>
                </a>
              );
            })}
          </div>
        </nav>
      </div>

      {/* Engine & Quick Status Badge - connected to backend health check */}
      <div className="px-3 pb-3 mt-auto">
        <button
          type="button"
          onClick={() => fetchEngineHealth(true)}
          title={`Control Plane: ${engineStatus} (Click to recheck)`}
          className="w-full text-left p-2.5 rounded-xl border border-white/[0.06] bg-zinc-900/30 hover:bg-zinc-900/50 hover:border-white/[0.12] transition-all flex items-center justify-between group cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Server
              className={`w-3.5 h-3.5 transition-colors ${
                engineStatus === "READY"
                  ? "text-cyan-400"
                  : engineStatus === "OFFLINE"
                  ? "text-rose-400"
                  : "text-amber-400"
              }`}
            />
            <div className="flex flex-col">
              <span className="text-[11px] font-medium text-zinc-300">Control Plane</span>
              <span className="text-[10px] text-zinc-500 font-mono">{engineVersion}</span>
            </div>
          </div>
          <span
            className={`inline-flex items-center gap-1.5 text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors ${
              engineStatus === "READY"
                ? "text-cyan-400 bg-cyan-950/30 border-cyan-800/30"
                : engineStatus === "OFFLINE"
                ? "text-rose-400 bg-rose-950/30 border-rose-800/30"
                : "text-amber-400 bg-amber-950/30 border-amber-800/30"
            }`}
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${
                isRefreshingEngine
                  ? "bg-amber-400 animate-ping"
                  : engineStatus === "READY"
                  ? "bg-cyan-400 animate-pulse"
                  : engineStatus === "OFFLINE"
                  ? "bg-rose-500"
                  : "bg-amber-400 animate-pulse"
              }`}
            />
            {isRefreshingEngine ? "CHECKING" : engineStatus}
          </span>
        </button>
      </div>

      {/* Bottom User profile card matching reference screenshot */}
      <div className="p-3 border-t border-white/[0.06]">
        <div className="p-2 rounded-xl bg-zinc-900/20 border border-white/[0.05] flex items-center justify-between group hover:border-white/[0.10] transition-colors">
          <div className="flex items-center gap-2.5 overflow-hidden">
            {/* Unified ring avatar matching brand accent */}
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-white/[0.08] flex-shrink-0 relative overflow-hidden flex items-center justify-center">
              {avatarUrl && !avatarError ? (
                <img
                  src={avatarUrl}
                  alt={userName}
                  onError={() => setAvatarError(true)}
                  className="w-full h-full rounded-full object-cover"
                />
              ) : (
                <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-[10px] font-bold text-cyan-300 font-mono">
                  {userName.charAt(0).toUpperCase()}
                </div>
              )}
            </div>
            <div className="flex flex-col truncate">
              <span className="text-xs font-semibold text-zinc-200 truncate">
                {userName}
              </span>
              <span className="text-[10px] text-zinc-500 truncate font-mono">
                {userEmail}
              </span>
            </div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign Out"
            className="text-zinc-500 hover:text-rose-400 p-1.5 rounded transition-colors cursor-pointer"
            aria-label="Sign Out"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </aside>
  );
}
