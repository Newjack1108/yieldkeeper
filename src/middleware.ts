import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifyRequestOrigin } from "lucia";

const publicPaths = [
  "/",
  "/sign-in",
  "/sign-up",
  "/tenant/set-password",
  "/checklist/pre",
  "/checklist/quarterly",
  "/api/webhooks",
  "/api/tenant-portal/set-password",
  "/api/checklist",
];

function isPublicPath(pathname: string): boolean {
  return publicPaths.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  if (request.method === "GET") {
    return NextResponse.next();
  }
  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/webhooks/")) {
    return NextResponse.next();
  }
  const originHeader = request.headers.get("Origin");
  const hostHeader =
    request.headers.get("Host") ?? request.headers.get("X-Forwarded-Host");
  if (
    originHeader &&
    hostHeader &&
    !verifyRequestOrigin(originHeader, [hostHeader])
  ) {
    return new NextResponse(null, { status: 403 });
  }
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
