import { getDb } from "@/lib/cloudflare";
import { getOrder } from "@/lib/orders";
import { updateOrderStatus as updateTrackedOrderStatus } from "@/lib/orderEvents";

const ACTIVE_DRAFT_STATUSES = new Set(["draft", "preview_created", "pending_payment"]);

export type BrowserSession = {
  browser_id: string;
  active_order_id: string | null;
  updated_at: string;
};

export type PreviewAvailability = {
  ok: true;
  hasPreviewAvailable: true;
  nextPreviewAt: null;
  activeOrderId: string | null;
  message?: string;
};

export async function getPreviewAvailability(
  browserId: string,
): Promise<PreviewAvailability> {
  try {
    const session = await getBrowserSession(browserId);
    return {
      ok: true,
      hasPreviewAvailable: true,
      nextPreviewAt: null,
      activeOrderId: session?.active_order_id || null,
    };
  } catch (error) {
    logPreviewTrackingFailure("Preview availability lookup failed", error);
    return {
      ok: true,
      hasPreviewAvailable: true,
      nextPreviewAt: null,
      activeOrderId: null,
    };
  }
}

export async function trackPreviewEntitlement(input: {
  browserId: string;
  ipHash: string;
  uaHash: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();

  try {
    const existing = await db
      .prepare("SELECT id, preview_count FROM preview_entitlements WHERE browser_id = ?")
      .bind(input.browserId)
      .first<{ id?: string; preview_count?: number }>();

    if (existing?.id) {
      await db
        .prepare(
          `UPDATE preview_entitlements
           SET ip_hash = ?, ua_hash = ?, preview_count = ?, last_preview_at = ?,
               window_starts_at = COALESCE(window_starts_at, ?), updated_at = ?
           WHERE browser_id = ?`,
        )
        .bind(
          input.ipHash,
          input.uaHash,
          (existing.preview_count || 0) + 1,
          now,
          now,
          now,
          input.browserId,
        )
        .run();
      return;
    }

    await db
      .prepare(
        `INSERT INTO preview_entitlements (
          id, browser_id, ip_hash, ua_hash, preview_count, last_preview_at,
          window_starts_at, blocked_until, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.browserId,
        input.ipHash,
        input.uaHash,
        1,
        now,
        now,
        now,
        now,
      )
      .run();
  } catch (error) {
    logPreviewTrackingFailure("Preview entitlement tracking failed", error);
  }
}

export async function consumePreviewEntitlement(_input: {
  browserId: string;
  ipHash: string;
  uaHash: string;
}) {
  return {
    allowed: true,
    unavailable: false,
    nextPreviewAt: null,
    denialReason: null,
    message: "",
  } as const;
}

export async function recordPreviewAttempt(input: {
  browserId: string;
  orderId?: string | null;
  ipHash: string;
  uaHash: string;
  outcome: "generated" | "failed" | "rate_limited";
  denialReason?: string | null;
}) {
  const db = getDb();
  const createdAt = new Date().toISOString();

  try {
    await db
      .prepare(
        `INSERT INTO preview_attempts (
          id, browser_id, order_id, ip_hash, ua_hash, outcome, denial_reason, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        crypto.randomUUID(),
        input.browserId,
        input.orderId || null,
        input.ipHash,
        input.uaHash,
        input.outcome,
        input.denialReason || null,
        createdAt,
      )
      .run();
  } catch (error) {
    if (isMissingColumnError(error, "outcome")) {
      await db
        .prepare(
          `INSERT INTO preview_attempts (
            id, browser_id, order_id, ip_hash, ua_hash, allowed, denial_reason, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        )
        .bind(
          crypto.randomUUID(),
          input.browserId,
          input.orderId || null,
          input.ipHash,
          input.uaHash,
          input.outcome === "generated" ? 1 : 0,
          input.denialReason || null,
          createdAt,
        )
        .run();
      return;
    }

    logPreviewTrackingFailure("Preview attempt tracking failed", error);
  }
}

export async function getBrowserSession(browserId: string) {
  return getDb()
    .prepare("SELECT * FROM browser_sessions WHERE browser_id = ?")
    .bind(browserId)
    .first<BrowserSession>();
}

export async function setActiveBrowserOrder(browserId: string, orderId: string | null) {
  const now = new Date().toISOString();
  try {
    await getDb()
      .prepare(
        `INSERT INTO browser_sessions (browser_id, active_order_id, updated_at)
         VALUES (?, ?, ?)
         ON CONFLICT(browser_id) DO UPDATE SET
           active_order_id = excluded.active_order_id,
           updated_at = excluded.updated_at`,
      )
      .bind(browserId, orderId, now)
      .run();
  } catch (error) {
    logPreviewTrackingFailure("Browser session update failed", error);
  }
}

export async function clearActiveBrowserOrder(browserId: string, orderId?: string | null) {
  try {
    if (orderId) {
      await getDb()
        .prepare(
          `UPDATE browser_sessions
           SET active_order_id = NULL, updated_at = ?
           WHERE browser_id = ? AND active_order_id = ?`,
        )
        .bind(new Date().toISOString(), browserId, orderId)
        .run();
      return;
    }

    await setActiveBrowserOrder(browserId, null);
  } catch (error) {
    logPreviewTrackingFailure("Browser session clear failed", error);
  }
}

export async function abandonExistingBrowserDraft(browserId: string) {
  try {
    const session = await getBrowserSession(browserId);
    if (!session?.active_order_id) {
      return null;
    }

    const order = await getOrder(session.active_order_id);
    if (!order || !ACTIVE_DRAFT_STATUSES.has(order.status)) {
      await clearActiveBrowserOrder(browserId, session.active_order_id);
      return null;
    }

    await updateTrackedOrderStatus(getDb(), order.id, "abandoned", {
      abandoned_at: new Date().toISOString(),
    });
    await clearActiveBrowserOrder(browserId, order.id);
    return order.id;
  } catch (error) {
    logPreviewTrackingFailure("Browser draft cleanup failed", error);
    return null;
  }
}

function logPreviewTrackingFailure(failureReason: string, error: unknown) {
  console.error("[preview-tracking]", {
    failureReason,
    errorName: error instanceof Error ? error.name : "Error",
    errorMessage: error instanceof Error ? error.message : "Unknown preview tracking error",
  });
}

function isMissingColumnError(error: unknown, columnName: string) {
  const message = error instanceof Error ? error.message : "";
  return message.includes(`no column named ${columnName}`);
}
