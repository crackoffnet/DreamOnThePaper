import type { PackageId } from "@/lib/plans";
import type { WallpaperInput } from "@/lib/types";
import { getRuntimeEnv } from "@/lib/env";
import { fromBase64Url, timingSafeStringEqual, toBase64Url } from "@/lib/security";
import { getWallpaperMeta } from "@/lib/wallpaper";

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
  packageType?: PackageId;
  input: WallpaperInput;
  promptHash: string;
  status: OrderStatus;
  previewImageId?: string;
  previewImageUrl?: string;
  device?: string;
  ratio?: string;
  width?: string;
  height?: string;
  theme?: string;
  style?: string;
  quoteTone?: string;
  sessionId?: string;
  stripeSessionId?: string;
  finalImageId?: string;
  finalImageUrl?: string;
  createdAt?: string;
  expiresAt?: string;
};

export type CheckoutOrderToken = {
  orderId: string;
  previewImageId?: string;
  previewImageUrl?: string;
  device: string;
  ratio: string;
  width: string;
  height: string;
  theme: string;
  style: string;
  quoteTone: string;
  promptHash: string;
  createdAt: string;
  expiresAt: string;
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
  const updated = {
    ...order,
    sessionId,
    stripeSessionId: sessionId,
    status: "paid" as const,
  };
  storeOrder(updated);
  return updated;
}

export function markOrderPendingPayment(order: OrderSnapshot, packageId: PackageId) {
  const updated = {
    ...order,
    packageId,
    packageType: packageId,
    status: "pending_payment" as const,
  };
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
    finalImageId: imageIdFromUrl(finalImageUrl) || order.finalImageId,
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
  options?: {
    status?: OrderStatus;
    previewImageUrl?: string;
    previewImageId?: string;
  },
) {
  const orderId = crypto.randomUUID();
  const promptHash = await hashOrderInput(input);
  const meta = getOrderMeta(input);
  const createdAt = new Date();
  const order: OrderSnapshot = {
    orderId,
    packageId,
    packageType: packageId,
    input,
    promptHash,
    status: options?.status || "pending_payment",
    previewImageUrl: options?.previewImageUrl,
    previewImageId:
      options?.previewImageId || imageIdFromUrl(options?.previewImageUrl || ""),
    createdAt: createdAt.toISOString(),
    expiresAt: new Date(
      createdAt.getTime() + SNAPSHOT_TOKEN_TTL_SECONDS * 1000,
    ).toISOString(),
    ...meta,
  };

  storeOrder(order);
  return order;
}

export async function createPreviewOrder(input: WallpaperInput, previewImageUrl: string) {
  return createOrderSnapshot("single", input, {
    status: "preview_created",
    previewImageUrl,
  });
}

export async function signOrderSnapshot(order: OrderSnapshot) {
  return signPayload({
    ...order,
    exp: Math.floor(Date.now() / 1000) + SNAPSHOT_TOKEN_TTL_SECONDS,
  });
}

export async function signCheckoutOrderToken(order: OrderSnapshot) {
  return signPayload(createCheckoutTokenPayload(order));
}

export async function verifyCheckoutOrderToken(token: string) {
  const payload = await verifySignedPayload<CheckoutOrderToken>(token);

  if (!payload?.expiresAt || Date.parse(payload.expiresAt) <= Date.now()) {
    return null;
  }

  return payload;
}

export function checkoutPayloadToMeta(payload: CheckoutOrderToken) {
  return {
    orderId: payload.orderId,
    device: payload.device,
    ratio: payload.ratio,
    width: payload.width,
    height: payload.height,
    theme: payload.theme,
    style: payload.style,
    quoteTone: payload.quoteTone,
    promptHash: payload.promptHash,
  };
}

function getOrderMeta(input: WallpaperInput) {
  const [width, height] = getWallpaperMeta(input).imageSize.split("x");

  return {
    device: input.device,
    ratio: input.ratio,
    width,
    height,
    theme: input.theme,
    style: input.style,
    quoteTone: input.quoteTone,
  };
}

function imageIdFromUrl(value: string) {
  const match = value.match(/\/api\/wallpaper-image\/([^/?#]+)/);
  return match?.[1] || "";
}

function createCheckoutTokenPayload(order: OrderSnapshot): CheckoutOrderToken {
  const createdAt = order.createdAt || new Date().toISOString();
  const expiresAt =
    order.expiresAt ||
    new Date(Date.now() + SNAPSHOT_TOKEN_TTL_SECONDS * 1000).toISOString();

  return {
    orderId: order.orderId,
    previewImageId: order.previewImageId,
    previewImageUrl: order.previewImageUrl,
    device: order.device || order.input.device,
    ratio: order.ratio || order.input.ratio,
    width: order.width || "",
    height: order.height || "",
    theme: order.theme || order.input.theme,
    style: order.style || order.input.style,
    quoteTone: order.quoteTone || order.input.quoteTone,
    promptHash: order.promptHash,
    createdAt,
    expiresAt,
  };
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
    getRuntimeEnv().ORDER_TOKEN_SECRET ||
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
