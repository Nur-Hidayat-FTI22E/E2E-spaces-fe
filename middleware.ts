import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // If visiting the root landing page and session cookie exists, redirect to workspace
  if (pathname === "/") {
    const session = request.cookies.get("kospaces_session");
    if (session?.value) {
      return NextResponse.redirect(new URL("/workspace/projects", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/"],
};
