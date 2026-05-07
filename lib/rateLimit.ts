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
const PREVIEW_ATTEMPT_LIMIT_PER_HOUR = 10;
const PREVIEW_SUCCESS_LIMIT_PER_IP_PER_DAY = 3;
const EMAIL_IP_LIMIT_PER_HOUR = 20;
const EMAIL_ORDER_LIMIT = 3;

export const rateLimitConfig = {
  checkoutLimitPerHour: CHECKOUT_LIMIT_PER_HOUR,
  previewAttemptLimitPerHour: PREVIEW_ATTEMPT_LIMIT_PER_HOUR,
  previewSuccessLimitPerIpPerDay: PREVIEW_SUCCESS_LIMIT_PER_IP_PER_DAY,
  emailIpLimitPerHour: EMAIL_IP_LIMIT_PER_HOUR,
  emailOrderLimit: EMAIL_ORDER_LIMIT,
};

export async function checkPreviewRateLimit(ipOrSession: string) {
  return (await checkPreviewSuccessLimit(ipOrSession)).allowed;
}

export async function checkCheckoutRateLimit(ip: string) {
  return checkCheckoutRateLimitDetailed(ip);
}

export async function checkCheckoutRateLimitDetailed(ip: string) {
  return checkRateLimitKey(checkoutIpKey(ip), CHECKOUT_LIMIT_PER_HOUR, HOUR_MS);
}

export async function checkEmailIpRateLimit(ip: string) {
  return checkRateLimitKey(emailIpKey(ip), EMAIL_IP_LIMIT_PER_HOUR, HOUR_MS);
}

export async function checkEmailOrderRateLimit(orderId: string) {
  return checkRateLimitKey(`email-order:${orderId}`, EMAIL_ORDER_LIMIT, DAY_MS * 30);
}

export async function recordPreviewUse(ipOrSession: string) {
  return recordPreviewSuccess(ipOrSession, ipOrSession);
}

export async function checkPreviewAttemptLimit(ip: string) {
  return checkRateLimitKey(previewAttemptIpKey(ip), PREVIEW_ATTEMPT_LIMIT_PER_HOUR, HOUR_MS);
}

export async function checkPreviewSuccessLimit(ip: string) {
  return peekRateLimitKey(
    previewSuccessIpKey(ip),
    PREVIEW_SUCCESS_LIMIT_PER_IP_PER_DAY,
    DAY_MS,
  );
}

export async function checkPreviewSessionSuccess(previewSessionId: string) {
  return peekRateLimitKey(previewSuccessSessionKey(previewSessionId), 1, DAY_MS);
}

export async function recordPreviewSuccess(ip: string, previewSessionId: string) {
  const ipResult = await checkRateLimitKey(
    previewSuccessIpKey(ip),
    PREVIEW_SUCCESS_LIMIT_PER_IP_PER_DAY,
    DAY_MS,
  );
  const sessionResult = await checkRateLimitKey(
    previewSuccessSessionKey(previewSessionId),
    1,
    DAY_MS,
  );

  return {
    allowed: ipResult.allowed && sessionResult.allowed,
    ipResult,
    sessionResult,
  };
}

export async function checkRateLimitKey(
  key: string,
  limit: number,
  windowMs: number,
) {
  try {
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
  } catch (error) {
    console.warn("[rate-limit]", {
      key,
      failureReason: "KV check failed, allowing request",
      errorMessage: error instanceof Error ? error.message : "Unknown KV error",
    });

    return result(true, key, 0, limit, Date.now() + windowMs, Date.now());
  }
}

export async function peekRateLimitKey(
  key: string,
  limit: number,
  windowMs: number,
) {
  try {
    const kv = getRateLimitKv();
    const now = Date.now();
    const stored = await kv.get<RateLimitEntry>(key, "json");

    if (!stored || stored.resetAt <= now) {
      return result(true, key, 0, limit, now + windowMs, now);
    }

    if (stored.count >= limit) {
      return result(false, key, stored.count, limit, stored.resetAt, now);
    }

    return result(true, key, stored.count, limit, stored.resetAt, now);
  } catch (error) {
    console.warn("[rate-limit]", {
      key,
      failureReason: "KV peek failed, allowing request",
      errorMessage: error instanceof Error ? error.message : "Unknown KV error",
    });

    return result(true, key, 0, limit, Date.now() + windowMs, Date.now());
  }
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
  return (await checkPreviewSessionSuccess(previewSessionId)).allowed;
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

function previewAttemptIpKey(ip: string) {
  return `preview:attempt:ip:${ip}:${hourBucket()}`;
}

function previewSuccessIpKey(ip: string) {
  return `preview:success:ip:${ip}:${dateBucket()}`;
}

function previewSuccessSessionKey(sessionId: string) {
  return `preview:success:session:${sessionId}`;
}

function emailIpKey(ip: string) {
  return `email:${ip}:${hourBucket()}`;
}

function hourBucket() {
  return new Date().toISOString().slice(0, 13);
}

function dateBucket() {
  return new Date().toISOString().slice(0, 10);
}
