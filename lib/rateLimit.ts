import { getRateLimitKv } from "@/lib/cloudflare";
import { getClientIp } from "@/lib/security";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

export async function checkPreviewRateLimit(ipOrSession: string) {
  return checkRateLimitKey(`preview:${ipOrSession}`, 3, DAY_MS);
}

export async function checkCheckoutRateLimit(ip: string) {
  return checkRateLimitKey(`checkout:ip:${ip}`, 5, HOUR_MS);
}

export async function recordPreviewUse(ipOrSession: string) {
  return checkRateLimitKey(`preview-session:${ipOrSession}`, 1, DAY_MS);
}

export async function checkRateLimitKey(
  key: string,
  limit: number,
  windowMs: number,
) {
  const kv = getRateLimitKv();
  const now = Date.now();
  const stored = await kv.get<RateLimitEntry>(key, "json");

  if (!stored || stored.resetAt <= now) {
    await kv.put(
      key,
      JSON.stringify({ count: 1, resetAt: now + windowMs }),
      { expirationTtl: Math.ceil(windowMs / 1000) },
    );
    return true;
  }

  if (stored.count >= limit) {
    return false;
  }

  await kv.put(
    key,
    JSON.stringify({ count: stored.count + 1, resetAt: stored.resetAt }),
    { expirationTtl: Math.max(1, Math.ceil((stored.resetAt - now) / 1000)) },
  );
  return true;
}

export async function checkIpRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  return checkRateLimitKey(`${scope}:ip:${getClientIp(request)}`, limit, windowMs);
}

export async function consumePreviewSession(previewSessionId: string) {
  return recordPreviewUse(previewSessionId);
}

export async function consumeFinalSession(sessionId: string) {
  const kv = getRateLimitKv();
  const key = `final-session:${sessionId}`;
  const existing = await kv.get(key);

  if (existing) {
    return false;
  }

  await kv.put(key, "1", { expirationTtl: 60 * 60 * 24 * 30 });
  return true;
}

export async function releaseFinalSession(sessionId: string) {
  await getRateLimitKv().delete(`final-session:${sessionId}`);
}
