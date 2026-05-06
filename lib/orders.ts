import type { PackageId } from "@/lib/plans";
import type { OrderStatus } from "@/lib/order-state";
import { hashOrderInput } from "@/lib/order-state";
import type { WallpaperInput } from "@/lib/types";
import { getDb } from "@/lib/cloudflare";
import { getWallpaperMeta } from "@/lib/wallpaper";

export type DbOrder = {
  id: string;
  status: OrderStatus;
  package_type: PackageId | null;
  device: string;
  ratio: string;
  width: number;
  height: number;
  theme: string;
  style: string;
  quote_tone: string;
  prompt_hash: string;
  sanitized_answers_json: string;
  preview_r2_key: string | null;
  final_r2_key: string | null;
  stripe_session_id: string | null;
  stripe_payment_status: string | null;
  preview_generated_at: number | null;
  paid_at: number | null;
  final_generation_started_at: number | null;
  final_generated_at: number | null;
  final_generation_attempts: number;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
};

const ORDER_TTL_SECONDS = 60 * 60 * 6;

export async function createOrder(input: WallpaperInput) {
  const db = getDb();
  const now = Date.now();
  const id = crypto.randomUUID();
  const promptHash = await hashOrderInput(input);
  const meta = getWallpaperMeta(input);
  const [width, height] = meta.imageSize.split("x").map(Number);

  await db
    .prepare(
      `INSERT INTO orders (
        id, status, package_type, device, ratio, width, height, theme, style,
        quote_tone, prompt_hash, sanitized_answers_json, created_at, updated_at,
        expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      id,
      "preview_created",
      null,
      input.device,
      input.ratio,
      width,
      height,
      input.theme,
      input.style,
      input.quoteTone,
      promptHash,
      JSON.stringify(sanitizeAnswers(input)),
      now,
      now,
      now + ORDER_TTL_SECONDS * 1000,
    )
    .run();

  return getOrder(id);
}

export async function getOrder(orderId: string) {
  return getDb()
    .prepare("SELECT * FROM orders WHERE id = ?")
    .bind(orderId)
    .first<DbOrder>();
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const now = Date.now();
  await getDb()
    .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
    .bind(status, now, orderId)
    .run();

  return getOrder(orderId);
}

export async function attachPreviewImage(orderId: string, previewR2Key: string) {
  const now = Date.now();
  await getDb()
    .prepare(
      `UPDATE orders
       SET preview_r2_key = ?, preview_generated_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(previewR2Key, now, now, orderId)
    .run();

  return getOrder(orderId);
}

export async function attachStripeSession(
  orderId: string,
  stripeSessionId: string,
  packageType: PackageId,
) {
  const now = Date.now();
  await getDb()
    .prepare(
      `UPDATE orders
       SET stripe_session_id = ?, package_type = ?, status = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(stripeSessionId, packageType, "pending_payment", now, orderId)
    .run();

  return getOrder(orderId);
}

export async function markOrderPaid(orderId: string, stripeSessionId: string) {
  const now = Date.now();
  await getDb()
    .prepare(
      `UPDATE orders
       SET stripe_session_id = ?, stripe_payment_status = ?, status = ?,
           paid_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(stripeSessionId, "paid", "paid", now, now, orderId)
    .run();

  return getOrder(orderId);
}

export async function markOrderPendingPayment(
  orderId: string,
  stripeSessionId: string,
  packageType: PackageId,
) {
  return attachStripeSession(orderId, stripeSessionId, packageType);
}

export async function startFinalGeneration(orderId: string) {
  const now = Date.now();
  const result = await getDb()
    .prepare(
      `UPDATE orders
       SET status = 'final_generating',
           final_generation_attempts = final_generation_attempts + 1,
           final_generation_started_at = ?,
           updated_at = ?
       WHERE id = ?
         AND status = 'paid'
         AND final_generation_attempts = 0`,
    )
    .bind(now, now, orderId)
    .run();

  return (result.meta.changes || 0) === 1;
}

export async function markFinalGenerated(orderId: string, finalR2Key: string) {
  const now = Date.now();
  await getDb()
    .prepare(
      `UPDATE orders
       SET status = ?, final_r2_key = ?, final_generated_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind("final_generated", finalR2Key, now, now, orderId)
    .run();

  return getOrder(orderId);
}

export async function markFinalFailed(orderId: string, message: string) {
  const now = Date.now();
  const eventId = crypto.randomUUID();
  const db = getDb();

  await db.batch([
    db
      .prepare("UPDATE orders SET status = ?, updated_at = ? WHERE id = ?")
      .bind("failed", now, orderId),
    db
      .prepare(
        `INSERT INTO generation_events (id, order_id, type, status, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(eventId, orderId, "final_generation", "failed", message.slice(0, 500), now),
  ]);

  return getOrder(orderId);
}

function sanitizeAnswers(input: WallpaperInput) {
  return {
    goals: sanitizeText(input.goals),
    lifestyle: sanitizeText(input.lifestyle),
    career: sanitizeText(input.career),
    personalLife: sanitizeText(input.personalLife),
    health: sanitizeText(input.health),
    place: sanitizeText(input.place),
    feelingWords: sanitizeText(input.feelingWords),
    reminder: sanitizeText(input.reminder),
  };
}

function sanitizeText(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}
