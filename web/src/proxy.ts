import { NextResponse, type NextRequest } from "next/server";
import { loginHref } from "@/lib/redirect";

/** Header that tells server components which path was requested (layouts do not get it otherwise). */
export const PATH_HEADER = "x-devsheet-path";

/** The API's login cookie (see AddCookie in the API's Program.cs). */
const AUTH_COOKIE = "devsheet.auth";

// Runs before every (app) page.
// - No login cookie at all: send the visitor to /login straight away (a real 307, before any rendering).
// - Otherwise pass the path on; the (app) layout asks the API whether the cookie is still valid and
//   redirects from there if it is not (expired or signed out elsewhere).
export function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname + request.nextUrl.search;
  if (!request.cookies.has(AUTH_COOKIE)) {
    return NextResponse.redirect(new URL(loginHref(path), request.url));
  }
  const headers = new Headers(request.headers);
  headers.set(PATH_HEADER, path);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ["/welcome", "/dashboard/:path*", "/settings/:path*"],
};
