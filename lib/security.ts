import { NextResponse } from "next/server";

const RATE_LIMIT_WINDOW_MS = 60_000;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export function getSiteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || "https://dreamonthepaper.com")
    .replace(/\/+$/, "");
}

export function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous"
  );
}

export function checkRateLimit(
  request: Request,
  key: string,
  limit = 8,
  windowMs = RATE_LIMIT_WINDOW_MS,
) {
  const id = `${key}:${getClientIp(request)}`;
  const now = Date.now();
  const current = rateLimitStore.get(id);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(id, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

export function assertSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");

  if (!origin || !host) {
    return true;
  }

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

export function safeLog(message: string, details?: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(message, details);
  }
}

export function toBase64Url(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";

  for (let index = 0; index < view.length; index += 1) {
    binary += String.fromCharCode(view[index]);
  }

  return btoa(binary)
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

export function fromBase64Url(value: string) {
  const padded = value.replace(/-/g, "+").replace(/_/g, "/").padEnd(
    Math.ceil(value.length / 4) * 4,
    "=",
  );
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}
