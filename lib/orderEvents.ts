import { getDb } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";
import type { RequestMetadata } from "@/lib/requestMetadata";

type SafeValue = string | number | boolean | null;
type SafeObject = Record<string, unknown>;

export type OrderEventInput = {
  orderId?: string | null;
  customerId?: string | null;
  eventType: string;
  statusBefore?: string | null;
  statusAfter?: string | null;
  packageType?: string | null;
  requestMetadata?: Partial<RequestMetadata> | null;
  metadata?: SafeObject | null;
};

export type CustomerRecord = {
  id: string;
  email: string;
  email_normalized: string;
  stripe_customer_id: string | null;
};

const orderUpdateColumns = new Set([
  "customer_id",
  "order_token_hash",
  "package_type",
  "wallpaper_type",
  "package_name",
  "amount_cents",
  "currency",
  "stripe_checkout_session_id",
  "stripe_payment_intent_id",
  "stripe_customer_id",
  "stripe_payment_status",
  "stripe_mode",
  "customer_email",
  "customer_email_normalized",
  "client_ip",
  "client_ip_hash",
  "country",
  "user_agent",
  "referer",
  "utm_source",
  "utm_medium",
  "utm_campaign",
  "landing_path",
  "device",
  "ratio",
  "width",
  "height",
  "custom_width",
  "custom_height",
  "theme",
  "style",
  "quote_tone",
  "mood",
  "prompt_hash",
  "answers_hash",
  "preview_r2_key",
  "preview_created_at",
  "final_generation_started_at",
  "final_generated_at",
  "final_failed_at",
  "final_failure_reason",
  "email_send_count",
  "last_email_sent_at",
  "download_count",
  "first_downloaded_at",
  "last_downloaded_at",
  "paid_at",
  "abandoned_at",
  "expired_at",
]);

