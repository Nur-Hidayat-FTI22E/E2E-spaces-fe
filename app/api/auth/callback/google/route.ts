import { NextRequest, NextResponse } from "next/server";
import { generateAuthSuccessHtml } from "@/lib/auth/auth-success-html";

export async function GET(req: NextRequest) {
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  // Handle Google authorization errors
  if (error || !code) {
    const errorMsg = error || "Google authorization was cancelled or failed.";
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Google Authorization Error</title>
          <style>
            body { background: #030304; color: #fff; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #e11d48; padding: 24px; border-radius: 16px; background: rgba(225,29,72,0.1); max-width: 400px; text-align: center; }
            h3 { margin-top: 0; color: #fb7185; }
            p { font-size: 14px; color: #cbd5e1; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Authorization Failed</h3>
            <p>${errorMsg}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "GOOGLE_AUTH_ERROR", error: "${errorMsg}" }, "*");
                setTimeout(() => window.close(), 1500);
              } else {
                setTimeout(() => { window.location.href = "/login"; }, 2500);
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
    const redirectUri = `${origin}/api/auth/callback/google`;

    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
      "http://127.0.0.1:8080/api/v1";

    // Delegate Google token exchange and user authentication to Go backend
    const res = await fetch(`${backendUrl}/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      // Backend returns: { success: false, error: { code: "...", message: "..." } }
      const errMsg =
        data?.error?.message ||
        data?.message ||
        (typeof data?.error === "string" ? data.error : null) ||
        "Failed to authenticate with Google on backend.";
      throw new Error(errMsg);
    }

    const { token, user } = data.data;

    const authPayload = JSON.stringify({
      type: "GOOGLE_AUTH_SUCCESS",
      token,
      user,
    });

    const html = generateAuthSuccessHtml({
      provider: "google",
      providerTitle: "Google",
      userEmail: user?.email || "",
      userName: user?.name || user?.username,
      payloadJson: authPayload,
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
    return new NextResponse(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>Google Authentication Error</title>
          <style>
            body { background: #030304; color: #fff; font-family: -apple-system, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; }
            .card { border: 1px solid #e11d48; padding: 24px; border-radius: 16px; background: rgba(225,29,72,0.1); max-width: 440px; text-align: center; }
            h3 { margin-top: 0; color: #fb7185; }
            p { font-size: 13px; color: #cbd5e1; line-height: 1.5; }
          </style>
        </head>
        <body>
          <div class="card">
            <h3>Google Authentication Failed</h3>
            <p>${errorMsg}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: "GOOGLE_AUTH_ERROR", error: "${errorMsg}" }, "*");
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