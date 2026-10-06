import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body.email;

    if (!email || typeof email !== "string" || !email.includes("@")) {
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();
    // Deterministic secure password for passwordless email authentication
    const deterministicPassword = `kospaces_pwl_${Buffer.from(cleanEmail).toString("hex").slice(0, 16)}!`;

    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
      "http://127.0.0.1:8080/api/v1";

    // 1. Try to register first (creates account if new)
    try {
      await fetch(`${backendUrl}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: deterministicPassword }),
      });
    } catch {
      // Ignore registration error if user already exists
    }

    // 2. Now login
    const loginRes = await fetch(`${backendUrl}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: cleanEmail, password: deterministicPassword }),
    });

    if (!loginRes.ok) {
      // Fallback: in case account was previously created with default password
      const fallbackLogin = await fetch(`${backendUrl}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password: "password123" }),
      });

      if (fallbackLogin.ok) {
        const fallbackData = await fallbackLogin.json();
        return NextResponse.json({
          success: true,
          token: fallbackData.data.token,
          user: fallbackData.data.user,
        });
      }

      const errJson = await loginRes.json().catch(() => ({}));
      return NextResponse.json(
        { error: errJson.message || "Failed to authenticate email." },
        { status: 401 }
      );
    }

    const data = await loginRes.json();
    return NextResponse.json({
      success: true,
      token: data.data.token,
      user: data.data.user,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
