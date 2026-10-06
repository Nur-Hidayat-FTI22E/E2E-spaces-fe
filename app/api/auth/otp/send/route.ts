import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email?.trim();

    if (!email || !email.includes("@")) {
      return NextResponse.json(
        { success: false, error: "Please provide a valid email address." },
        { status: 400 }
      );
    }

    const backendUrl =
      process.env.BACKEND_INTERNAL_URL ||
      process.env.NEXT_PUBLIC_API_URL?.replace("localhost", "127.0.0.1") ||
      "http://127.0.0.1:8080/api/v1";

    const res = await fetch(`${backendUrl}/auth/otp/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();
    if (!res.ok || !data.success) {
      return NextResponse.json(
        { success: false, error: data.message || data.error || "Failed to send verification code." },
        { status: res.status || 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: data.data?.message || "Verification code sent to your email.",
      mode: "backend_smtp",
    });
  } catch (err: unknown) {
    console.error("[Frontend OTP Send Error]", err);
    return NextResponse.json(
      { success: false, error: "Failed to connect to authentication server." },
      { status: 500 }
    );
  }
}
