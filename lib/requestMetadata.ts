import { getRuntimeEnv } from "@/lib/env";

export type RequestMetadata = {
  ip: string;
  ipHash: string;
  country: string;
  userAgent: string;
  referer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  landingPath: string;
};

export async function getRequestMetadata(
  request: Request,
): Promise<RequestMetadata> {
  const url = new URL(request.url);
  const ip =
    request.headers.get("CF-Connecting-IP") ||
    request.headers.get("x-real-ip") ||
    firstForwardedIp(request.headers.get("x-forwarded-for")) ||
    "unknown";

  return {
    ip,
    ipHash: await hashIp(ip),
    country: sanitizeHeader(request.headers.get("CF-IPCountry")),
    userAgent: sanitizeHeader(request.headers.get("User-Agent"), 500),
    referer: sanitizeHeader(request.headers.get("Referer"), 500),
    utmSource: sanitizeQuery(url.searchParams.get("utm_source")),
    utmMedium: sanitizeQuery(url.searchParams.get("utm_medium")),
    utmCampaign: sanitizeQuery(url.searchParams.get("utm_campaign")),
    landingPath: sanitizeHeader(`${url.pathname}${url.search}`, 500),
  };
}

async function hashIp(ip: string) {
  const env = getRuntimeEnv();
  const secret = env.IP_HASH_SECRET || env.ORDER_TOKEN_SECRET || "local-ip-hash";
  const bytes = new TextEncoder().encode(`${secret}:${ip}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function firstForwardedIp(value: string | null) {
  return value?.split(",")[0]?.trim() || "";
}

function sanitizeHeader(value: string | null, maxLength = 300) {
  return (value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function sanitizeQuery(value: string | null) {
  return sanitizeHeader(value, 120);
}
