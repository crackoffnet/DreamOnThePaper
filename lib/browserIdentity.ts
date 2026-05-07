import { getRuntimeEnv } from "@/lib/env";

export const BROWSER_ID_COOKIE = "dop_browser_id";
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365;

export function resolveBrowserIdentity(request: Request) {
  const cookieHeader = request.headers.get("cookie") || "";
  const existing = readCookie(cookieHeader, BROWSER_ID_COOKIE);
  const browserId = existing || crypto.randomUUID();

  return {
    browserId,
    created: !existing,
    setCookie: !existing ? browserIdCookie(browserId) : "",
  };
}

export async function hashUserAgent(value: string) {
  const env = getRuntimeEnv();
  const secret = env.IP_HASH_SECRET || env.ORDER_TOKEN_SECRET || "local-ua-hash";
  const bytes = new TextEncoder().encode(`${secret}:ua:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function appendBrowserCookie(response: Response, cookieValue: string) {
  if (!cookieValue) {
    return response;
  }

  response.headers.append("Set-Cookie", cookieValue);
  return response;
}

function browserIdCookie(value: string) {
  return `${BROWSER_ID_COOKIE}=${encodeURIComponent(value)}; Path=/; Max-Age=${ONE_YEAR_SECONDS}; HttpOnly; Secure; SameSite=Lax`;
}

function readCookie(header: string, name: string) {
  const parts = header.split(/;\s*/);
  for (const part of parts) {
    const [key, ...rest] = part.split("=");
    if (key === name) {
      return decodeURIComponent(rest.join("="));
    }
  }

  return "";
}
