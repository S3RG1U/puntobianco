import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: it sees that a cookie exists, not that it is valid.
// Pages and data still verify the session with requireSession().
export default function proxy(request: NextRequest) {
  if (!getSessionCookie(request)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard",
    "/patients/:path*",
    "/treatments/:path*",
    "/accommodations/:path*",
    "/transfers/:path*",
    "/back-office/:path*",
    "/staff/:path*",
  ],
};