export async function createOrderEvent(db: D1Database, event: OrderEventInput) {
  try {
    const now = new Date().toISOString();
    await db
      .prepare(
        `INSERT INTO order_events (
          id, order_id, customer_id, event_type, status_before, status_after,
          package_type, ip_hash, country, user_agent, metadata_json, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        event.orderId || null,
        event.customerId || null,
        event.eventType,
        event.statusBefore || null,
        event.statusAfter || null,
        event.packageType || null,
        event.requestMetadata?.ipHash || null,
        event.requestMetadata?.country || null,
        event.requestMetadata?.userAgent || null,
        safeMetadata(event.metadata),
        now,
      )
      .run();
  } catch (error) {
    console.error("[order-event]", {
      eventType: event.eventType,
      orderId: event.orderId,
      failureReason: "Order event insert failed",
      errorMessage: error instanceof Error ? error.message : "Unknown event error",
    });
  }
}

export async function trackOrderEvent(event: OrderEventInput) {
  await createOrderEvent(getDb(), event);
}

export function safeMetadata(metadata: SafeObject | null | undefined) {
  if (!metadata) {
    return null;
  }

  const sanitized = sanitizeObject(metadata);
  const value = JSON.stringify(sanitized);
  return value.length > 2000 ? value.slice(0, 2000) : value;
}

export async function updateOrderStatus(
  db: D1Database,
  orderId: string,
  statusAfter: string,
  extraFields: Record<string, D1Value | undefined | null> = {},
) {
  try {
    const current = await db
      .prepare("SELECT status FROM orders WHERE id = ?")
      .bind(orderId)
      .first<{ status: string }>();
    const now = Date.now();
    const entries = Object.entries(extraFields).filter(
      ([key, value]) => orderUpdateColumns.has(key) && value !== undefined,
    );
    const setColumns = ["status = ?", "updated_at = ?"];
    const values: D1Value[] = [statusAfter, now];

    for (const [key, value] of entries) {
      setColumns.push(`${key} = ?`);
      values.push(value as D1Value);
    }

    values.push(orderId);

    await db
      .prepare(`UPDATE orders SET ${setColumns.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();

    await createOrderEvent(db, {
      orderId,
      eventType: "status_changed",
      statusBefore: current?.status || null,
      statusAfter,
      packageType:
        typeof extraFields.package_type === "string"
          ? extraFields.package_type
          : null,
    });
  } catch (error) {
    console.error("[order-tracking]", {
      orderId,
      failureReason: "Order status tracking update failed",
      errorMessage: error instanceof Error ? error.message : "Unknown update error",
    });
  }
}

export async function patchOrderTracking(
  orderId: string,
  fields: Record<string, D1Value | undefined | null>,
) {
  try {
    const entries = Object.entries(fields).filter(
      ([key, value]) => orderUpdateColumns.has(key) && value !== undefined,
    );

    if (entries.length === 0) {
      return;
    }

    const now = Date.now();
    const setColumns = ["updated_at = ?"];
    const values: D1Value[] = [now];

    for (const [key, value] of entries) {
      setColumns.push(`${key} = ?`);
      values.push(value as D1Value);
    }

    values.push(orderId);
    await getDb()
      .prepare(`UPDATE orders SET ${setColumns.join(", ")} WHERE id = ?`)
      .bind(...values)
      .run();
  } catch (error) {
    console.error("[order-tracking]", {
      orderId,
      failureReason: "Order tracking patch failed",
      errorMessage: error instanceof Error ? error.message : "Unknown patch error",
    });
  }
}

export async function getOrCreateCustomerByEmail(
  db: D1Database,
  email: string,
  stripeCustomerId?: string | null,
  firstOrderId?: string | null,
  amountCents = 0,
  countOrder = true,
) {
  try {
    const normalized = normalizeEmail(email);
    if (!normalized) {
      return null;
    }

    const existing = await db
      .prepare("SELECT * FROM customers WHERE email_normalized = ? LIMIT 1")
      .bind(normalized)
      .first<CustomerRecord>();
    const now = new Date().toISOString();

    if (existing) {
      await db
        .prepare(
          `UPDATE customers
           SET stripe_customer_id = COALESCE(stripe_customer_id, ?),
               last_seen_at = ?,
               total_orders = total_orders + ?,
               total_paid_cents = total_paid_cents + ?,
               updated_at = ?
           WHERE id = ?`,
        )
        .bind(
          stripeCustomerId || null,
          now,
          countOrder ? 1 : 0,
          countOrder ? amountCents : 0,
          now,
          existing.id,
        )
        .run();
      return existing;
    }

    const id = crypto.randomUUID();
    await db
      .prepare(
        `INSERT INTO customers (
          id, email, email_normalized, stripe_customer_id, first_order_id,
          first_seen_at, last_seen_at, total_orders, total_paid_cents,
          created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        id,
        email,
        normalized,
        stripeCustomerId || null,
        firstOrderId || null,
        now,
        now,
        countOrder ? 1 : 0,
        countOrder ? amountCents : 0,
        now,
        now,
      )
      .run();

    return {
      id,
      email,
      email_normalized: normalized,
      stripe_customer_id: stripeCustomerId || null,
    } satisfies CustomerRecord;
  } catch (error) {
    console.error("[customer-tracking]", {
      failureReason: "Customer upsert failed",
      errorMessage: error instanceof Error ? error.message : "Unknown customer error",
    });
    return null;
  }
}

export async function createEmailEvent(input: {
  orderId: string;
  customerId?: string | null;
  recipientEmail?: string | null;
  providerMessageId?: string | null;
  status: string;
  failureReason?: string | null;
  attachmentCount?: number;
  totalAttachmentBytes?: number;
}) {
  try {
    const normalized = normalizeEmail(input.recipientEmail || "");
    await getDb()
      .prepare(
        `INSERT INTO email_events (
          id, order_id, customer_id, recipient_email, recipient_email_normalized,
          provider, provider_message_id, status, failure_reason, attachment_count,
          total_attachment_bytes, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.orderId,
        input.customerId || null,
        input.recipientEmail || null,
        normalized || null,
        "brevo",
        input.providerMessageId || null,
        input.status,
        input.failureReason?.slice(0, 500) || null,
        input.attachmentCount ?? null,
        input.totalAttachmentBytes ?? null,
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    console.error("[email-event]", {
      orderId: input.orderId,
      status: input.status,
      failureReason: "Email event insert failed",
      errorMessage: error instanceof Error ? error.message : "Unknown email event error",
    });
  }
}

export async function createDownloadEvent(input: {
  orderId: string;
  customerId?: string | null;
  assetId?: string | null;
  assetType?: string | null;
  requestMetadata?: Partial<RequestMetadata> | null;
}) {
  try {
    await getDb()
      .prepare(
        `INSERT INTO download_events (
          id, order_id, customer_id, asset_id, asset_type, ip_hash, country,
          user_agent, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.orderId,
        input.customerId || null,
        input.assetId || null,
        input.assetType || null,
        input.requestMetadata?.ipHash || null,
        input.requestMetadata?.country || null,
        input.requestMetadata?.userAgent || null,
        new Date().toISOString(),
      )
      .run();
  } catch (error) {
    console.error("[download-event]", {
      orderId: input.orderId,
      assetId: input.assetId,
      failureReason: "Download event insert failed",
      errorMessage:
        error instanceof Error ? error.message : "Unknown download event error",
    });
  }
}

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export function stripeModeFromSecret() {
  const secret = getRuntimeEnv().STRIPE_SECRET_KEY || "";
  if (secret.startsWith("sk_live_")) return "live";
  if (secret.startsWith("sk_test_")) return "test";
  return "unknown";
}

export async function hashOperationalValue(value: string) {
  const env = getRuntimeEnv();
  const secret = env.IP_HASH_SECRET || env.ORDER_TOKEN_SECRET || "local-tracking";
  const bytes = new TextEncoder().encode(`${secret}:${value}`);
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function sanitizeObject(value: SafeObject): Record<string, SafeValue> {
  const output: Record<string, SafeValue> = {};
  for (const [key, rawValue] of Object.entries(value)) {
    const lowerKey = key.toLowerCase();
    if (
      lowerKey.includes("secret") ||
      lowerKey.includes("token") ||
      lowerKey.includes("key") ||
      lowerKey.includes("prompt") ||
      lowerKey.includes("answer") ||
      lowerKey.includes("base64") ||
      lowerKey.includes("stripeobject")
    ) {
      output[key] = "[redacted]";
      continue;
    }

    if (
      typeof rawValue === "string" ||
      typeof rawValue === "number" ||
      typeof rawValue === "boolean" ||
      rawValue === null
    ) {
      output[key] =
        typeof rawValue === "string" ? rawValue.slice(0, 300) : rawValue;
      continue;
    }

    output[key] = "[object]";
  }
  return output;
}
