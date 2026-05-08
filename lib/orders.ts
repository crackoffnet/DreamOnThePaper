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
import {
  getFinalAssetsSchemaSupport,
  getOrdersColumns,
  getOrdersSchemaSupport,
} from "@/lib/dbSchema";
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
  source_width?: number | null;
  source_height?: number | null;
  final_width?: number | null;
  final_height?: number | null;
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

  const orderColumns = await getOrdersColumns(db);
  const hasExactSizingColumns =
    orderColumns.has("wallpaper_type") &&
    orderColumns.has("preset_id") &&
    orderColumns.has("ratio_label") &&
    orderColumns.has("final_width") &&
    orderColumns.has("final_height") &&
    orderColumns.has("output_format") &&
    orderColumns.has("generation_status");

  if (hasExactSizingColumns) {
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
  } else {
    console.warn("[orders]", {
      failureReason: "orders exact sizing columns missing, using legacy insert",
      missingColumns: [
        "wallpaper_type",
        "preset_id",
        "ratio_label",
        "final_width",
        "final_height",
        "output_format",
        "generation_status",
      ].filter((column) => !orderColumns.has(column)),
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
  sourceWidth?: number | null;
  sourceHeight?: number | null;
  finalWidth?: number | null;
  finalHeight?: number | null;
}) {
  const now = Date.now();
  const id = crypto.randomUUID();
  const db = getDb();
  const schema = await getFinalAssetsSchemaSupport(db);

  if (!schema.exists || !schema.hasR2Key) {
    throw new Error("final_assets table is not configured for final asset storage");
  }

  const insertColumns = [
    "id",
    "order_id",
    "asset_type",
    "width",
    "height",
    "r2_key",
    "format",
  ];
  const insertValues: D1Value[] = [
    id,
    input.orderId,
    input.assetType,
    input.width,
    input.height,
    input.r2Key,
    "png",
  ];
  const updateClauses = [
    "width = excluded.width",
    "height = excluded.height",
    "r2_key = excluded.r2_key",
    "format = excluded.format",
  ];

  if (schema.hasFileSizeBytes) {
    insertColumns.push("file_size_bytes");
    insertValues.push(input.fileSizeBytes ?? null);
    updateClauses.push("file_size_bytes = excluded.file_size_bytes");
  }

  if (schema.hasGenerationStatus) {
    insertColumns.push("generation_status");
    insertValues.push("generated");
    updateClauses.push("generation_status = excluded.generation_status");
  }

  if (schema.hasGenerationAttempt) {
    insertColumns.push("generation_attempt");
    insertValues.push(1);
    updateClauses.push(
      "generation_attempt = COALESCE(final_assets.generation_attempt, 0) + 1",
    );
  }

  if (schema.hasPromptHash) {
    insertColumns.push("prompt_hash");
    insertValues.push(input.promptHash || null);
    updateClauses.push("prompt_hash = excluded.prompt_hash");
  }

  if (schema.hasSourceWidth) {
    insertColumns.push("source_width");
    insertValues.push(input.sourceWidth ?? null);
    updateClauses.push("source_width = excluded.source_width");
  }

  if (schema.hasSourceHeight) {
    insertColumns.push("source_height");
    insertValues.push(input.sourceHeight ?? null);
    updateClauses.push("source_height = excluded.source_height");
  }

  if (schema.hasFinalWidth) {
    insertColumns.push("final_width");
    insertValues.push(input.finalWidth ?? input.width);
    updateClauses.push("final_width = excluded.final_width");
  }

  if (schema.hasFinalHeight) {
    insertColumns.push("final_height");
    insertValues.push(input.finalHeight ?? input.height);
    updateClauses.push("final_height = excluded.final_height");
  }

  if (schema.hasUpdatedAt) {
    insertColumns.push("updated_at");
    insertValues.push(now);
    updateClauses.push("updated_at = excluded.updated_at");
  }

  insertColumns.push("created_at");
  insertValues.push(now);

  await db
    .prepare(
      `INSERT INTO final_assets (${insertColumns.join(", ")})
      VALUES (${insertColumns.map(() => "?").join(", ")})
      ON CONFLICT(order_id, asset_type) DO UPDATE SET
        ${updateClauses.join(", ")}`,
    )
    .bind(...insertValues)
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
  const db = getDb();
  const columns = await getOrdersColumns(db);
  const hasPreviewAssetKey = columns.has("preview_asset_key");

  if (!hasPreviewAssetKey) {
    console.warn("[orders]", {
      orderId,
      failureReason: "Optional order columns missing, falling back to legacy update",
      missingColumn: "preview_asset_key",
    });
  }

  await db
    .prepare(
      hasPreviewAssetKey
        ? `UPDATE orders
           SET preview_r2_key = ?, preview_asset_key = ?, preview_generated_at = ?, updated_at = ?
           WHERE id = ?`
        : `UPDATE orders
           SET preview_r2_key = ?, preview_generated_at = ?, updated_at = ?
           WHERE id = ?`,
    )
    .bind(
      ...(hasPreviewAssetKey
        ? [previewR2Key, previewR2Key, now, now, orderId]
        : [previewR2Key, now, now, orderId]),
    )
    .run();

  return getOrder(orderId);
}

export async function replacePreviewImage(input: {
  orderId: string;
  previewR2Key: string;
  previewInputHash: string;
}) {
  const now = Date.now();
  const db = getDb();
  const columns = await getOrdersColumns(db);
  const setClauses = ["preview_r2_key = ?", "preview_generated_at = ?", "updated_at = ?"];
  const values: D1Value[] = [input.previewR2Key, now, now];

  if (columns.has("preview_asset_key")) {
    setClauses.splice(1, 0, "preview_asset_key = ?");
    values.splice(1, 0, input.previewR2Key);
  } else {
    console.warn("[orders]", {
      orderId: input.orderId,
      failureReason: "Optional order columns missing, falling back to legacy update",
      missingColumn: "preview_asset_key",
    });
  }

  if (columns.has("preview_input_hash")) {
    setClauses.splice(setClauses.length - 2, 0, "preview_input_hash = ?");
    values.splice(values.length - 2, 0, input.previewInputHash);
  }

  if (columns.has("preview_stale")) {
    setClauses.splice(setClauses.length - 2, 0, "preview_stale = ?");
    values.splice(values.length - 2, 0, 0);
  }

  values.push(input.orderId);

  await db
    .prepare(`UPDATE orders SET ${setClauses.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

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
  const db = getDb();
  const schema = await getOrdersSchemaSupport(db);
  const setClauses = [
    "status = ?",
    "final_r2_key = ?",
    "final_generated_at = ?",
    "updated_at = ?",
  ];
  const values: D1Value[] = ["final_generated", finalR2Key, now, now];
  const missingColumns: string[] = [];

  if (schema.hasGenerationStatus) {
    setClauses.splice(1, 0, "generation_status = ?");
    values.splice(1, 0, "generated");
  } else {
    missingColumns.push("generation_status");
  }

  if (schema.hasFinalAssetKey) {
    setClauses.splice(setClauses.length - 2, 0, "final_asset_key = ?");
    values.splice(values.length - 2, 0, finalR2Key);
  } else {
    missingColumns.push("final_asset_key");
  }

  if (schema.hasOutputFormat) {
    setClauses.splice(setClauses.length - 2, 0, "output_format = ?");
    values.splice(values.length - 2, 0, "png");
  } else {
    missingColumns.push("output_format");
  }

  if (missingColumns.length > 0) {
    console.warn("[orders]", {
      orderId,
      failureReason: "Optional order columns missing, falling back to legacy final-generated update",
      missingColumns,
    });
  }

  values.push(orderId);

  await db
    .prepare(`UPDATE orders SET ${setClauses.join(", ")} WHERE id = ?`)
    .bind(...values)
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
  const columns = await getOrdersColumns(db);
  const setClauses = ["status = ?", "updated_at = ?"];
  const values: D1Value[] = ["failed", now];

  if (columns.has("final_failed_at")) {
    setClauses.splice(1, 0, "final_failed_at = ?");
    values.splice(1, 0, new Date(now).toISOString());
  }

  if (columns.has("final_failure_reason")) {
    setClauses.splice(setClauses.length - 1, 0, "final_failure_reason = ?");
    values.splice(values.length - 1, 0, message.slice(0, 500));
  }

  if (columns.has("generation_status")) {
    setClauses.splice(1, 0, "generation_status = ?");
    values.splice(1, 0, "failed");
  }

  values.push(orderId);

  await db
    .prepare(`UPDATE orders SET ${setClauses.join(", ")} WHERE id = ?`)
    .bind(...values)
    .run();

  try {
    await db
      .prepare(
        `INSERT INTO generation_events (id, order_id, type, status, message, created_at)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(eventId, orderId, "final_generation", "failed", message.slice(0, 500), now)
      .run();
  } catch (error) {
    console.warn("[orders]", {
      orderId,
      failureReason: "Generation event insert failed",
      errorMessage: error instanceof Error ? error.message : "Unknown generation event error",
    });
  }

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
