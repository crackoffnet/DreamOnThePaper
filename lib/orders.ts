import type { PackageId } from "@/lib/plans";
import type { OrderStatus } from "@/lib/order-state";
import type { WallpaperProductId } from "@/lib/wallpaperProducts";
import { hashOrderInput } from "@/lib/order-state";
import type {
  DeviceType,
  QuoteTone,
  RatioType,
  ThemeType,
  WallpaperInput,
  WallpaperStyle,
} from "@/lib/types";
import { getDb } from "@/lib/cloudflare";
import { getWallpaperMeta } from "@/lib/wallpaper";

export type FinalAssetType =
  | "single"
  | "mobile"
  | "tablet"
  | "desktop"
  | "custom"
  | "version_1"
  | "version_2"
  | "version_3";

export type FinalAsset = {
  id: string;
  order_id: string;
  asset_type: FinalAssetType;
  width: number;
  height: number;
  r2_key: string;
  format: "png";
  file_size_bytes?: number | null;
  generation_status?: "generated" | "failed" | string | null;
  generation_attempt?: number | null;
  openai_image_id?: string | null;
  prompt_hash?: string | null;
  created_at: number;
  updated_at?: number | null;
};

export type DbOrder = {
  id: string;
  status: OrderStatus;
  package_type: PackageId | null;
  wallpaper_type?: WallpaperProductId | string | null;
  preset_id?: string | null;
  ratio_label?: string | null;
  package_name?: string | null;
  amount_cents?: number | null;
  currency?: string | null;
  device: string;
  ratio: string;
  width: number;
  height: number;
  custom_width?: number | null;
  custom_height?: number | null;
  source_width?: number | null;
  source_height?: number | null;
  final_width?: number | null;
  final_height?: number | null;
  output_format?: string | null;
  generation_status?: string | null;
  theme: string;
  style: string;
  mood?: string | null;
  quote_tone: string;
  prompt_hash: string;
  sanitized_answers_json: string;
  preview_r2_key: string | null;
  preview_asset_key?: string | null;
  preview_input_hash?: string | null;
  preview_stale?: number | null;
  final_r2_key: string | null;
  final_asset_key?: string | null;
  stripe_session_id: string | null;
  stripe_checkout_session_id?: string | null;
  stripe_payment_intent_id?: string | null;
  stripe_customer_id?: string | null;
  stripe_payment_status: string | null;
  stripe_mode?: "test" | "live" | "unknown" | null;
  customer_id?: string | null;
  customer_email?: string | null;
  customer_email_normalized?: string | null;
  client_ip_hash?: string | null;
  country?: string | null;
  email_send_count?: number | null;
  download_count?: number | null;
  preview_generated_at: number | null;
  paid_at: number | null;
  final_generation_started_at: number | null;
  final_generated_at: number | null;
  final_generation_attempts: number;
  created_at: number;
  updated_at: number;
  expires_at: number | null;
};

const ORDER_TTL_SECONDS = 60 * 60 * 24;
export const STALE_FINAL_GENERATION_MS = 10 * 60 * 1000;
const expirableOrderStatuses = new Set(["draft", "preview_created", "pending_payment"]);

