import type { PackageId } from "@/lib/plans";
import type { WallpaperInput } from "@/lib/types";
import { fromBase64Url, timingSafeStringEqual, toBase64Url } from "@/lib/security";

export type OrderStatus =
  | "preview_created"
  | "pending_payment"
  | "paid"
  | "final_generating"
  | "final_generated"
  | "failed";

export type OrderSnapshot = {
  orderId: string;
  packageId: PackageId;
  input: WallpaperInput;
  promptHash: string;
  status: OrderStatus;
  sessionId?: string;
  finalImageUrl?: string;
};

const orderStore = new Map<string, OrderSnapshot>();
const SNAPSHOT_TOKEN_TTL_SECONDS = 60 * 60 * 2;

// TODO: Replace this in-memory map with Cloudflare D1/KV for order metadata and
// R2 for final images so idempotency survives isolate restarts and redeploys.
export function storeOrder(order: OrderSnapshot) {
  orderStore.set(order.orderId, order);
  if (order.sessionId) {
    orderStore.set(order.sessionId, order);
  }
}

export function getOrderById(orderId: string) {
  return orderStore.get(orderId) || null;
}

export function getOrderBySessionId(sessionId: string) {
  return orderStore.get(sessionId) || null;
}

export function markOrderPaid(order: OrderSnapshot, sessionId: string) {
  const updated = { ...order, sessionId, status: "paid" as const };
  storeOrder(updated);
  return updated;
}

export function markFinalGenerating(order: OrderSnapshot) {
  const updated = { ...order, status: "final_generating" as const };
  storeOrder(updated);
  return updated;
}

export function markFinalGenerated(order: OrderSnapshot, finalImageUrl: string) {
  const updated = {
    ...order,
    finalImageUrl,
    status: "final_generated" as const,
  };
  storeOrder(updated);
  return updated;
}

export function markOrderFailed(order: OrderSnapshot) {
  const updated = { ...order, status: "failed" as const };
  storeOrder(updated);
  return updated;
}

export async function createOrderSnapshot(
  packageId: PackageId,
  input: WallpaperInput,
) {
  const orderId = crypto.randomUUID();
  const promptHash = await hashOrderInput(input);
  const order: OrderSnapshot = {
    orderId,
    packageId,
    input,
    promptHash,
    status: "pending_payment",
  };

  storeOrder(order);
  return order;
}

export async function signOrderSnapshot(order: OrderSnapshot) {
  return signPayload({
    ...order,
    exp: Math.floor(Date.now() / 1000) + SNAPSHOT_TOKEN_TTL_SECONDS,
  });
}

export async function verifyOrderSnapshotToken(token: string) {
  const payload = await verifySignedPayload<OrderSnapshot & { exp?: number }>(token);

  if (!payload?.exp || payload.exp <= Math.floor(Date.now() / 1000)) {
    return null;
  }

  const { exp: _exp, ...order } = payload;
  return order;
}

export async function hashOrderInput(input: WallpaperInput) {
  const encoded = new TextEncoder().encode(
    JSON.stringify({
      device: input.device,
      ratio: input.ratio,
      customWidth: input.customWidth || null,
      customHeight: input.customHeight || null,
      theme: input.theme,
      style: input.style,
      quoteTone: input.quoteTone,
      goals: input.goals,
      lifestyle: input.lifestyle,
      career: input.career,
      personalLife: input.personalLife,
      health: input.health,
      place: input.place,
      feelingWords: input.feelingWords,
      reminder: input.reminder,
    }),
  );
  const digest = await crypto.subtle.digest("SHA-256", encoded);

  return toBase64Url(digest);
}

async function signPayload(payload: unknown) {
  const encodedPayload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

async function verifySignedPayload<T>(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = await signValue(encodedPayload);
  if (!timingSafeStringEqual(expected, signature)) {
    return null;
  }

  try {
    return JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as T;
  } catch {
    return null;
  }
}

async function signValue(value: string) {
  const secret =
    process.env.ORDER_TOKEN_SECRET ||
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
