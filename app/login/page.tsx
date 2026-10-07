"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/ui/logo";
import { GoogleIcon } from "@/components/ui/google-icon";
import { GithubIcon } from "@/components/ui/github-icon";
import { HeroNetworkCanvas } from "@/components/ui/hero-network-canvas";
import { useAuth } from "@/hooks/use-auth";
import { getOAuthConfigApi, OAuthConfig } from "@/lib/api/auth";
import { buildOAuthState } from "@/lib/auth/oauth-state";
import {
  Mail,
  AlertCircle,
  Loader2,
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Check,
} from "lucide-react";

function RailwayAuthModal() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    isAuthenticated,
    isLoading: authLoading,
    sendOtp,
    verifyOtp,
    setSession,
  } = useAuth();

  // Authentication Flow State:
  // 1. "github" -> Initial view (Continue with GitHub + "Log in using email" link)
  // 2. "email"  -> Email view (Continue with Google + hello@email.com input + Continue with Email)
  // 3. "otp"    -> OTP view (6-digit code verification)
  const [view, setView] = useState<"github" | "email" | "otp">("github");
  const [emailInput, setEmailInput] = useState("");
  const [otpCode, setOtpCode] = useState(["", "", "", "", "", ""]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [oauthConfig, setOAuthConfig] = useState<OAuthConfig | null>(null);

  // Google setup info guide modal
  const [showGoogleGuide, setShowGoogleGuide] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const otpInputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const sessionExpired = searchParams.get("session_expired") === "true";

  // Fetch OAuth public config from backend
  useEffect(() => {
    getOAuthConfigApi()
      .then((cfg) => setOAuthConfig(cfg))
      .catch((err) => console.warn("[OAuth] Failed to load config from backend:", err));
  }, []);

  // Redirect if already authenticated
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.replace("/workspace/projects");
    }
  }, [authLoading, isAuthenticated, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const interval = setInterval(() => {
      setResendCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(interval);
  }, [resendCooldown]);

  // Listen for OAuth messages (GitHub & Google)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin) return;

      // GitHub OAuth Success
      if (event.data?.type === "GITHUB_AUTH_SUCCESS") {
        const { token, user, github_auth } = event.data;
        if (github_auth) {
          try {
            localStorage.setItem("kospaces_github_auth", JSON.stringify(github_auth));
            if (user?.id) {
              localStorage.setItem(`kospaces_github_auth_${user.id}`, JSON.stringify(github_auth));
            }
          } catch {}
        }
        if (token && user) {
          setSession(token, user);
          router.replace("/workspace/projects");
        }
        setIsSubmitting(false);
      } else if (event.data?.type === "GITHUB_AUTH_ERROR") {
        setError(event.data.error || "GitHub authorization failed.");
        setIsSubmitting(false);
      }

      // Google OAuth Success
      if (event.data?.type === "GOOGLE_AUTH_SUCCESS") {
        const { token, user } = event.data;
        if (token && user) {
          setSession(token, user);
          router.replace("/workspace/projects");
        }
        setIsSubmitting(false);
      } else if (event.data?.type === "GOOGLE_AUTH_ERROR") {
        setError(event.data.error || "Google authorization failed.");
        setIsSubmitting(false);
      }
    };

    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [setSession, router]);

  // Reset loading spinner if user navigates back (bfcache) or returns to the tab
  useEffect(() => {
    const handleResetLoading = () => {
      setIsSubmitting(false);
    };

    window.addEventListener("pageshow", handleResetLoading);
    window.addEventListener("focus", handleResetLoading);

    const handleVisibility = () => {
      if (document.visibilityState === "visible") {
        setIsSubmitting(false);
      }
    };
    document.addEventListener("visibilitychange", handleVisibility);

    return () => {
      window.removeEventListener("pageshow", handleResetLoading);
      window.removeEventListener("focus", handleResetLoading);
      document.removeEventListener("visibilitychange", handleVisibility);
    };
  }, []);

  // 1. Handle Continue with GitHub (Standard OAuth Login)
  const handleContinueWithGithub = async () => {
    setIsSubmitting(true);
    setError(null);

    let clientId =
      oauthConfig?.github_app_client_id ||
      oauthConfig?.github_client_id ||
      process.env.NEXT_PUBLIC_GITHUB_CLIENT_ID;
    if (!clientId) {
      try {
        const cfg = await getOAuthConfigApi();
        setOAuthConfig(cfg);
        clientId = cfg.github_app_client_id || cfg.github_client_id;
      } catch {
        // ignore
      }
    }

    if (!clientId) {
      // Tidak ada kredensial GitHub yang dikonfigurasi —
      // jangan fallback ke client ID hardcoded (tidak aman untuk production).
      setIsSubmitting(false);
      setError(
        "GitHub login belum dikonfigurasi. Set GITHUB_CLIENT_ID & GITHUB_CLIENT_SECRET di backend, atau gunakan login email."
      );
      return;
    }

    const redirectUri = `${window.location.origin}/api/auth/callback/github`;
    const scope = "repo,read:user,user:email";
    // State double-submit cookie — divalidasi di callback (K-2 audit).
    const oauthState = buildOAuthState("login");
    const authUrl = `https://github.com/login/oauth/authorize?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(
      scope
    )}&state=${encodeURIComponent(oauthState)}`;

    window.location.href = authUrl;
    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  };

  // 2. Handle Continue with Google
  const handleContinueWithGoogle = async () => {
    setError(null);

    let clientId = oauthConfig?.google_client_id || process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID;
    if (!clientId) {
      try {
        const cfg = await getOAuthConfigApi();
        setOAuthConfig(cfg);
        clientId = cfg.google_client_id;
      } catch {
        // ignore
      }
    }

    if (!clientId) {
      setShowGoogleGuide(true);
      return;
    }

    setIsSubmitting(true);
    const redirectUri = `${window.location.origin}/api/auth/callback/google`;
    const scope = "openid email profile";
    // State double-submit cookie — divalidasi di callback (K-2 audit).
    const oauthState = buildOAuthState("login");
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${encodeURIComponent(
      clientId
    )}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&response_type=code&scope=${encodeURIComponent(
      scope
    )}&state=${encodeURIComponent(oauthState)}&access_type=offline&prompt=select_account`;

    window.location.href = authUrl;
    setTimeout(() => {
      setIsSubmitting(false);
    }, 3000);
  };

  // 3. Handle Continue with Email (Trigger OTP)
  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!emailInput.trim() || !emailInput.includes("@")) {
      setError("Please enter a valid email address.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await sendOtp(emailInput.trim());
      setView("otp");
      setResendCooldown(45);
      setTimeout(() => {
        otpInputRefs.current[0]?.focus();
      }, 100);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to send verification code.";
      setError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Handle OTP Box Input changes & auto-advance
  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, "").slice(0, 6).split("");
      const newOtp = [...otpCode];
      digits.forEach((d, i) => {
        newOtp[i] = d;
      });
      setOtpCode(newOtp);
      const nextIndex = Math.min(digits.length, 5);
      otpInputRefs.current[nextIndex]?.focus();

      if (digits.length === 6) {
        executeVerifyOtp(digits.join(""));
      }
      return;
    }

    const digit = value.replace(/\D/g, "");
    const newOtp = [...otpCode];
    newOtp[index] = digit;
    setOtpCode(newOtp);

    if (digit && index < 5) {
      otpInputRefs.current[index + 1]?.focus();
    }

    if (digit && index === 5 && newOtp.every((d) => d !== "")) {
      executeVerifyOtp(newOtp.join(""));
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Backspace" && !otpCode[index] && index > 0) {
      otpInputRefs.current[index - 1]?.focus();
    }
  };

  // 5. Execute OTP Verification
  const executeVerifyOtp = async (codeToVerify?: string) => {
    const code = codeToVerify || otpCode.join("");
    if (code.length !== 6) {
      setError("Please enter the complete 6-digit verification code.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await verifyOtp(emailInput.trim(), code);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Verification code is invalid or expired.";
      setError(msg);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-14 items-center z-10 py-6">
      {/* Left Column: Platform Showcase, Live Terminal, and Value Props */}
      <div className="hidden lg:flex lg:col-span-7 flex-col justify-center text-left">
        {/* Hero Title */}
        <h1 className="text-4xl lg:text-5xl font-bold tracking-tight text-white leading-[1.15]">
          Deploy and scale on the{" "}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-cyan-200">
            AI Cloud.
          </span>
        </h1>

        <p className="mt-4 text-sm sm:text-base text-zinc-400 max-w-lg leading-relaxed font-normal">
          Connect your GitHub repository, customize compute resources, and deploy isolated container environments with automatic Let&apos;s Encrypt SSL and live log telemetry.
        </p>

        {/* Interactive Live Terminal Preview */}
        <div className="mt-8 w-full max-w-lg rounded-2xl border border-zinc-800/90 bg-[#07070a]/90 shadow-2xl overflow-hidden font-mono text-xs backdrop-blur-md">
          <div className="px-4 py-2.5 border-b border-zinc-800/80 bg-zinc-950 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#ff5f56]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#ffbd2e]" />
              <span className="w-2.5 h-2.5 rounded-full bg-[#27c93f]" />
              <span className="ml-2 text-zinc-400 text-[11px]">kospaces-cli // live-deploy</span>
            </div>
            <div className="flex items-center gap-1.5 text-[10px] text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>ONLINE</span>
            </div>
          </div>
          <div className="p-4 space-y-1.5 text-zinc-400">
            <p className="text-cyan-400">$ kospaces deploy --git github.com/kotacloud/web-app</p>
            <p className="text-zinc-500">[20:00:01] Fetching repository commit #89d2c4...</p>
            <p className="text-zinc-400">[20:00:03] Auto-detected Next.js 15.2 runtime with Dockerfile</p>
            <p className="text-zinc-400">[20:00:07] BuildKit compile finished in 3.4s (layer cached)</p>
            <p className="text-emerald-400">[20:00:09] Provisioned container pod: 2 vCPU · 2GB RAM</p>
            <p className="text-cyan-300 font-semibold">[20:00:10] Endpoint live: https://web-app.spaces.kotacloud.com</p>
          </div>
        </div>

        {/* Four Feature Highlights */}
        <div className="mt-8 grid grid-cols-2 gap-3.5 max-w-lg text-xs text-zinc-300">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Instant GitHub & GitLab sync</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Isolated Docker sandboxes</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Automatic Let&apos;s Encrypt SSL</span>
          </div>
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>Real-time SSE live logs</span>
          </div>
        </div>
      </div>

      {/* Right Column: Auth Card */}
      <div className="col-span-1 lg:col-span-5 flex flex-col items-center lg:items-end w-full">
        {/* Auth Card Container */}
        <div className="w-full max-w-[420px] rounded-3xl border border-zinc-800/90 bg-[#08080c]/90 backdrop-blur-2xl p-7 sm:p-9 shadow-[0_0_50px_-10px_rgba(0,229,255,0.12),0_25px_50px_-12px_rgba(0,0,0,0.9)] flex flex-col items-center text-center relative overflow-hidden transition-all duration-300">
          {/* Top glowing accent rim */}
          <div className="absolute top-0 left-8 right-8 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent pointer-events-none" />
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-40 h-16 bg-cyan-500/10 blur-xl pointer-events-none" />

          {/* KotaCloud Spaces Brand Logo */}
          <div className="mb-4 flex items-center justify-center">
            <Logo size="lg" />
          </div>

          {/* Heading */}
          <h2 className="text-xl font-bold text-white tracking-tight">
            {view === "github" && "Welcome to KotaCloud Spaces"}
            {view === "email" && "Sign in with Email or Google"}
            {view === "otp" && "Verification Code"}
          </h2>

          <p className="text-xs text-zinc-400 mt-1.5 mb-6 font-normal leading-relaxed">
            {view === "github" && "Continue with your GitHub account to access your workspaces and deployments."}
            {view === "email" && "Choose Google or enter your work email to receive an instant login code."}
            {view === "otp" && "Enter the 6-digit code sent to your email address."}
          </p>

          {sessionExpired && !error && (
            <div className="w-full mb-4 p-3 rounded-xl bg-amber-950/30 border border-amber-800/40 text-amber-300 text-xs text-left">
              Your session has expired. Please sign in again.
            </div>
          )}

          {error && (
            <div className="w-full mb-4 p-3 rounded-xl bg-rose-950/40 border border-rose-800/50 text-rose-300 text-xs flex items-start gap-2 text-left animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span className="break-words">{error}</span>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 1: INITIAL STATE -> CONTINUE WITH GITHUB                             */}
          {/* ========================================================================= */}
          {view === "github" && (
            <div className="w-full flex flex-col items-center gap-4 animate-in fade-in duration-200">
              {/* Cyan Button matching Continue with Email */}
              <button
                type="button"
                onClick={handleContinueWithGithub}
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs tracking-wide flex items-center justify-center gap-2.5 transition-all shadow-lg shadow-cyan-950/40 active:scale-[0.99] cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <GithubIcon className="w-4 h-4 text-black" />
                )}
                <span>Continue with GitHub</span>
              </button>

              {/* Clean Divider */}
              <div className="w-full flex items-center gap-3 my-1">
                <div className="flex-1 h-[1px] bg-zinc-850" />
                <span className="text-[11px] text-zinc-500 font-mono uppercase tracking-wider">or</span>
                <div className="flex-1 h-[1px] bg-zinc-850" />
              </div>

              {/* Secondary button to switch to Email/Google */}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView("email");
                }}
                className="w-full h-11 rounded-xl bg-zinc-900/80 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-medium text-xs tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer"
              >
                <Mail className="w-4 h-4 text-zinc-400" />
                <span>Log in using email or Google</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 2: EMAIL STATE -> GOOGLE + EMAIL INPUT                               */}
          {/* ========================================================================= */}
          {view === "email" && (
            <div className="w-full flex flex-col gap-3.5 animate-in fade-in duration-200">
              {/* Continue with Google Button */}
              <button
                type="button"
                onClick={handleContinueWithGoogle}
                disabled={isSubmitting}
                className="w-full h-11 rounded-xl bg-[#141622] hover:bg-[#1a1d2c] border border-zinc-800 hover:border-zinc-700 text-white font-medium text-xs tracking-wide flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-60"
              >
                <GoogleIcon className="w-4 h-4" />
                <span>Continue with Google</span>
              </button>

              {/* Divider */}
              <div className="w-full flex items-center gap-3 my-1">
                <div className="flex-1 h-[1px] bg-zinc-850" />
                <span className="text-[10px] text-zinc-500 font-mono uppercase tracking-wider">or passwordless email</span>
                <div className="flex-1 h-[1px] bg-zinc-850" />
              </div>

              {/* Email Form */}
              <form onSubmit={handleSendOtp} className="w-full flex flex-col gap-3">
                <div className="relative flex items-center w-full">
                  <Mail className="absolute left-3.5 w-4 h-4 text-zinc-500 pointer-events-none" />
                  <input
                    type="email"
                    placeholder="hello@email.com"
                    value={emailInput}
                    onChange={(e) => setEmailInput(e.target.value)}
                    autoFocus
                    required
                    className="w-full h-11 pl-10 pr-3.5 rounded-xl bg-[#0e1017] border border-zinc-800 text-xs font-mono text-white placeholder:text-zinc-500 focus:outline-none focus:border-cyan-500/80 focus:ring-1 focus:ring-cyan-500/40 transition-colors"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting || !emailInput}
                  className="w-full h-11 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/40 cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <Loader2 className="w-4 h-4 animate-spin text-black" />
                  ) : (
                    <>
                      <span>Continue with Email</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </form>

              {/* Switch back to GitHub */}
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setView("github");
                }}
                className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-1 mt-2 pt-2 border-t border-zinc-850"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Back to GitHub login</span>
              </button>
            </div>
          )}

          {/* ========================================================================= */}
          {/* VIEW 3: OTP VERIFICATION STATE (6-Digit Email Code)                      */}
          {/* ========================================================================= */}
          {view === "otp" && (
            <div className="w-full flex flex-col items-center gap-4 animate-in fade-in duration-200">
              {/* Email pill indicator with change option */}
              <div className="w-full px-3.5 py-2 rounded-xl bg-[#0e1017] border border-zinc-800 flex items-center justify-between text-xs">
                <span className="font-mono text-zinc-300 truncate max-w-[220px]">
                  {emailInput}
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("email");
                  }}
                  className="text-cyan-400 hover:text-cyan-300 text-[11px] font-medium cursor-pointer"
                >
                  Change
                </button>
              </div>

              {/* 6 Digit Input Cells */}
              <div className="flex items-center justify-center gap-2 my-1">
                {otpCode.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => {
                      otpInputRefs.current[index] = el;
                    }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(index, e)}
                    className="w-11 h-13 text-center text-lg font-bold font-mono text-white rounded-xl bg-[#0e1017] border border-zinc-700/80 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400 focus:outline-none transition-all"
                  />
                ))}
              </div>

              {/* Verify Button */}
              <button
                type="button"
                onClick={() => executeVerifyOtp()}
                disabled={isSubmitting || otpCode.some((d) => !d)}
                className="w-full h-11 rounded-xl bg-cyan-400 hover:bg-cyan-300 text-black font-semibold text-xs tracking-wide flex items-center justify-center gap-2 transition-all shadow-lg shadow-cyan-950/40 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <ShieldCheck className="w-4 h-4 text-black" />
                )}
                <span>Verify & Continue</span>
              </button>

              {/* Resend Code & Back */}
              <div className="flex items-center justify-between w-full text-xs text-zinc-400 px-1 mt-1">
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  disabled={resendCooldown > 0 || isSubmitting}
                  className="hover:text-white transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? `Resend code in ${resendCooldown}s`
                    : "Resend code"}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setError(null);
                    setView("email");
                  }}
                  className="hover:text-white transition-colors cursor-pointer flex items-center gap-1"
                >
                  <ArrowLeft className="w-3 h-3" />
                  <span>Back</span>
                </button>
              </div>
            </div>
          )}

          {/* Security footnote */}
          <div className="mt-6 pt-4 border-t border-zinc-850/80 w-full text-[10px] text-zinc-500 font-mono flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>AES-256 Encrypted · Enterprise Grade Security</span>
          </div>
        </div>
      </div>

      {/* GOOGLE OAUTH SETUP GUIDE MODAL (Jika kredensial backend belum terpasang) */}
      {showGoogleGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-lg rounded-2xl bg-[#090a10] border border-zinc-800 p-6 text-left shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <GoogleIcon className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">
                  Google OAuth Configuration
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setShowGoogleGuide(false)}
                className="text-zinc-400 hover:text-white text-lg cursor-pointer leading-none"
              >
                &times;
              </button>
            </div>

            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Google OAuth client ID belum terdeteksi dari backend. Pastikan variabel berikut sudah diisi pada file{" "}
              <code className="text-cyan-400 font-mono">kospaces-backend/.env</code>:
            </p>

            <div className="p-3 rounded-xl bg-black/60 border border-zinc-800 font-mono text-[11px] text-zinc-300 mb-5 select-all">
              <span className="text-zinc-500"># Google OAuth di kospaces-backend/.env</span><br />
              GOOGLE_CLIENT_ID=your-google-client-id.apps.googleusercontent.com<br />
              GOOGLE_CLIENT_SECRET=your-google-client-secret
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowGoogleGuide(false)}
                className="px-4 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-white text-xs font-medium cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-[#030304] text-zinc-100 flex flex-col justify-between px-4 sm:px-6 lg:px-8 relative overflow-hidden selection:bg-cyan-400 selection:text-black">
      {/* Dynamic Animated Constellation Background */}
      <HeroNetworkCanvas />

      {/* Top Header */}
      <header className="relative z-20 w-full max-w-7xl mx-auto pt-6 flex items-center justify-between">
        <Logo href="/" size="md" />
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white transition-colors font-mono py-1.5 px-3.5 rounded-xl bg-zinc-900/70 border border-zinc-800 hover:border-zinc-700 backdrop-blur-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Home</span>
        </Link>
      </header>

      {/* Main Content Area with Split Layout */}
      <main className="relative z-20 flex-1 flex items-center justify-center py-6">
        <Suspense
          fallback={
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
              <span className="text-xs font-mono text-zinc-500">Loading console...</span>
            </div>
          }
        >
          <RailwayAuthModal />
        </Suspense>
      </main>

      {/* Bottom Bar matching Landing Page Footer */}
      <footer className="relative z-20 w-full max-w-7xl mx-auto pb-6 pt-5 border-t border-white/[0.05] flex flex-col sm:flex-row items-center justify-between gap-4 text-xs">
        <div className="flex items-center gap-2 font-mono text-emerald-400">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          <span>All Systems Normal</span>
        </div>

        <div className="text-zinc-500 font-mono text-[11px]">
          &copy; {new Date().getFullYear()} KotaCloud. All Rights Reserved.
        </div>
      </footer>
    </div>
  );
}