export async function createOrder(input: WallpaperInput) {
  const db = getDb();
  const now = Date.now();
  const id = crypto.randomUUID();
  const promptHash = await hashOrderInput(input);
  const meta = getWallpaperMeta(input);
  const [width, height] = meta.imageSize.split("x").map(Number);

  try {
    await db
      .prepare(
        `INSERT INTO orders (
          id, status, package_type, wallpaper_type, preset_id, ratio_label, device, ratio,
          width, height, final_width, final_height, output_format, generation_status, theme, style,
          quote_tone, prompt_hash, sanitized_answers_json, created_at, updated_at,
          expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        "preview_created",
        "single",
        input.device,
        meta.presetId,
        meta.ratioLabel,
        input.device,
        input.ratio,
        width,
        height,
        width,
        height,
        "png",
        "preview_created",
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
  } catch (error) {
    if (!isLegacyOrderColumnError(error)) {
      throw error;
    }

    console.warn("[orders]", {
      failureReason: "orders exact sizing columns missing, using legacy insert",
      errorMessage: error instanceof Error ? error.message : "Unknown D1 error",
    });

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
        "single",
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
  }

  return getOrder(id);
}

export async function getOrder(orderId: string) {
  return getDb()
    .prepare("SELECT * FROM orders WHERE id = ?")
    .bind(orderId)
    .first<DbOrder>();
}

export function isUnpaidOrderExpired(order: DbOrder) {
  return (
    expirableOrderStatuses.has(order.status) &&
    typeof order.expires_at === "number" &&
    order.expires_at <= Date.now()
  );
}

export function isOrderExpired(order: DbOrder) {
  return isUnpaidOrderExpired(order);
}

export async function expireOrderIfNeeded(order: DbOrder) {
  if (!isOrderExpired(order)) {
    return order;
  }

  const now = Date.now();
  await getDb()
    .prepare(
      `UPDATE orders
       SET status = 'expired',
           expired_at = COALESCE(expired_at, ?),
           updated_at = ?
       WHERE id = ?
         AND status IN ('draft', 'preview_created', 'pending_payment')`,
    )
    .bind(new Date(now).toISOString(), now, order.id)
    .run();

  return getOrder(order.id);
}

export async function getOrderByStripeSessionId(stripeSessionId: string) {
  return getDb()
    .prepare("SELECT * FROM orders WHERE stripe_session_id = ?")
    .bind(stripeSessionId)
    .first<DbOrder>();
}

export async function getFinalAssets(orderId: string): Promise<FinalAsset[]> {
  const statement = getDb()
    .prepare(
      `SELECT * FROM final_assets
       WHERE order_id = ?
       ORDER BY
         CASE asset_type
           WHEN 'single' THEN 1
           WHEN 'mobile' THEN 2
           WHEN 'desktop' THEN 3
           WHEN 'version_1' THEN 4
           WHEN 'version_2' THEN 5
           WHEN 'version_3' THEN 6
           ELSE 99
         END`,
    )
    .bind(orderId);
  const results = await (
    statement as unknown as {
      all<T>(): Promise<{ results?: T[] }>;
    }
  ).all<FinalAsset>();

  return results.results || [];
}

export async function getFinalAsset(orderId: string, r2Key: string) {
  return getDb()
    .prepare("SELECT * FROM final_assets WHERE order_id = ? AND r2_key = ?")
    .bind(orderId, r2Key)
    .first<FinalAsset>();
}

export async function getFinalAssetById(orderId: string, assetId: string) {
  return getDb()
    .prepare("SELECT * FROM final_assets WHERE order_id = ? AND id = ?")
    .bind(orderId, assetId)
    .first<FinalAsset>();
}

export async function insertFinalAsset(input: {
  orderId: string;
  assetType: FinalAssetType;
  width: number;
  height: number;
  r2Key: string;
  fileSizeBytes?: number;
  promptHash?: string;
}) {
  const now = Date.now();
  const id = crypto.randomUUID();

  await getDb()
    .prepare(
      `INSERT INTO final_assets (
        id, order_id, asset_type, width, height, r2_key, format,
        file_size_bytes, generation_status, generation_attempt, prompt_hash,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(order_id, asset_type) DO UPDATE SET
        width = excluded.width,
        height = excluded.height,
        r2_key = excluded.r2_key,
        format = excluded.format,
        file_size_bytes = excluded.file_size_bytes,
        generation_status = excluded.generation_status,
        generation_attempt = COALESCE(final_assets.generation_attempt, 0) + 1,
        prompt_hash = excluded.prompt_hash,
        updated_at = excluded.updated_at`,
    )
    .bind(
      id,
      input.orderId,
      input.assetType,
      input.width,
      input.height,
      input.r2Key,
      "png",
      input.fileSizeBytes ?? null,
      "generated",
      1,
      input.promptHash || null,
      now,
      now,
    )
    .run();

  return getFinalAssets(input.orderId);
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
       SET preview_r2_key = ?, preview_asset_key = ?, preview_generated_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(previewR2Key, previewR2Key, now, now, orderId)
    .run();

  return getOrder(orderId);
}

export async function replacePreviewImage(input: {
  orderId: string;
  previewR2Key: string;
  previewInputHash: string;
}) {
  const now = Date.now();
  try {
    await getDb()
      .prepare(
        `UPDATE orders
         SET preview_r2_key = ?,
             preview_asset_key = ?,
             preview_input_hash = ?,
             preview_stale = 0,
             preview_generated_at = ?,
             updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        input.previewR2Key,
        input.previewR2Key,
        input.previewInputHash,
        now,
        now,
        input.orderId,
      )
      .run();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      !message.includes("no such column: preview_input_hash") &&
      !message.includes("no such column: preview_stale")
    ) {
      throw error;
    }

    await getDb()
      .prepare(
        `UPDATE orders
         SET preview_r2_key = ?,
             preview_asset_key = ?,
             preview_generated_at = ?,
             updated_at = ?
         WHERE id = ?`,
      )
      .bind(
        input.previewR2Key,
        input.previewR2Key,
        now,
        now,
        input.orderId,
      )
      .run();
  }

  return getOrder(input.orderId);
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
       SET stripe_session_id = ?, stripe_checkout_session_id = ?, package_type = ?,
           status = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(stripeSessionId, stripeSessionId, packageType, "pending_payment", now, orderId)
    .run();

  return getOrder(orderId);
}

