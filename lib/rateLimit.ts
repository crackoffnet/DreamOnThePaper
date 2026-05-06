import { getClientIp } from "@/lib/security";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

const memoryRateLimits = new Map<string, RateLimitEntry>();
const usedPreviewSessions = new Set<string>();
const usedFinalSessions = new Set<string>();

// TODO: Replace this in-memory fallback with Cloudflare KV/D1 for production-wide
// limits across isolates, regions, and deploys.
export function checkRateLimitKey(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const current = memoryRateLimits.get(key);

  if (!current || current.resetAt <= now) {
    memoryRateLimits.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  return true;
}

export function checkIpRateLimit(
  request: Request,
  scope: string,
  limit: number,
  windowMs: number,
) {
  return checkRateLimitKey(`${scope}:ip:${getClientIp(request)}`, limit, windowMs);
}

export function consumePreviewSession(previewSessionId: string) {
  if (usedPreviewSessions.has(previewSessionId)) {
    return false;
  }

  usedPreviewSessions.add(previewSessionId);
  return true;
}

export function consumeFinalSession(sessionId: string) {
  if (usedFinalSessions.has(sessionId)) {
    return false;
  }

  usedFinalSessions.add(sessionId);
  return true;
}

export function releaseFinalSession(sessionId: string) {
  usedFinalSessions.delete(sessionId);
}
