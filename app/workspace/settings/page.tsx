"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import Image from "next/image";
import { DashboardShell } from "@/components/layout/workspace-shell";
import { Card, CardHeader, CardTitle, CardContent, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GithubIcon } from "@/components/ui/github-icon";
import { SettingsPageSkeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { updateProfileApi, uploadAvatarApi } from "@/lib/api/auth";
import {
  User as UserIcon,
  Copy,
  Check,
  Eye,
  EyeOff,
  LogOut,
  Terminal,
  ExternalLink,
  Unlink,
  AlertCircle,
  RefreshCw,
  Camera,
  Upload,
  Lock,
} from "lucide-react";

interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
  public_repos: number;
}

interface GitHubAuthData {
  type: "token" | "username";
  token?: string;
  username: string;
  user: GitHubUser;
}

const GITHUB_STORAGE_KEY = "kospaces_github_auth";

export default function SettingsPage() {
  const { user, token, logout, isLoading: authLoading, updateUser } = useAuth();

  // GitHub Auth state from localStorage
  const [githubAuth, setGithubAuth] = useState<GitHubAuthData | null>(() => {
    if (typeof window !== "undefined") {
      try {
        const stored = localStorage.getItem(GITHUB_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      } catch {
        // ignore
      }
    }
    return null;
  });

  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const [githubError, setGithubError] = useState<string | null>(null);
  const [appInstalledSuccess, setAppInstalledSuccess] = useState(false);

  // CLI Token states
  const [showToken, setShowToken] = useState(false);
  const [copiedToken, setCopiedToken] = useState(false);
  const [copiedCliCommand, setCopiedCliCommand] = useState(false);

  const [avatarError, setAvatarError] = useState(false);

  // Profile edit states
  const [name, setName] = useState<string>("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);
  const [profileError, setProfileError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync edit name with user
  useEffect(() => {
    if (user?.name) {
      setName(user.name);
    } else if (user?.email) {
      setName(user.email.split("@")[0]);
    }
  }, [user?.name, user?.email]);

  // Profile fields
  const userName = user?.name || (user?.email ? user.email.split("@")[0] : "KotaCloud Developer");
  const userEmail = user?.email || "developer@kotacloud.com";

  const avatarUrl = useMemo(() => {
    if (user?.avatar_url) {
      if (user.avatar_url.startsWith("http")) return user.avatar_url;
      if (user.avatar_url.startsWith("/uploads")) {
        const base = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api\/v1\/?$/, "") || "http://localhost:8080";
        return `${base}${user.avatar_url}`;
      }
      return user.avatar_url;
    }
    if (githubAuth?.user?.avatar_url) return githubAuth.user.avatar_url;
    if (githubAuth?.username) return `https://github.com/${githubAuth.username}.png`;
    if (user?.github_username) return `https://github.com/${user.github_username}.png`;
    if (userEmail && userEmail.includes("@") && !userEmail.includes("developer@kotacloud.com")) {
      return `https://unavatar.io/${encodeURIComponent(userEmail)}`;
    }
    return null;
  }, [user?.avatar_url, user?.github_username, githubAuth, userEmail]);

  const currentName = user?.name || (user?.email ? user.email.split("@")[0] : "");
  const hasNameChanged = name.trim() !== "" && name.trim() !== currentName;
  const isChanged = hasNameChanged || selectedFile !== null || (avatarPreview === "" && !!user?.avatar_url);
  const avatarDisplay = avatarPreview !== null ? (avatarPreview === "" ? null : avatarPreview) : avatarUrl;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      setProfileError("Ukuran file foto maksimal 5MB");
      return;
    }

    setSelectedFile(file);
    const previewUrl = URL.createObjectURL(file);
    setAvatarPreview(previewUrl);
    setAvatarError(false);
    setProfileError(null);
    setProfileSuccess(null);
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setAvatarPreview("");
    setAvatarError(false);
    setProfileSuccess(null);
    setProfileError(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSaveProfile = async () => {
    if (!isChanged) return;
    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      let updatedUser = user;

      // 1. Upload new avatar if file selected
      if (selectedFile) {
        updatedUser = await uploadAvatarApi(selectedFile);
      } else if (avatarPreview === "") {
        // Reset avatar to empty
        updatedUser = await updateProfileApi({ avatar_url: "" });
      }

      // 2. Update name if changed
      if (hasNameChanged) {
        updatedUser = await updateProfileApi({ name: name.trim() });
      }

      if (updatedUser) {
        updateUser(updatedUser);
      }

      setSelectedFile(null);
      setAvatarPreview(null);
      setProfileSuccess("Profil berhasil diperbarui!");
      setTimeout(() => {
        setProfileSuccess(null);
      }, 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Gagal memperbarui profil";
      setProfileError(msg);
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Listen for GitHub OAuth popup messages
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;
      if (event.data?.type === "KOSPACES_GITHUB_AUTH_SUCCESS") {
        const payload = event.data.payload;
        if (payload?.user && payload?.token) {
          const authData: GitHubAuthData = {
            type: "token",
            token: payload.token,
            username: payload.user.login,
            user: payload.user,
          };
          localStorage.setItem(GITHUB_STORAGE_KEY, JSON.stringify(authData));
          setGithubAuth(authData);
          if (token) {
            fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/auth/github/token`, {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ token: payload.token }),
            }).catch(() => {});
          }
          setIsConnectingGithub(false);
          setGithubError(null);
        }
      } else if (event.data?.type === "KOSPACES_GITHUB_APP_INSTALLED" || event.data?.type === "GITHUB_APP_INSTALLED") {
        setIsConnectingGithub(false);
        setGithubError(null);
        setAppInstalledSuccess(true);
        setTimeout(() => setAppInstalledSuccess(false), 6000);
      } else if (event.data?.type === "KOSPACES_GITHUB_AUTH_ERROR") {
        setGithubError(event.data.error || "GitHub authorization failed.");
        setIsConnectingGithub(false);
      }
    };

    window.addEventListener("message", handleOAuthMessage);
    return () => window.removeEventListener("message", handleOAuthMessage);
  }, [token]);

  // Sync token on mount if present
  useEffect(() => {
    if (token && githubAuth?.token) {
      fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/auth/github/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ token: githubAuth.token }),
      }).catch(() => {});
    }
  }, [token, githubAuth?.token]);

  const handleConnectGithub = async () => {
    setIsConnectingGithub(true);
    setGithubError(null);

    let clientId = process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api/v1"}/auth/config`);
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
      setGithubError("GitHub belum dikonfigurasi. Set GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET di backend.");
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/callback/github`;
    const scope = "repo,read:user,user:email";
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(scope)}`;

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
      window.location.href = authUrl;
    }
  };

  const handleManageApp = () => {
    const appUrl = "https://github.com/apps/kotacloud-spaces/installations/new";
    const width = 800;
    const height = 800;
    const left = window.screenX + (window.outerWidth - width) / 2;
    const top = window.screenY + (window.outerHeight - height) / 2;

    const popup = window.open(
      appUrl,
      "github-manage-app",
      `width=${width},height=${height},top=${top},left=${left},scrollbars=yes,status=1`
    );

    if (!popup || popup.closed || typeof popup.closed === "undefined") {
      window.location.href = appUrl;
    }
  };

  const handleDisconnectGithub = () => {
    localStorage.removeItem(GITHUB_STORAGE_KEY);
    setGithubAuth(null);
  };

  const handleCopyToken = () => {
    if (!token) return;
    navigator.clipboard.writeText(token);
    setCopiedToken(true);
    setTimeout(() => setCopiedToken(false), 2000);
  };

  const handleCopyCliCommand = () => {
    if (!token) return;
    navigator.clipboard.writeText(`kospaces login --token ${token}`);
    setCopiedCliCommand(true);
    setTimeout(() => setCopiedCliCommand(false), 2000);
  };

  if (authLoading) {
    return (
      <DashboardShell title="Settings & Credentials">
        <SettingsPageSkeleton />
      </DashboardShell>
    );
  }

  return (
    <DashboardShell
      title="Settings & Credentials"
      subtitle="Manage your account profile, VCS integrations, and CLI tokens."
    >
      <div className="flex flex-col gap-8 max-w-4xl">
        {/* SECTION 1: ACCOUNT PROFILE */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <UserIcon className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
              Account Profile
            </h2>
          </div>

          <Card>
            <div className="p-5 sm:p-6 flex flex-col gap-6">
              {/* Top: Avatar & Photo Action */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-5">
                {/* Avatar with hover trigger */}
                <div
                  className="relative group cursor-pointer shrink-0"
                  onClick={() => fileInputRef.current?.click()}
                  title="Klik untuk mengganti foto"
                >
                  <div className="w-16 h-16 rounded-full p-[1.5px] bg-zinc-800 border border-zinc-700 group-hover:border-cyan-400/60 transition-all overflow-hidden flex items-center justify-center shadow-lg">
                    {avatarDisplay && !avatarError ? (
                      <img
                        src={avatarDisplay}
                        alt={name || userName}
                        onError={() => setAvatarError(true)}
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-zinc-900 flex items-center justify-center text-base font-bold text-cyan-300 font-mono">
                        {(name || userName).charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  {/* Overlay camera on hover */}
                  <div className="absolute inset-0 rounded-full bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white text-[10px] font-medium pointer-events-none">
                    <Camera className="w-4 h-4 mb-0.5 text-cyan-300" />
                    <span>Ganti</span>
                  </div>

                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/png, image/jpeg, image/webp, image/gif"
                    className="hidden"
                    onChange={handleFileChange}
                  />
                </div>

                {/* Photo controls & guidelines */}
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={() => fileInputRef.current?.click()}
                      className="text-xs"
                      leftIcon={<Upload className="w-3.5 h-3.5" />}
                    >
                      Upload Foto
                    </Button>
                    {(selectedFile || avatarPreview === "" || user?.avatar_url) && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleRemovePhoto}
                        className="text-xs text-zinc-400 hover:text-rose-400"
                      >
                        Reset Foto
                      </Button>
                    )}
                  </div>
                  <span className="text-[11px] text-zinc-500 font-mono">
                    Mendukung PNG, JPG, atau WebP (maks. 5MB)
                  </span>
                </div>
              </div>

              {/* Form inputs: Editable Name & Read-only Email */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-white/[0.06]">
                {/* Editable Name */}
                <Input
                  label="Nama Lengkap"
                  value={name}
                  onChange={(e) => {
                    setName(e.target.value);
                    setProfileSuccess(null);
                    setProfileError(null);
                  }}
                  placeholder="Masukkan nama Anda"
                  leftIcon={<UserIcon className="w-4 h-4" />}
                />

                {/* Read-only Email */}
                <div>
                  <Input
                    label="Alamat Email"
                    value={userEmail}
                    readOnly
                    disabled
                    leftIcon={<Lock className="w-4 h-4 text-zinc-500" />}
                    helperText="Alamat email akun tidak dapat diubah"
                    className="bg-zinc-950/60 border-white/[0.04] text-zinc-400 cursor-not-allowed select-all"
                  />
                </div>
              </div>

              {/* Action row */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-3 border-t border-white/[0.06]">
                <div className="text-xs font-mono min-h-[20px]">
                  {profileSuccess && (
                    <span className="text-emerald-400 flex items-center gap-1.5">
                      <Check className="w-3.5 h-3.5" />
                      {profileSuccess}
                    </span>
                  )}
                  {profileError && (
                    <span className="text-rose-400 flex items-center gap-1.5">
                      <AlertCircle className="w-3.5 h-3.5" />
                      {profileError}
                    </span>
                  )}
                </div>

                <Button
                  type="button"
                  variant="primary"
                  size="sm"
                  isLoading={isSavingProfile}
                  disabled={!isChanged || isSavingProfile}
                  onClick={handleSaveProfile}
                  className="text-xs font-semibold px-4 w-full sm:w-auto"
                >
                  Simpan Perubahan
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* SECTION 2: GITHUB INTEGRATION */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <GithubIcon className="w-4 h-4 text-white" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
              Connected Git Providers
            </h2>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    GitHub Integration
                  </CardTitle>
                  <CardDescription>
                    Connect your GitHub account to import repositories and trigger automated deployments.
                  </CardDescription>
                </div>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              {githubError && (
                <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{githubError}</span>
                </div>
              )}

              {appInstalledSuccess && (
                <div className="p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-cyan-400" />
                  <span>KotaCloud Spaces GitHub App berhasil diinstall! Repositori dan commit check runs kini aktif.</span>
                </div>
              )}

              {githubAuth ? (
                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-4 rounded-lg bg-zinc-900/60 border border-zinc-800/80 gap-4">
                  <div className="flex items-center gap-3">
                    {githubAuth.user?.avatar_url ? (
                      <Image
                        src={githubAuth.user.avatar_url}
                        alt={githubAuth.username}
                        width={40}
                        height={40}
                        className="rounded-full border border-zinc-700 shrink-0"
                        unoptimized
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 font-bold shrink-0">
                        {githubAuth.username[0]?.toUpperCase()}
                      </div>
                    )}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white">
                          {githubAuth.user?.name || githubAuth.username}
                        </span>
                        <a
                          href={githubAuth.user?.html_url || `https://github.com/${githubAuth.username}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs text-zinc-400 hover:text-cyan-400 flex items-center gap-1 font-mono"
                        >
                          @{githubAuth.username}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        {githubAuth.user?.public_repos !== undefined
                          ? `${githubAuth.user.public_repos} public repositories accessible`
                          : "Connected via GitHub OAuth"}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                    <button
                      type="button"
                      onClick={handleManageApp}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-cyan-500/40 bg-cyan-950/30 hover:bg-cyan-900/40 text-xs font-mono text-cyan-300 transition-colors cursor-pointer"
                      title="Install / Manage Kotacloud Spaces GitHub App repositories"
                    >
                      <GithubIcon className="w-3.5 h-3.5 text-cyan-300" />
                      <span>Manage Repositories / App</span>
                    </button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleConnectGithub}
                      disabled={isConnectingGithub}
                      className="text-xs border-zinc-700 text-zinc-300 hover:text-white"
                    >
                      <RefreshCw className={`w-3.5 h-3.5 mr-1.5 ${isConnectingGithub ? "animate-spin" : ""}`} />
                      Reconnect
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={handleDisconnectGithub}
                      className="text-xs"
                    >
                      <Unlink className="w-3.5 h-3.5 mr-1.5" />
                      Disconnect
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row items-center justify-between p-5 rounded-lg bg-zinc-900/40 border border-dashed border-zinc-800 gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-800/80 border border-zinc-700 flex items-center justify-center shrink-0">
                      <GithubIcon className="w-5 h-5 text-zinc-300" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-white">No GitHub account linked</h4>
                      <p className="text-xs text-zinc-400 mt-0.5">
                        Link your GitHub account & install the Kotacloud Spaces App to deploy repositories with automatic commit checks.
                      </p>
                    </div>
                  </div>

                  <Button
                    variant="primary"
                    size="sm"
                    onClick={handleConnectGithub}
                    isLoading={isConnectingGithub}
                    className="whitespace-nowrap font-medium text-xs px-4"
                  >
                    <GithubIcon className="w-4 h-4 mr-2" />
                    Connect GitHub & Install App
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* SECTION 3: KOSPACES CLI ACCESS TOKEN */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-cyan-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
              KotaCloud CLI Token (`kospaces-cli`)
            </h2>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>CLI Authentication & Direct Deployments</CardTitle>
              <CardDescription>
                Use this security token to authenticate the <code>kospaces</code> terminal tool. Local project uploads and folder deployments are executed via the CLI.
              </CardDescription>
            </CardHeader>

            <CardContent className="flex flex-col gap-5">
              {/* Token Display */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-mono text-zinc-400 font-medium">
                  YOUR PERSONAL CLI ACCESS TOKEN
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 relative">
                    <input
                      type={showToken ? "text" : "password"}
                      readOnly
                      value={token || "No active session token available"}
                      className="w-full bg-zinc-950 border border-zinc-800 rounded-lg px-3.5 py-2 text-xs font-mono text-zinc-200 select-all focus:outline-none focus:border-cyan-500/50"
                    />
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowToken(!showToken)}
                    className="border-zinc-800 text-zinc-300 hover:text-white px-3"
                    title={showToken ? "Hide token" : "Show token"}
                  >
                    {showToken ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </Button>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCopyToken}
                    disabled={!token}
                    className="border-zinc-800 text-zinc-300 hover:text-white px-3"
                    title="Copy token to clipboard"
                  >
                    {copiedToken ? (
                      <Check className="w-3.5 h-3.5 text-cyan-400" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </Button>
                </div>
              </div>

              {/* CLI Command Quickstart */}
              <div className="p-4 rounded-lg bg-zinc-950 border border-zinc-800/80 flex flex-col gap-3 font-mono text-xs">
                <div className="flex items-center justify-between text-[11px] text-zinc-500 border-b border-zinc-800/60 pb-2">
                  <span className="flex items-center gap-1.5 text-cyan-400">
                    <Terminal className="w-3 h-3" /> Quick CLI Login
                  </span>
                  <button
                    type="button"
                    onClick={handleCopyCliCommand}
                    disabled={!token}
                    className="flex items-center gap-1 text-zinc-400 hover:text-white transition-colors"
                  >
                    {copiedCliCommand ? (
                      <span className="text-cyan-400 flex items-center gap-1">
                        <Check className="w-3 h-3" /> Copied command
                      </span>
                    ) : (
                      <span className="flex items-center gap-1">
                        <Copy className="w-3 h-3" /> Copy command
                      </span>
                    )}
                  </button>
                </div>

                <div className="text-zinc-300 space-y-1 select-all overflow-x-auto py-1">
                  <p className="text-zinc-500"># Authenticate your terminal session</p>
                  <p className="text-cyan-300 font-semibold">
                    kospaces login --token {token ? `${token.slice(0, 16)}...` : "<YOUR_TOKEN>"}
                  </p>
                  <p className="text-zinc-500 pt-2"># Deploy current directory directly to KotaCloud</p>
                  <p className="text-cyan-300 font-semibold">kospaces deploy --local .</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* SECTION 4: SECURITY & LOGOUT */}
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2">
            <LogOut className="w-4 h-4 text-rose-400" />
            <h2 className="text-sm font-semibold tracking-wide uppercase text-zinc-400">
              Session Management
            </h2>
          </div>

          <Card className="border-zinc-800 bg-zinc-950/40">
            <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between p-5 gap-4">
              <div>
                <h4 className="text-sm font-semibold text-white">Sign Out of KotaCloud Spaces</h4>
                <p className="text-xs text-zinc-400 mt-0.5">
                  Terminates your current browser session and clears local cached credentials.
                </p>
              </div>

              <Button
                variant="danger"
                size="sm"
                onClick={logout}
                className="whitespace-nowrap font-semibold text-xs px-4"
              >
                <LogOut className="w-3.5 h-3.5 mr-2" />
                Sign Out
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardShell>
  );
}