export async function markOrderPaid(orderId: string, stripeSessionId: string) {
  const now = Date.now();
  await getDb()
    .prepare(
      `UPDATE orders
       SET stripe_session_id = ?, stripe_payment_status = ?,
           stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, ?),
           status = CASE
             WHEN status IN ('final_generating', 'final_generated', 'failed')
             THEN status
             ELSE ?
           END,
           paid_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind(stripeSessionId, "paid", stripeSessionId, "paid", now, now, orderId)
    .run();

  return getOrder(orderId);
}

export async function attachStripeSessionIfMissing(
  orderId: string,
  stripeSessionId: string,
  packageType: PackageId | null,
) {
  const now = Date.now();
  await getDb()
    .prepare(
      `UPDATE orders
       SET stripe_session_id = COALESCE(stripe_session_id, ?),
           stripe_checkout_session_id = COALESCE(stripe_checkout_session_id, ?),
           package_type = COALESCE(package_type, ?),
           updated_at = ?
       WHERE id = ?`,
    )
    .bind(stripeSessionId, stripeSessionId, packageType, now, orderId)
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
         AND final_generation_attempts < 2`,
    )
    .bind(now, now, orderId)
    .run();

  return (result.meta.changes || 0) === 1;
}

export async function resetStaleFinalGeneration(orderId: string) {
  const now = Date.now();
  const staleBefore = now - STALE_FINAL_GENERATION_MS;
  const result = await getDb()
    .prepare(
      `UPDATE orders
       SET status = 'paid',
           updated_at = ?
       WHERE id = ?
         AND status = 'final_generating'
         AND final_r2_key IS NULL
         AND (final_generation_started_at IS NULL OR final_generation_started_at < ?)
         AND final_generation_attempts < 2`,
    )
    .bind(now, orderId, staleBefore)
    .run();

  return (result.meta.changes || 0) === 1;
}

export async function resetFailedFinalGeneration(orderId: string) {
  const now = Date.now();
  const result = await getDb()
    .prepare(
      `UPDATE orders
       SET status = 'paid',
           updated_at = ?
       WHERE id = ?
         AND status = 'failed'
         AND final_r2_key IS NULL
         AND stripe_payment_status = 'paid'
         AND final_generation_attempts < 2`,
    )
    .bind(now, orderId)
    .run();

  return (result.meta.changes || 0) === 1;
}

export async function markFinalGenerated(orderId: string, finalR2Key: string) {
  const now = Date.now();
  await getDb()
    .prepare(
      `UPDATE orders
       SET status = ?, generation_status = ?, final_r2_key = ?, final_asset_key = ?,
           output_format = 'png', final_generated_at = ?, updated_at = ?
       WHERE id = ?`,
    )
    .bind("final_generated", "generated", finalR2Key, finalR2Key, now, now, orderId)
    .run();

  return getOrder(orderId);
}

export async function reopenPaidFinalOrder(orderId: string) {
  const now = Date.now();
  const result = await getDb()
    .prepare(
      `UPDATE orders
       SET status = 'paid',
           final_r2_key = NULL,
           updated_at = ?
       WHERE id = ?
         AND status IN ('final_generated', 'failed')
         AND stripe_payment_status = 'paid'
         AND final_generation_attempts < 3`,
    )
    .bind(now, orderId)
    .run();

  return (result.meta.changes || 0) === 1;
}

export async function markFinalFailed(orderId: string, message: string) {
  const now = Date.now();
  const eventId = crypto.randomUUID();
  const db = getDb();

  await db.batch([
    db
      .prepare(
        `UPDATE orders
         SET status = ?, final_failed_at = ?, final_failure_reason = ?,
             updated_at = ?
         WHERE id = ?`,
      )
      .bind("failed", new Date(now).toISOString(), message.slice(0, 500), now, orderId),
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

export function inputFromDbOrder(order: DbOrder): WallpaperInput {
  const answers = parseAnswers(order.sanitized_answers_json);

  return {
    device: order.device as DeviceType,
    ratio: order.ratio as RatioType,
    theme: order.theme as ThemeType,
    style: order.style as WallpaperStyle,
    goals: answers.goals,
    lifestyle: answers.lifestyle,
    career: answers.career,
    personalLife: answers.personalLife,
    health: answers.health,
    place: answers.place,
    feelingWords: answers.feelingWords,
    reminder: answers.reminder,
    quoteTone: order.quote_tone as QuoteTone,
    customWidth: order.device === "custom" ? order.width : undefined,
    customHeight: order.device === "custom" ? order.height : undefined,
  };
}

function parseAnswers(value: string) {
  try {
    const parsed = JSON.parse(value) as Partial<Record<keyof WallpaperInput, unknown>>;

    return {
      goals: stringValue(parsed.goals),
      lifestyle: stringValue(parsed.lifestyle),
      career: stringValue(parsed.career),
      personalLife: stringValue(parsed.personalLife),
      health: stringValue(parsed.health),
      place: stringValue(parsed.place),
      feelingWords: stringValue(parsed.feelingWords),
      reminder: stringValue(parsed.reminder),
    };
  } catch {
    return {
      goals: "",
      lifestyle: "",
      career: "",
      personalLife: "",
      health: "",
      place: "",
      feelingWords: "",
      reminder: "",
    };
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.slice(0, 300) : "";
}

function sanitizeText(value: string) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 300);
}

function isLegacyOrderColumnError(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("no column named wallpaper_type") ||
    message.includes("no column named preset_id") ||
    message.includes("no column named ratio_label") ||
    message.includes("no column named final_width") ||
    message.includes("no column named final_height") ||
    message.includes("no column named output_format") ||
    message.includes("no column named generation_status")
  );
}
