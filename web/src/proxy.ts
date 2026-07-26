import { auth } from "@/lib/auth/edge";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const publicPaths = [
  "/",
  "/login",
  "/register",
  "/presentation",
  "/prototype",
  "/coding",
  "/api/coding",
  "/screening",
  "/api/screening",
  "/api/auth",
  "/api/register",
];

const API_PREFIX = "/api/";

function isPublicPath(pathname: string) {
  return publicPaths.some(
    (p) =>
      pathname === p ||
      pathname.startsWith(p + "/") ||
      pathname.startsWith("/api/auth"),
  );
}

/** Routes that are embedded in same-origin iframes (resume preview). */
function isResumePreviewRoute(pathname: string) {
  return /^\/api\/candidates\/[^/]+\/resume(\/html)?$/.test(pathname);
}

function withSecurityHeaders(response: NextResponse, noStore = false, sameOriginFrame = false) {
  // Resume preview routes are loaded inside same-origin iframes — use SAMEORIGIN.
  response.headers.set("X-Frame-Options", sameOriginFrame ? "SAMEORIGIN" : "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  if (noStore) {
    response.headers.set(
      "Cache-Control",
      "no-store, no-cache, must-revalidate, private",
    );
    response.headers.set("Pragma", "no-cache");
  }
  return response;
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isApiRoute = pathname.startsWith(API_PREFIX);

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (pathname === "/login" || pathname === "/register") {
    const session = await auth();
    if (session?.user?.id) {
      return NextResponse.redirect(new URL("/people", request.url));
    }
    return withSecurityHeaders(NextResponse.next());
  }

  if (isPublicPath(pathname)) {
    return withSecurityHeaders(NextResponse.next());
  }

  if (isApiRoute) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const sameOriginFrame = isResumePreviewRoute(pathname);
    return withSecurityHeaders(NextResponse.next(), true, sameOriginFrame);
  }

  const sameOriginFrame = isResumePreviewRoute(pathname);
  return withSecurityHeaders(NextResponse.next(), false, sameOriginFrame);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
