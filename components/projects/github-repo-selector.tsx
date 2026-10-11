"use client";

import React, { useState, useEffect } from "react";
import { buildOAuthState } from "@/lib/auth/oauth-state";
import Image from "next/image";
import { GithubIcon } from "@/components/ui/github-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Search,
  Lock,
  Globe,
  GitBranch,
  RefreshCw,
  ExternalLink,
  AlertCircle,
  Unlink,
  ChevronDown,
  FolderGit2,
  Loader2,
  Key,
} from "lucide-react";

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
  total_private_repos?: number;
}

export interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  html_url: string;
  clone_url: string;
  default_branch: string;
  description: string | null;
  language: string | null;
  updated_at: string;
}

interface GitHubAuthData {
  type: "token" | "username";
  token?: string;
  username: string;
  user: GitHubUser;
}

const STORAGE_KEY = "kospaces_github_auth";

interface GithubRepoSelectorProps {
  selectedRepoUrl: string;
  selectedBranch: string;
  onSelectRepo: (repo: { url: string; branch: string; name: string }) => void;
  onManualChange: (url: string, branch: string) => void;
}

export function GithubRepoSelector({
  selectedRepoUrl,
  selectedBranch,
  onSelectRepo,
  onManualChange,
}: GithubRepoSelectorProps) {
  // Lazy initialize auth from localStorage
  const [auth, setAuth] = useState<GitHubAuthData | null>(() => {
    if (typeof window === "undefined") return null;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? (JSON.parse(saved) as GitHubAuthData) : null;
    } catch {
      return null;
    }
  });

  const [isConnecting, setIsConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  // Manual token entry accordion
  const [showManualToken, setShowManualToken] = useState(false);
  const [tokenInput, setTokenInput] = useState("");

  // Repositories state
  const [repos, setRepos] = useState<GitHubRepo[]>([]);
  const [isLoadingRepos, setIsLoadingRepos] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterVisibility, setFilterVisibility] = useState<"all" | "public" | "private">("all");

  // Manual Git clone URL fallback mode
  const [isManualMode, setIsManualMode] = useState(false);

  // Listen for OAuth message from popup
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      // T-9 audit: hanya terima pesan dari origin aplikasi sendiri (anti token injection).
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "GITHUB_AUTH_SUCCESS" || event.data?.type === "KOSPACES_GITHUB_AUTH_SUCCESS") {
        const authData = event.data.data || event.data.github_auth || event.data.payload;
        if (authData) {
          try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
          } catch {}
          setAuth(authData);
          setIsConnecting(false);
          setConnectError(null);
        }
      } else if (event.data?.type === "KOSPACES_GITHUB_APP_INSTALLED" || event.data?.type === "GITHUB_APP_INSTALLED") {
        setIsConnecting(false);
        setConnectError(null);
        handleRefreshRepos();
      } else if (event.data?.type === "GITHUB_AUTH_ERROR" || event.data?.type === "KOSPACES_GITHUB_AUTH_ERROR") {
        setConnectError(event.data.error || "GitHub authorization was not completed.");
        setIsConnecting(false);
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, []);

  // 1-Click OAuth Connect
  const handleOAuthConnect = async () => {
    setIsConnecting(true);
    setConnectError(null);

    let clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || (typeof window !== "undefined" ? `${window.location.origin}/api/v1` : "http://127.0.0.1:8082/api/v1")}/auth/config`);
        if (res.ok) {
          const json = await res.json();
          clientId = json.data?.github_app_client_id || json.data?.github_client_id;
        }
      } catch {
        // ignore
      }
    }
    if (!clientId) {
      // Tidak ada kredensial GitHub yang dikonfigurasi —
      // jangan fallback ke client ID hardcoded (tidak aman untuk production).
      setIsConnecting(false);
      setConnectError("GitHub belum dikonfigurasi. Set GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET di backend.");
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/callback/github`;
    const scope = "repo,read:user,user:email";
    // State double-submit cookie — divalidasi di callback (K-2 audit).
    const oauthState = buildOAuthState("link");
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      scope
    )}&state=${encodeURIComponent(oauthState)}`;

    const width = 600;
    const height = 720;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      authUrl,
      "github-oauth",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=1`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      // If popup is blocked by browser, redirect current window
      window.location.href = authUrl;
    }
  };

  // Manual PAT token connect
  const handleManualTokenConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim()) return;

    setIsConnecting(true);
    setConnectError(null);

    try {
      const res = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenInput.trim()}`,
          Accept: "application/vnd.github.v3+json",
        },
      });

      if (!res.ok) {
        if (res.status === 401) throw new Error("Invalid GitHub token. Please verify token permissions.");
        throw new Error("Failed to verify GitHub token.");
      }

      const user = (await res.json()) as GitHubUser;
      const authData: GitHubAuthData = {
        type: "token",
        token: tokenInput.trim(),
        username: user.login,
        user,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(authData));
      setAuth(authData);
      setTokenInput("");
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : "Failed to connect to GitHub");
    } finally {
      setIsConnecting(false);
    }
  };

  // Disconnect GitHub account
  const handleDisconnect = () => {
    localStorage.removeItem(STORAGE_KEY);
    setAuth(null);
    setRepos([]);
  };

  // When auth changes or on mount, fetch repositories
  useEffect(() => {
    if (!auth) return;

    let isMounted = true;
    let url = "";
    const headers: Record<string, string> = {
      Accept: "application/vnd.github.v3+json",
    };

    if (auth.type === "token" && auth.token) {
      headers["Authorization"] = `Bearer ${auth.token.trim()}`;
      url =
        "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator";
    } else {
      url = `https://api.github.com/users/${encodeURIComponent(
        auth.username.trim()
      )}/repos?per_page=100&sort=updated`;
    }

    fetch(url, { headers })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401) throw new Error("Invalid GitHub token or session expired.");
          if (res.status === 403) {
            throw new Error(
              "GitHub API rate limit exceeded. Please reconnect or wait a few minutes."
            );
          }
          if (res.status === 404) {
            throw new Error(`GitHub user "${auth.username}" not found.`);
          }
          throw new Error(`Failed to fetch repositories (${res.status})`);
        }
        return res.json() as Promise<GitHubRepo[]>;
      })
      .then((data) => {
        if (isMounted) {
          setRepos(data);
          setConnectError(null);
          setIsLoadingRepos(false);
        }
      })
      .catch((err: unknown) => {
        if (isMounted) {
          setConnectError(
            err instanceof Error ? err.message : "Failed to load repositories"
          );
          setIsLoadingRepos(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [auth]);

  // User-triggered reload
  const handleRefreshRepos = async () => {
    if (!auth) return;
    setIsLoadingRepos(true);
    setConnectError(null);

    try {
      let url = "";
      const headers: Record<string, string> = {
        Accept: "application/vnd.github.v3+json",
      };

      if (auth.type === "token" && auth.token) {
        headers["Authorization"] = `Bearer ${auth.token.trim()}`;
        url =
          "https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator";
      } else {
        url = `https://api.github.com/users/${encodeURIComponent(
          auth.username.trim()
        )}/repos?per_page=100&sort=updated`;
      }

      const res = await fetch(url, { headers });
      if (!res.ok) {
        throw new Error(`Failed to reload repositories (${res.status})`);
      }
      const data = (await res.json()) as GitHubRepo[];
      setRepos(data);
    } catch (err: unknown) {
      setConnectError(err instanceof Error ? err.message : "Failed to reload repositories");
    } finally {
      setIsLoadingRepos(false);
    }
  };

  // Filter repositories
  const filteredRepos = repos.filter((r) => {
    if (filterVisibility === "public" && r.private) return false;
    if (filterVisibility === "private" && !r.private) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = r.name.toLowerCase().includes(q);
      const matchDesc = r.description?.toLowerCase().includes(q);
      const matchLang = r.language?.toLowerCase().includes(q);
      return matchName || matchDesc || matchLang;
    }
    return true;
  });

  const selectedRepo = repos.find(
    (r) => r.clone_url === selectedRepoUrl || r.html_url === selectedRepoUrl
  );

  return (
    <div className="flex flex-col gap-4">
      {/* If already selected a repo, display chosen repo card */}
      {selectedRepo && !isManualMode && (
        <div className="p-4 rounded-xl border border-cyan-500/50 bg-cyan-950/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-zinc-900 border border-zinc-800 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-0.5">
              <GithubIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold text-white font-mono">
                  {selectedRepo.full_name}
                </span>
                <span className="px-1.5 py-0.2 rounded text-[10px] font-mono border bg-zinc-900 text-zinc-400 border-zinc-800">
                  {selectedRepo.private ? "Private" : "Public"}
                </span>
              </div>
              <p className="text-xs text-zinc-400 mt-0.5 font-mono line-clamp-1">
                {selectedRepo.description || selectedRepo.clone_url}
              </p>
              <div className="flex items-center gap-3 mt-1 text-[11px] font-mono text-zinc-500">
                <span className="flex items-center gap-1 text-cyan-300">
                  <GitBranch className="w-3 h-3" />
                  {selectedBranch || selectedRepo.default_branch}
                </span>
                <span>•</span>
                <span>Default Branch</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onSelectRepo({ url: "", branch: "main", name: "" })}
              className="text-xs"
            >
              Change Repository
            </Button>
          </div>
        </div>
      )}

      {/* When NOT manual mode and NO repo selected yet */}
      {!selectedRepo && !isManualMode && (
        <div className="flex flex-col gap-4">
          {/* 1. If GitHub is NOT connected: Display 1-Click Connect Hero */}
          {!auth ? (
            <div className="p-6 rounded-xl border border-zinc-850 bg-zinc-950/70 flex flex-col items-center text-center gap-4 relative overflow-hidden">
              {/* Soft atmospheric gradient */}
              <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-64 h-32 bg-cyan-500/10 blur-3xl pointer-events-none rounded-full" />

              <div className="w-12 h-12 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-white shadow-xl">
                <GithubIcon className="w-6 h-6 text-white" />
              </div>

              <div className="max-w-md flex flex-col gap-1">
                <h4 className="text-sm font-semibold text-white tracking-tight">
                  Connect Your GitHub Account
                </h4>
                <p className="text-xs text-zinc-400 leading-relaxed">
                  Authorize KotaCloud Spaces with one click to import public and private repositories automatically.
                </p>
              </div>

              {connectError && (
                <div className="w-full max-w-md p-3 rounded-lg bg-rose-950/50 border border-rose-800/60 text-rose-300 text-xs flex items-start gap-2.5 text-left font-mono">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span>{connectError}</span>
                </div>
              )}

              {/* 1-Click Connect Button */}
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleOAuthConnect}
                isLoading={isConnecting}
                leftIcon={<GithubIcon className="w-4 h-4" />}
                className="px-6 py-2 text-xs font-semibold shadow-[0_0_20px_-3px_rgba(0,210,255,0.3)] hover:shadow-[0_0_25px_-3px_rgba(0,210,255,0.5)] transition-all cursor-pointer"
              >
                {isConnecting ? "Connecting to GitHub..." : "Connect with GitHub"}
              </Button>

              <div className="flex items-center gap-2 text-[11px] text-zinc-500 font-mono">
                <span>OAuth 2.0</span>
                <span>•</span>
                <span>Instant Repository Sync</span>
                <span>•</span>
                <span>No Tokens Required</span>
              </div>

              {/* Collapsible Manual Token Option */}
              <div className="w-full max-w-md pt-2 border-t border-zinc-850/60 flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => setShowManualToken(!showManualToken)}
                  className="text-[11px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
                >
                  <Key className="w-3 h-3" />
                  <span>{showManualToken ? "Hide manual token input" : "Or connect using a Personal Access Token"}</span>
                  <ChevronDown className={`w-3 h-3 transition-transform ${showManualToken ? "rotate-180" : ""}`} />
                </button>

                {showManualToken && (
                  <form onSubmit={handleManualTokenConnect} className="w-full mt-3 flex flex-col gap-2 text-left">
                    <Input
                      label="Personal Access Token (PAT)"
                      type="password"
                      placeholder="ghp_xxxxxxxxxxxx"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      helperText={
                        <span>
                          Token requires <code>repo</code> scope.{" "}
                          <a
                            href="https://github.com/settings/tokens/new?scopes=repo&description=KotaCloud%20Spaces"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-cyan-400 hover:underline inline-flex items-center"
                          >
                            Generate on GitHub <ExternalLink className="w-2.5 h-2.5 ml-0.5" />
                          </a>
                        </span>
                      }
                    />
                    <Button
                      type="submit"
                      variant="secondary"
                      size="sm"
                      isLoading={isConnecting}
                      className="text-xs self-end"
                    >
                      Connect with Token
                    </Button>
                  </form>
                )}
              </div>
            </div>
          ) : (
            /* 2. If GitHub IS connected: Display Connected Account & Repository List */
            <div className="flex flex-col gap-4">
              {/* Account Header */}
              <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/70 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="relative w-10 h-10 rounded-full overflow-hidden border border-zinc-700 bg-zinc-900 flex-shrink-0">
                    <Image
                      src={auth.user.avatar_url}
                      alt={auth.user.login}
                      width={40}
                      height={40}
                      className="w-full h-full object-cover"
                      unoptimized
                    />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-white">
                        {auth.user.name || auth.user.login}
                      </span>
                      <a
                        href={auth.user.html_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs text-zinc-400 hover:text-cyan-400 font-mono flex items-center gap-1"
                      >
                        @{auth.user.login}
                        <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                      <span className="px-1.5 py-0.2 rounded-full text-[9px] font-mono bg-cyan-950/60 text-cyan-400 border border-cyan-800/60">
                        Connected
                      </span>
                    </div>
                    <span className="text-[11px] text-zinc-500 font-mono">
                      {repos.length} repositories available
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleRefreshRepos}
                    isLoading={isLoadingRepos}
                    className="text-xs h-8 px-2.5 text-zinc-400 hover:text-white"
                    title="Reload repositories"
                  >
                    <RefreshCw className="w-3 h-3" />
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleDisconnect}
                    leftIcon={<Unlink className="w-3 h-3 text-zinc-500" />}
                    className="text-xs h-8 text-zinc-400 hover:text-rose-400"
                  >
                    Disconnect
                  </Button>
                </div>
              </div>

              {/* Repositories Search & Filters */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    placeholder="Search repositories by name or language..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 text-xs font-mono bg-zinc-900/80 border border-zinc-800 rounded-lg text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-cyan-500/60"
                  />
                </div>

                <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-0.5">
                  {(["all", "public", "private"] as const).map((tab) => (
                    <button
                      key={tab}
                      type="button"
                      onClick={() => setFilterVisibility(tab)}
                      className={`px-2.5 py-1 rounded text-xs font-mono uppercase cursor-pointer transition-colors ${
                        filterVisibility === tab
                          ? "bg-zinc-800 text-cyan-300 font-semibold"
                          : "text-zinc-400 hover:text-white"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>
              </div>

              {/* Repositories List */}
              <div className="rounded-xl border border-zinc-850 bg-zinc-950/40 max-h-[340px] overflow-y-auto divide-y divide-zinc-850">
                {isLoadingRepos ? (
                  <div className="flex flex-col items-center justify-center p-12 text-zinc-500 gap-2 font-mono text-xs">
                    <Loader2 className="w-5 h-5 animate-spin text-cyan-400" />
                    <span>Fetching repositories from GitHub...</span>
                  </div>
                ) : filteredRepos.length === 0 ? (
                  <div className="flex flex-col items-center justify-center p-12 text-zinc-500 gap-2 font-mono text-xs">
                    <FolderGit2 className="w-6 h-6 text-zinc-700" />
                    <span>No repositories found matching your query.</span>
                  </div>
                ) : (
                  filteredRepos.map((repo) => (
                    <div
                      key={repo.id}
                      className="p-3.5 flex items-center justify-between gap-4 hover:bg-zinc-900/40 transition-colors"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="mt-0.5 flex-shrink-0 text-zinc-400">
                          {repo.private ? (
                            <Lock className="w-3.5 h-3.5 text-zinc-400" />
                          ) : (
                            <Globe className="w-3.5 h-3.5 text-zinc-500" />
                          )}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-semibold text-white font-mono truncate">
                              {repo.name}
                            </span>
                            <span className="px-1.5 py-0.2 rounded text-[10px] font-mono bg-zinc-900 text-zinc-400 border border-zinc-800">
                              {repo.default_branch}
                            </span>
                          </div>

                          {repo.description && (
                            <p className="text-[11px] text-zinc-400 mt-0.5 truncate font-mono">
                              {repo.description}
                            </p>
                          )}

                          <div className="flex items-center gap-2 mt-1 text-[10px] font-mono text-zinc-500">
                            {repo.language && (
                              <span className="flex items-center gap-1 text-zinc-300">
                                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                                {repo.language}
                              </span>
                            )}
                            <span>•</span>
                            <span>Updated {new Date(repo.updated_at).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>

                      <Button
                        type="button"
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          onSelectRepo({
                            url: repo.clone_url,
                            branch: repo.default_branch || "main",
                            name: repo.name,
                          })
                        }
                        className="text-xs px-3 h-7 flex-shrink-0"
                      >
                        Import
                      </Button>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Manual Git URL Input toggle & fields */}
      <div className="pt-2 border-t border-zinc-850 flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setIsManualMode(!isManualMode)}
          className="text-xs font-mono text-zinc-400 hover:text-cyan-400 flex items-center gap-1.5 cursor-pointer w-fit"
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform ${isManualMode ? "rotate-180" : ""}`}
          />
          <span>{isManualMode ? "Use GitHub Account Integration" : "Or enter Git repository URL manually"}</span>
        </button>

        {isManualMode && (
          <div className="flex flex-col gap-4 p-4 rounded-xl border border-zinc-850 bg-zinc-950/40">
            <Input
              label="Repository URL"
              placeholder="https://github.com/username/repository.git"
              value={selectedRepoUrl}
              onChange={(e) => onManualChange(e.target.value, selectedBranch)}
              leftIcon={<FolderGit2 className="w-4 h-4" />}
              required
              helperText="Public or accessible Git clone URL"
            />

            <Input
              label="Branch"
              placeholder="main"
              value={selectedBranch}
              onChange={(e) => onManualChange(selectedRepoUrl, e.target.value)}
              leftIcon={<GitBranch className="w-4 h-4" />}
            />
          </div>
        )}
      </div>
    </div>
  );
}
