import { NextResponse, type NextRequest } from "next/server";

// Optimistic check only: bounces visitors without a session cookie to /login.
// The real session validation happens on the server in requireUser().
export function proxy(request: NextRequest) {
  const hasSession = request.cookies.has("pp_session");
  if (!hasSession) {
    const url = new URL("/login", request.url);
    if (request.nextUrl.pathname !== "/") url.searchParams.set("next", request.nextUrl.pathname);
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|_next/static|_next/image|favicon.ico|icon|apple-icon|manifest|.*\\.(?:png|jpg|svg|webp)$).*)"],
};
