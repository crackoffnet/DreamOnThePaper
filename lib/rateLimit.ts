import { getRateLimitKv } from "@/lib/cloudflare";
import { getClientIp } from "@/lib/security";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

export type RateLimitResult = {
  allowed: boolean;
  retryAfterSeconds: number;
  count: number;
  limit: number;
  key: string;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const CHECKOUT_LIMIT_PER_HOUR = 20;
const PREVIEW_LIMIT_PER_DAY = 3;

export const rateLimitConfig = {
  checkoutLimitPerHour: CHECKOUT_LIMIT_PER_HOUR,
  previewLimitPerDay: PREVIEW_LIMIT_PER_DAY,
};

export async function checkPreviewRateLimit(ipOrSession: string) {
  return (await checkRateLimitKey(previewIpKey(ipOrSession), PREVIEW_LIMIT_PER_DAY, DAY_MS)).allowed;
}

export async function checkCheckoutRateLimit(ip: string) {
  return checkCheckoutRateLimitDetailed(ip);
}

export async function checkCheckoutRateLimitDetailed(ip: string) {
  return checkRateLimitKey(checkoutIpKey(ip), CHECKOUT_LIMIT_PER_HOUR, HOUR_MS);
}

export async function recordPreviewUse(ipOrSession: string) {
  return (await checkRateLimitKey(`preview-session:${ipOrSession}`, 1, DAY_MS)).allowed;
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
    const resetAt = now + windowMs;
    await kv.put(
      key,
      JSON.stringify({ count: 1, resetAt }),
      { expirationTtl: Math.ceil(windowMs / 1000) },
    );
    return result(true, key, 1, limit, resetAt, now);
  }

  if (stored.count >= limit) {
    return result(false, key, stored.count, limit, stored.resetAt, now);
  }

  const count = stored.count + 1;
  await kv.put(
    key,
    JSON.stringify({ count, resetAt: stored.resetAt }),
    { expirationTtl: Math.max(1, Math.ceil((stored.resetAt - now) / 1000)) },
  );
  return result(true, key, count, limit, stored.resetAt, now);
}

export async function checkIpRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  return (await checkRateLimitKey(`${scope}:ip:${getClientIp(request)}`, limit, windowMs)).allowed;
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

function result(
  allowed: boolean,
  key: string,
  count: number,
  limit: number,
  resetAt: number,
  now: number,
): RateLimitResult {
  return {
    allowed,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil((resetAt - now) / 1000)),
    count,
    limit,
    key,
  };
}

function checkoutIpKey(ip: string) {
  return `checkout:${ip}:${hourBucket()}`;
}

function previewIpKey(ip: string) {
  return `preview:${ip}:${dateBucket()}`;
}

function hourBucket() {
  return new Date().toISOString().slice(0, 13);
}

function dateBucket() {
  return new Date().toISOString().slice(0, 10);
}
