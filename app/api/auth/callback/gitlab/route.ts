import { NextRequest, NextResponse } from "next/server";
import { generateAuthSuccessHtml } from "@/lib/auth/auth-success-html";
import { escapeHtml, escapeJs } from "@/lib/auth/sanitize";
import { OAUTH_STATE_COOKIE, verifyOAuthState } from "@/lib/auth/oauth-state";

// Semua nilai dinamis di-escape sebelum masuk HTML/JS (temuan K-2 audit).

const HTML_HEADERS = { "Content-Type": "text/html; charset=utf-8" };

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const state = searchParams.get("state");
  const cookieState = req.cookies.get(OAUTH_STATE_COOKIE)?.value;

  // Handle GitLab authorization errors
  if (error || !code) {
    const errorMsg = errorDescription || error || "GitLab authorization failed";
    const safeMsg = escapeHtml(errorMsg);
    const safeJsMsg = escapeJs(errorMsg);
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>GitLab Authorization Error</title>
          <style>
            body { background: #030304; color: #fff; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #e11d48; padding: 24px; border-radius: 12px; background: rgba(225,29,72,0.1); max-width: 400px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Authorization Failed</h3>
            <p>${safeMsg}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "GITLAB_AUTH_ERROR", error: "${safeJsMsg}" }, window.location.origin);
                setTimeout(() => window.close(), 2000);
              } else {
                setTimeout(() => { window.location.href = "/login"; }, 3000);
              }
            </script>
          </div>
        </body>
      </html>`,
      { headers: HTML_HEADERS }
    );
  }

  try {
    // K-2: verifikasi state (double-submit cookie) sebelum menukar code.
    const check = verifyOAuthState(cookieState, state);
    if (!check.ok) {
      throw new Error("Invalid OAuth state. Silakan ulangi proses login dari aplikasi.");
    }

    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      req.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/callback/gitlab`;

    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
      "http://127.0.0.1:8080/api/v1";

    // Delegate GitLab token exchange to Go backend
    const res = await fetch(`${backendUrl}/auth/gitlab`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errMsg =
        data?.error?.message ||
        data?.message ||
        (typeof data?.error === "string" ? data.error : null) ||
        "Failed to authenticate with GitLab on backend.";
      throw new Error(errMsg);
    }

    const { token, user, gitlab_auth } = data.data;

    const payload = {
      type: "GITLAB_AUTH_SUCCESS",
      token,
      user,
      gitlab_auth,
      data: gitlab_auth,
      payload: gitlab_auth,
    };

    const html = generateAuthSuccessHtml({
      provider: "gitlab",
      providerTitle: "GitLab",
      userEmail: user?.email || gitlab_auth?.email || "",
      userName: gitlab_auth?.name || gitlab_auth?.username || user?.username,
      payload,
      targetUrl: "/workspace/projects",
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": "kospaces_session=1; Path=/; Max-Age=604800; SameSite=Lax",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal authentication error";
    const safeMsg = escapeHtml(errorMsg);
    const safeJsMsg = escapeJs(errorMsg);
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>GitLab Authorization Error</title>
          <style>
            body { background: #030304; color: #fff; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #e11d48; padding: 24px; border-radius: 12px; background: rgba(225,29,72,0.1); max-width: 400px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Authorization Failed</h3>
            <p>${safeMsg}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "GITLAB_AUTH_ERROR", error: "${safeJsMsg}" }, window.location.origin);
                setTimeout(() => window.close(), 2500);
              }
            </script>
          </div>
        </body>
      </html>`,
      { headers: HTML_HEADERS }
    );
  }
}
