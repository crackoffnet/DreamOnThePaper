import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { PRIMARY_HOSTS, SITE_HOST } from "@/lib/site";

export function middleware(request: NextRequest) {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = forwardedHost || request.headers.get("host") || request.nextUrl.host;
  const hostname = hostHeader.split(":")[0].toLowerCase();

  if (!PRIMARY_HOSTS.has(hostname)) {
    return NextResponse.next();
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const protocol = (forwardedProto || request.nextUrl.protocol.replace(":", "")).toLowerCase();

  if (hostname === SITE_HOST && protocol === "https") {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.protocol = "https";
  url.host = SITE_HOST;

  return NextResponse.redirect(url, 308);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
