import { getRuntimeEnv } from "@/lib/env";
import { verifyFinalGenerationToken } from "@/lib/payment";
import {
  fromBase64Url,
  timingSafeStringEqual,
  toBase64Url,
} from "@/lib/security";

export type ResultAccessTokenPayload = {
  orderId: string;
  stripeCheckoutSessionId: string;
  purpose: "result_access";
  exp: number;
};

const RESULT_ACCESS_TTL_SECONDS = 60 * 60 * 24 * 7;

export async function signResultAccessToken(input: {
  orderId: string;
  stripeCheckoutSessionId: string;
}) {
  const payload: ResultAccessTokenPayload = {
    orderId: input.orderId,
    stripeCheckoutSessionId: input.stripeCheckoutSessionId,
    purpose: "result_access",
    exp: Math.floor(Date.now() / 1000) + RESULT_ACCESS_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await signValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

export async function verifyResultAccessToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = await signValue(encodedPayload);
  if (!timingSafeStringEqual(expected, signature)) {
    return null;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as ResultAccessTokenPayload;

    if (
      payload.exp <= Math.floor(Date.now() / 1000) ||
      payload.purpose !== "result_access"
    ) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

export function getBearerToken(request: Request) {
  const header = request.headers.get("authorization") || "";
  if (!header.toLowerCase().startsWith("bearer ")) {
    return "";
  }

  return header.slice(7).trim();
}

export function getResultAccessTokenTtlSeconds() {
  return RESULT_ACCESS_TTL_SECONDS;
}

export async function verifyResultOrFinalAccessToken(token: string) {
  const resultToken = await verifyResultAccessToken(token);
  if (resultToken) {
    return {
      kind: "result_access" as const,
      orderId: resultToken.orderId,
      sessionId: resultToken.stripeCheckoutSessionId,
      payload: resultToken,
    };
  }

  const finalToken = await verifyFinalGenerationToken(token);
  if (finalToken) {
    return {
      kind: "final_generation" as const,
      orderId: finalToken.orderId,
      sessionId: finalToken.sessionId,
      payload: finalToken,
    };
  }

  return null;
}

async function signValue(value: string) {
  const env = getRuntimeEnv();
  const secret =
    env.RESULT_TOKEN_SECRET ||
    env.ORDER_TOKEN_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-order-token-secret" : "");

  if (!secret) {
    throw new Error("ORDER_TOKEN_SECRET is not configured.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );

  return toBase64Url(signature);
}
