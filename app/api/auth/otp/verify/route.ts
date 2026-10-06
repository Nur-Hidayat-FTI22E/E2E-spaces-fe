import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const email = body?.email?.trim();
    const code = body?.code?.trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    if (!code || code.length < 4) {
      return NextResponse.json(
        { success: false, error: "Please enter the verification code sent to your email." },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
      "http://127.0.0.1:8080/api/v1";

    const res = await fetch(`${backendUrl}/auth/otp/verify`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, code }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      const errMsg =
        typeof data.error === "object" && data.error?.message
          ? data.error.message
          : data.message || data.error || "Invalid verification code.";
      return NextResponse.json(
        { success: false, error: errMsg },
        { status: res.status || 400 }
      );
    }

    return NextResponse.json({
      success: true,
      token: data.data?.token,
      user: data.data?.user,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : "Internal server error";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
