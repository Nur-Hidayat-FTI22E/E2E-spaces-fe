/**
 * Helper to generate a modern, animated "Authorization Successful" HTML response
 * for OAuth callbacks (GitHub, GitLab, Google).
 *
 * Distinctive features compared to standard loading screens:
 * - Electric Cyan & Indigo theme on obsidian background
 * - Connected glowing timeline with meaningful SVG micro-badges
 * - Real-time linear progress bar
 * - Dynamic user identity confirmation pill
 * - Smooth step-by-step state machine with checkmark spring animations
 */

export interface AuthSuccessOptions {
  provider: "github" | "gitlab" | "google";
  providerTitle: string;
  userEmail: string;
  userName?: string;
  /** Objek payload — diserialisasi aman via safeJsonForScript (bukan string mentah). */
  payload: unknown;
  /** Hanya path internal relatif yang diterima (lihat safeInternalPath). */
  targetUrl: string;
  installationId?: string;
}

import { escapeHtml, escapeJs, safeInternalPath, safeJsonForScript } from "@/lib/auth/sanitize";

export function generateAuthSuccessHtml(options: AuthSuccessOptions): string {
  const {
    provider,
    providerTitle,
    userEmail,
    userName,
    payload,
    targetUrl,
    installationId = "",
  } = options;

  // Semua nilai dinamis di-escape sebelum masuk HTML/JS (temuan K-2).
  const safeProviderTitle = escapeHtml(providerTitle);
  const displayIdentity = escapeHtml(
    userEmail || userName || `${providerTitle} User`
  );
  const safeTargetUrl = escapeJs(safeInternalPath(targetUrl));
  const safeInstallationId = escapeJs(installationId);
  const safePayloadJson = safeJsonForScript(payload);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${safeProviderTitle} Authorization Successful — KotaCloud Spaces</title>
  <style>
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
    }

    body {
      background-color: #030304;
      color: #f4f4f5;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Inter", Helvetica, Arial, sans-serif;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      position: relative;
      overflow: hidden;
      -webkit-font-smoothing: antialiased;
    }

    /* Ambient Background Glow */
    .ambient-glow {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      width: 580px;
      height: 580px;
      background: radial-gradient(circle, rgba(0, 210, 255, 0.12) 0%, rgba(99, 102, 241, 0.06) 45%, transparent 70%);
      pointer-events: none;
      filter: blur(60px);
      z-index: 0;
      animation: pulseGlow 4s ease-in-out infinite alternate;
    }

    @keyframes pulseGlow {
      0% { opacity: 0.7; transform: translate(-50%, -50%) scale(0.95); }
      100% { opacity: 1; transform: translate(-50%, -50%) scale(1.05); }
    }

    /* Main Modal Card */
    .card {
      position: relative;
      z-index: 10;
      width: 100%;
      max-width: 440px;
      margin: 20px;
      background: rgba(13, 14, 20, 0.85);
      backdrop-filter: blur(24px);
      -webkit-backdrop-filter: blur(24px);
      border: 1px solid rgba(255, 255, 255, 0.08);
      border-radius: 20px;
      padding: 32px 28px;
      box-shadow: 
        0 24px 64px rgba(0, 0, 0, 0.7),
        0 0 40px rgba(0, 210, 255, 0.08),
        inset 0 1px 1px rgba(255, 255, 255, 0.1);
      animation: cardEnter 0.5s cubic-bezier(0.16, 1, 0.3, 1) forwards;
    }

    @keyframes cardEnter {
      0% { opacity: 0; transform: translateY(16px) scale(0.98); }
      100% { opacity: 1; transform: translateY(0) scale(1); }
    }

    /* Header & Brand Emblem */
    .header {
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
      margin-bottom: 24px;
    }

    .brand-logo-wrap {
      margin-bottom: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
    }

    .brand-logo-wrap img {
      width: 48px;
      height: 48px;
      object-fit: contain;
      filter: drop-shadow(0 4px 16px rgba(0, 210, 255, 0.25));
    }

    .brand-logo-wrap svg {
      width: 44px;
      height: 44px;
      color: #00d2ff;
      filter: drop-shadow(0 4px 16px rgba(0, 210, 255, 0.35));
    }

    .brand-title {
      font-size: 20px;
      font-weight: 700;
      letter-spacing: -0.02em;
      background: #ffffff;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 6px;
    }

    .provider-pill {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      font-size: 11px;
      font-weight: 500;
      color: #38bdf8;
      background: rgba(0, 210, 255, 0.08);
      border: 1px solid rgba(0, 210, 255, 0.2);
      border-radius: 9999px;
      padding: 3px 10px;
      margin-top: 2px;
    }

    .pulse-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: #00d2ff;
      box-shadow: 0 0 8px #00d2ff;
      animation: pulseDot 1.5s ease-in-out infinite alternate;
    }

    @keyframes pulseDot {
      0% { opacity: 0.4; transform: scale(0.85); }
      100% { opacity: 1; transform: scale(1.15); }
    }

    /* Linear Progress Bar */
    .progress-track {
      width: 100%;
      height: 4px;
      background: rgba(255, 255, 255, 0.06);
      border-radius: 9999px;
      overflow: hidden;
      margin: 18px 0 22px;
      position: relative;
    }

    .progress-bar {
      height: 100%;
      width: 20%;
      background: linear-gradient(90deg, #00d2ff, #38bdf8, #818cf8);
      border-radius: 9999px;
      box-shadow: 0 0 10px rgba(0, 210, 255, 0.8);
      transition: width 0.45s cubic-bezier(0.16, 1, 0.3, 1);
    }

    /* Timeline Steps */
    .timeline {
      display: flex;
      flex-direction: column;
      gap: 10px;
      position: relative;
    }

    .step-item {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 11px 14px;
      border-radius: 12px;
      background: rgba(255, 255, 255, 0.02);
      border: 1px solid rgba(255, 255, 255, 0.04);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
    }

    .step-item.active {
      background: rgba(0, 210, 255, 0.05);
      border-color: rgba(0, 210, 255, 0.28);
      box-shadow: 0 0 16px rgba(0, 210, 255, 0.08);
      transform: translateX(3px);
    }

    .step-item.completed {
      background: rgba(16, 185, 129, 0.04);
      border-color: rgba(16, 185, 129, 0.18);
    }

    /* Step Icon Box */
    .step-icon-box {
      width: 32px;
      height: 32px;
      border-radius: 9px;
      background: rgba(255, 255, 255, 0.04);
      border: 1px solid rgba(255, 255, 255, 0.06);
      display: flex;
      align-items: center;
      justify-content: center;
      color: #71717a;
      flex-shrink: 0;
      transition: all 0.3s ease;
    }

    .step-item.active .step-icon-box {
      background: rgba(0, 210, 255, 0.12);
      border-color: rgba(0, 210, 255, 0.35);
      color: #00d2ff;
      box-shadow: 0 0 10px rgba(0, 210, 255, 0.2);
    }

    .step-item.completed .step-icon-box {
      background: rgba(16, 185, 129, 0.12);
      border-color: rgba(16, 185, 129, 0.3);
      color: #34d399;
    }

    /* Step Texts */
    .step-body {
      flex: 1;
      min-width: 0;
    }

    .step-title {
      font-size: 13px;
      font-weight: 600;
      color: #a1a1aa;
      transition: color 0.3s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .step-item.active .step-title {
      color: #ffffff;
    }

    .step-item.completed .step-title {
      color: #e4e4e7;
    }

    .step-desc {
      font-size: 11px;
      color: #52525b;
      margin-top: 2px;
      transition: color 0.3s ease;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .step-item.active .step-desc {
      color: #38bdf8;
    }

    .step-item.completed .step-desc {
      color: #71717a;
    }

    /* Step Status Right Indicator */
    .step-status {
      width: 22px;
      height: 22px;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    /* Spinner */
    .step-spinner {
      width: 16px;
      height: 16px;
      border: 2px solid rgba(0, 210, 255, 0.2);
      border-top-color: #00d2ff;
      border-radius: 50%;
      animation: spin 0.75s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    /* Checkmark */
    .check-icon {
      width: 18px;
      height: 18px;
      color: #10b981;
      opacity: 0;
      transform: scale(0.5);
      transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
    }

    .step-item.completed .check-icon {
      opacity: 1;
      transform: scale(1);
    }

    /* Pending indicator */
    .pending-dot {
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: rgba(255, 255, 255, 0.15);
    }

    /* Footer & Tagline */
    .footer {
      margin-top: 22px;
      padding-top: 16px;
      border-top: 1px solid rgba(255, 255, 255, 0.05);
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 11px;
      color: #52525b;
    }

    .tagline {
      display: flex;
      align-items: center;
      gap: 6px;
      color: #71717a;
    }

    .tagline svg {
      width: 13px;
      height: 13px;
      color: #00d2ff;
    }

    .skip-link {
      color: #38bdf8;
      text-decoration: none;
      font-weight: 500;
      transition: all 0.2s ease;
      cursor: pointer;
    }

    .skip-link:hover {
      color: #00d2ff;
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="ambient-glow"></div>

  <div class="card" role="status" aria-live="polite">
    <!-- Header -->
    <div class="header">
      <div class="brand-logo-wrap">
        <img src="/logo1.png" alt="KotaCloud Spaces" onerror="this.style.display='none'; document.getElementById('svg-fallback').style.display='block';">
        <svg id="svg-fallback" style="display:none;" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
        </svg>
      </div>
      <h1 class="brand-title">KotaCloud Spaces</h1>
    </div>

    <!-- Linear Progress Bar -->
    <div class="progress-track">
      <div class="progress-bar" id="progressBar"></div>
    </div>

    <!-- Timeline Steps -->
    <div class="timeline">
      <!-- Step 1: Authentication -->
      <div class="step-item active" id="step1">
        <div class="step-icon-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
            <path d="m9 12 2 2 4-4"/>
          </svg>
        </div>
        <div class="step-body">
          <div class="step-title">Verifying Identity</div>
          <div class="step-desc" id="step1Desc">${displayIdentity}</div>
        </div>
        <div class="step-status" id="status1">
          <div class="step-spinner"></div>
        </div>
      </div>

      <!-- Step 2: Permissions & Repos -->
      <div class="step-item" id="step2">
        <div class="step-icon-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="6" y1="3" x2="6" y2="15"/>
            <circle cx="18" cy="6" r="3"/>
            <circle cx="6" cy="18" r="3"/>
            <path d="M18 9a9 9 0 0 1-9 9"/>
          </svg>
        </div>
        <div class="step-body">
          <div class="step-title">Syncing Workspace Context</div>
          <div class="step-desc">Loading active projects & services</div>
        </div>
        <div class="step-status" id="status2">
          <div class="pending-dot"></div>
        </div>
      </div>

      <!-- Step 3: Preparing Workspace -->
      <div class="step-item" id="step3">
        <div class="step-icon-box">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>
          </svg>
        </div>
        <div class="step-body">
          <div class="step-title">Preparing Dashboard</div>
          <div class="step-desc">Entering developer console</div>
        </div>
        <div class="step-status" id="status3">
          <div class="pending-dot"></div>
        </div>
      </div>
    </div>

    <!-- Footer -->
    <div class="footer">
      <div class="tagline">
        <svg viewBox="0 0 24 24" fill="currentColor">
          <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
        </svg>
        <span>High-Performance PaaS</span>
      </div>
      <a href="#" class="skip-link" id="skipLink" onclick="proceedImmediately(event)">Proceed &rarr;</a>
    </div>
  </div>

  <script>
    (function() {
      // 1. Immediately store credentials to avoid session loss
      const payload = ${safePayloadJson};
      const targetUrl = "${safeTargetUrl}";
      const installationId = "${safeInstallationId}";
      const isPopup = Boolean(window.opener);

      try {
        if (payload.token) {
          localStorage.setItem("kospaces_jwt_token", payload.token);
          localStorage.setItem("kospaces_token", payload.token);
        }
        if (payload.user) {
          localStorage.setItem("kospaces_current_user", JSON.stringify(payload.user));
          localStorage.setItem("kospaces_user", JSON.stringify(payload.user));
        }
        if (payload.github_auth) {
          localStorage.setItem("kospaces_github_auth", JSON.stringify(payload.github_auth));
          if (payload.user && payload.user.id) {
            localStorage.setItem("kospaces_github_auth_" + payload.user.id, JSON.stringify(payload.github_auth));
          }
        }
        if (payload.gitlab_auth) {
          localStorage.setItem("kospaces_gitlab_auth", JSON.stringify(payload.gitlab_auth));
          if (payload.user && payload.user.id) {
            localStorage.setItem("kospaces_gitlab_auth_" + payload.user.id, JSON.stringify(payload.gitlab_auth));
          }
        }
      } catch (e) {
        console.warn("Storage write error:", e);
      }
      document.cookie = "kospaces_session=1; path=/; max-age=604800; SameSite=Lax";

      // 2. Notify opener immediately if in a popup
      if (isPopup) {
        try {
          window.opener.postMessage(payload, window.location.origin);
          if (payload.github_auth) {
            window.opener.postMessage({
              type: "KOSPACES_GITHUB_AUTH_SUCCESS",
              payload: payload.github_auth
            }, window.location.origin);
          }
          if (payload.gitlab_auth) {
            window.opener.postMessage({
              type: "KOSPACES_GITLAB_AUTH_SUCCESS",
              payload: payload.gitlab_auth
            }, window.location.origin);
          }
          if (installationId) {
            window.opener.postMessage({
              type: "KOSPACES_GITHUB_APP_INSTALLED",
              installation_id: installationId
            }, window.location.origin);
          }
        } catch (e) {
          console.warn("postMessage error:", e);
        }
      }

      // Checkmark SVG generator
      function getCheckmarkSvg() {
        return '<svg class="check-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>';
      }

      function getSpinnerHtml() {
        return '<div class="step-spinner"></div>';
      }

      const progressBar = document.getElementById('progressBar');
      const step1 = document.getElementById('step1');
      const step2 = document.getElementById('step2');
      const step3 = document.getElementById('step3');
      const status1 = document.getElementById('status1');
      const status2 = document.getElementById('status2');
      const status3 = document.getElementById('status3');

      let redirected = false;
      function finishAndRedirect() {
        if (redirected) return;
        redirected = true;
        if (isPopup) {
          window.close();
        } else {
          window.location.replace(targetUrl);
        }
      }

      window.proceedImmediately = function(e) {
        if (e) e.preventDefault();
        finishAndRedirect();
      };

      // Faster timeline if in popup window
      const baseDuration = isPopup ? 400 : 700;

      // Initial progress
      progressBar.style.width = '30%';

      // Stage 1 -> 2
      setTimeout(function() {
        step1.classList.remove('active');
        step1.classList.add('completed');
        status1.innerHTML = getCheckmarkSvg();

        step2.classList.add('active');
        status2.innerHTML = getSpinnerHtml();
        progressBar.style.width = '65%';
      }, baseDuration);

      // Stage 2 -> 3
      setTimeout(function() {
        step2.classList.remove('active');
        step2.classList.add('completed');
        status2.innerHTML = getCheckmarkSvg();

        step3.classList.add('active');
        status3.innerHTML = getSpinnerHtml();
        progressBar.style.width = '92%';
      }, baseDuration * 2);

      // Stage 3 Complete -> Redirect
      setTimeout(function() {
        step3.classList.remove('active');
        step3.classList.add('completed');
        status3.innerHTML = getCheckmarkSvg();
        progressBar.style.width = '100%';

        setTimeout(finishAndRedirect, isPopup ? 250 : 350);
      }, baseDuration * 3);

    })();
  </script>
</body>
</html>`;
}
