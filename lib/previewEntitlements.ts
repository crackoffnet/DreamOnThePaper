import { getDb } from "@/lib/cloudflare";
import { getOrder } from "@/lib/orders";
import { updateOrderStatus as updateTrackedOrderStatus } from "@/lib/orderEvents";

const PREVIEW_WINDOW_MS = 24 * 60 * 60 * 1000;
const ACTIVE_DRAFT_STATUSES = new Set(["draft", "preview_created", "pending_payment"]);

export type PreviewEntitlement = {
  id: string;
  browser_id: string;
  ip_hash: string | null;
  ua_hash: string | null;
  preview_count: number;
  last_preview_at: string | null;
  window_starts_at: string;
  blocked_until: string | null;
  created_at: string;
  updated_at: string;
};

export type BrowserSession = {
  browser_id: string;
  active_order_id: string | null;
  updated_at: string;
};

export type PreviewAvailability = {
  hasPreviewAvailable: boolean;
  nextPreviewAt: string | null;
  activeOrderId: string | null;
};

export async function getPreviewAvailability(
  browserId: string,
): Promise<PreviewAvailability> {
  const [entitlement, session] = await Promise.all([
    getPreviewEntitlement(browserId),
    getBrowserSession(browserId),
  ]);
  const activeOrderId = session?.active_order_id || null;

  if (!entitlement) {
    return {
      hasPreviewAvailable: true,
      nextPreviewAt: null,
      activeOrderId,
    };
  }

  const now = Date.now();
  const blockedUntilMs = entitlement.blocked_until
    ? Date.parse(entitlement.blocked_until)
    : NaN;
  const lastPreviewMs = entitlement.last_preview_at
    ? Date.parse(entitlement.last_preview_at)
    : NaN;
  const nextPreviewMs = Number.isFinite(lastPreviewMs)
    ? lastPreviewMs + PREVIEW_WINDOW_MS
    : NaN;

  if (Number.isFinite(blockedUntilMs) && blockedUntilMs > now) {
    return {
      hasPreviewAvailable: false,
      nextPreviewAt: new Date(blockedUntilMs).toISOString(),
      activeOrderId,
    };
  }

  if (entitlement.preview_count >= 1 && Number.isFinite(nextPreviewMs) && nextPreviewMs > now) {
    return {
      hasPreviewAvailable: false,
      nextPreviewAt: new Date(nextPreviewMs).toISOString(),
      activeOrderId,
    };
  }

  return {
    hasPreviewAvailable: true,
    nextPreviewAt: null,
    activeOrderId,
  };
}

export async function consumePreviewEntitlement(input: {
  browserId: string;
  ipHash: string;
  uaHash: string;
}) {
  const db = getDb();
  const now = new Date().toISOString();
  const current = await getPreviewEntitlement(input.browserId);
  const nowMs = Date.now();
  const lastPreviewMs = current?.last_preview_at ? Date.parse(current.last_preview_at) : NaN;
  const blockedUntilMs = current?.blocked_until ? Date.parse(current.blocked_until) : NaN;
  const withinWindow =
    Number.isFinite(lastPreviewMs) && nowMs - lastPreviewMs < PREVIEW_WINDOW_MS;
  const isBlocked = Number.isFinite(blockedUntilMs) && blockedUntilMs > nowMs;

  if (current && (isBlocked || withinWindow)) {
    return {
      allowed: false,
      nextPreviewAt: new Date(
        isBlocked ? blockedUntilMs : lastPreviewMs + PREVIEW_WINDOW_MS,
      ).toISOString(),
      denialReason: isBlocked ? "browser_blocked" : "browser_preview_window",
    } as const;
  }

  if (current) {
    await db
      .prepare(
        `UPDATE preview_entitlements
         SET ip_hash = ?, ua_hash = ?, preview_count = 1, last_preview_at = ?,
             window_starts_at = ?, blocked_until = NULL, updated_at = ?
         WHERE browser_id = ?`,
      )
      .bind(input.ipHash, input.uaHash, now, now, now, input.browserId)
      .run();
  } else {
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
  }

  return {
    allowed: true,
    nextPreviewAt: new Date(nowMs + PREVIEW_WINDOW_MS).toISOString(),
    denialReason: null,
  } as const;
}

export async function recordPreviewAttempt(input: {
  browserId: string;
  orderId?: string | null;
  ipHash: string;
  uaHash: string;
  allowed: boolean;
  denialReason?: string | null;
}) {
  await getDb()
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
      input.allowed ? 1 : 0,
      input.denialReason || null,
      new Date().toISOString(),
    )
    .run();
}

export async function getPreviewEntitlement(browserId: string) {
  return getDb()
    .prepare("SELECT * FROM preview_entitlements WHERE browser_id = ?")
    .bind(browserId)
    .first<PreviewEntitlement>();
}

export async function getBrowserSession(browserId: string) {
  return getDb()
    .prepare("SELECT * FROM browser_sessions WHERE browser_id = ?")
    .bind(browserId)
    .first<BrowserSession>();
}

export async function setActiveBrowserOrder(browserId: string, orderId: string | null) {
  const now = new Date().toISOString();
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
}

export async function clearActiveBrowserOrder(browserId: string, orderId?: string | null) {
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
}

export async function abandonExistingBrowserDraft(browserId: string) {
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
}
