import { auth } from "@/lib/auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export default auth((req: NextRequest & { auth: { user?: { role?: string } } | null }) => {
  const { pathname } = req.nextUrl;
  const session = req.auth;

  if (pathname.startsWith("/admin")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
    if (session.user?.role !== "admin") {
      return NextResponse.redirect(new URL("/chat", req.url));
    }
  }

  if (pathname.startsWith("/chat")) {
    if (!session) {
      return NextResponse.redirect(new URL("/auth/signin", req.url));
    }
  }

  if (pathname === "/") {
    if (session) {
      return NextResponse.redirect(new URL("/chat", req.url));
    }
    return NextResponse.redirect(new URL("/auth/signin", req.url));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/", "/admin/:path*", "/chat/:path*"],
};
