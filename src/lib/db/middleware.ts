import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

export async function updateSession(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value);
  const isAuthPage =
    pathname.startsWith("/login") || pathname.startsWith("/signup");
  const isAuthRoute = pathname.startsWith("/auth") || pathname.startsWith("/api/auth");
  const isApiRoute = pathname.startsWith("/api/");
  const isPublic = pathname === "/" || isAuthPage || isAuthRoute;

  if (isApiRoute) return NextResponse.next({ request });

  if (!hasSession && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (hasSession && isAuthPage) {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next({ request });
}
