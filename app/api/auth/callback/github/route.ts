import { NextRequest, NextResponse } from "next/server";
import { generateAuthSuccessHtml } from "@/lib/auth/auth-success-html";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const installationId = searchParams.get("installation_id");
  const setupAction = searchParams.get("setup_action");
  const error = searchParams.get("error");
  const errorDescription = searchParams.get("error_description");
  const state = searchParams.get("state");

  // Handle explicit GitHub authorization errors (when no installation occurred)
  if (error && !installationId) {
    const errorMsg = errorDescription || error || "GitHub authorization failed";
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Authorization Error</title>
          <style>
            body { background: #030304; color: #fff; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #e11d48; padding: 24px; border-radius: 12px; background: rgba(225,29,72,0.1); max-width: 400px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Authorization Failed</h3>
            <p>${errorMsg}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "GITHUB_AUTH_ERROR", error: "${errorMsg}" }, "*");
                setTimeout(() => window.close(), 2000);
              } else {
                setTimeout(() => { window.location.href = "/login"; }, 3000);
              }
            </script>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Case 1: GitHub App installed without OAuth code (or already authorized)
  if (installationId && !code) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>KotaCloud Spaces App Installed</title>
          <style>
            body { background: #030304; color: #fff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #00d2ff; padding: 28px; border-radius: 16px; background: rgba(0,210,255,0.06); max-width: 440px; text-align: center; box-shadow: 0 0 40px rgba(0,210,255,0.15); }
            .badge { display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; border-radius: 9999px; background: rgba(0,210,255,0.2); color: #00d2ff; font-size: 11px; margin-bottom: 14px; font-weight: 600; font-family: monospace; }
            h3 { margin: 0 0 8px 0; color: #fff; font-size: 18px; font-weight: 600; }
            p { color: #a1a1aa; font-size: 13px; line-height: 1.5; margin: 0 0 16px 0; }
          </style>
        </head>
        <body>
          <div class="card">
            <div class="badge">&#10003; APP INSTALLED</div>
            <h3>KotaCloud Spaces Terhubung!</h3>
            <p>GitHub App berhasil diinstall pada akun Anda (ID: ${installationId}). Mengalihkan kembali ke dashboard...</p>
            <script>
              try {
                localStorage.setItem("kospaces_github_installed", "true");
                localStorage.setItem("kospaces_github_installation_id", "${installationId}");
              } catch(e) {}

              if (window.opener) {
                window.opener.postMessage({
                  type: "KOSPACES_GITHUB_APP_INSTALLED",
                  installation_id: "${installationId}",
                  setup_action: "${setupAction || 'install'}"
                }, "*");
                window.opener.postMessage({
                  type: "GITHUB_APP_INSTALLED",
                  installation_id: "${installationId}"
                }, "*");
                setTimeout(() => window.close(), 600);
              } else {
                const redirectTarget = "${state === "settings" ? "/workspace/settings?installed=true" : "/workspace/projects"}";
                window.location.replace(redirectTarget);
              }
            </script>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  // Case 2: Code is present (exchange with backend)
  if (!code) {
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Authorization Error</title>
          <style>
            body { background: #030304; color: #fff; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #e11d48; padding: 24px; border-radius: 12px; background: rgba(225,29,72,0.1); max-width: 400px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Authorization Incomplete</h3>
            <p>No authorization code received from GitHub.</p>
            <script>
              if (window.opener) {
                setTimeout(() => window.close(), 1500);
              } else {
                setTimeout(() => { window.location.href = "/login"; }, 2000);
              }
            </script>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }

  try {
    const origin =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "") ||
      req.nextUrl.origin;
    const redirectUri = `${origin}/api/auth/callback/github`;

    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
      "http://127.0.0.1:8080/api/v1";

    // Delegate GitHub token exchange and user authentication to Go backend
    const res = await fetch(`${backendUrl}/auth/github`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
        installation_id: installationId || undefined,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      // If code exchange failed but installationId is present, user installed app successfully
      if (installationId) {
        return new NextResponse(
          `<!DOCTYPE html>
          <html>
            <head>
              <title>KotaCloud Spaces App Installed</title>
              <style>
                body { background: #030304; color: #fff; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
                .card { border: 1px solid #00d2ff; padding: 24px; border-radius: 12px; background: rgba(0,210,255,0.08); max-width: 440px; text-align: center; }
              </style>
            </head>
            <body>
              <div class="card">
                <h3>App Installed Successfully!</h3>
                <p>GitHub App installed (ID: ${installationId}). Redirecting to workspace...</p>
                <script>
                  if (window.opener) {
                    window.opener.postMessage({
                      type: "KOSPACES_GITHUB_APP_INSTALLED",
                      installation_id: "${installationId}"
                    }, "*");
                    setTimeout(() => window.close(), 600);
                  } else {
                    window.location.replace("/workspace/settings?installed=1");
                  }
                </script>
              </div>
            </body>
          </html>`,
          { headers: { "Content-Type": "text/html; charset=utf-8" } }
        );
      }
      const errMsg =
        data?.error?.message ||
        data?.message ||
        (typeof data?.error === "string" ? data.error : null) ||
        "Failed to authenticate with GitHub on backend.";
      throw new Error(errMsg);
    }

    const { token, user, github_auth } = data.data;
    const githubAuthData = {
      ...github_auth,
      installation_id: installationId || github_auth?.installation_id || undefined,
    };

    const payload = JSON.stringify({
      type: "GITHUB_AUTH_SUCCESS",
      token,
      user,
      github_auth: githubAuthData,
      data: githubAuthData,
      payload: githubAuthData,
      installation_id: installationId || undefined,
    });

    const targetUrl = state === "settings" ? "/workspace/settings" : "/workspace/projects";
    const html = generateAuthSuccessHtml({
      provider: "github",
      providerTitle: "GitHub",
      userEmail: user?.email || "",
      userName: github_auth?.name || github_auth?.username || user?.username,
      payloadJson: payload,
      targetUrl,
      installationId: installationId || undefined,
    });

    return new NextResponse(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Set-Cookie": "kospaces_session=1; Path=/; Max-Age=604800; SameSite=Lax",
      },
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : "Internal authentication error";
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>GitHub Authorization Error</title>
          <style>
            body { background: #030304; color: #fff; font-family: monospace; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #e11d48; padding: 24px; border-radius: 12px; background: rgba(225,29,72,0.1); max-width: 400px; text-align: center; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Authorization Failed</h3>
            <p>${errorMsg}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "GITHUB_AUTH_ERROR", error: "${errorMsg}" }, "*");
                setTimeout(() => window.close(), 2500);
              }
            </script>
          </div>
        </body>
      </html>`,
      { headers: { "Content-Type": "text/html; charset=utf-8" } }
    );
  }
}