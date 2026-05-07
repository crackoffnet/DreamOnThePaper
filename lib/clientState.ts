"use client";

import { APP_STATE_VERSION } from "@/lib/appStateVersion";

export const DRAFT_TTL_MS = 2 * 60 * 60 * 1000;
export const UNPAID_ORDER_TTL_MS = 24 * 60 * 60 * 1000;

const appStateVersionKey = "dreamAppStateVersion";
const dreamStateKey = "dreamState";
const dreamMessageKey = "dreamStateMessage";

const explicitStateKeys = [
  appStateVersionKey,
  dreamStateKey,
  dreamMessageKey,
  "dreamPreviewCreated",
  "dreamPreviewCreatedAt",
  "dreamDraftCreatedAt",
  "dreamDraftUpdatedAt",
  "dreamOrderId",
  "dreamOrderToken",
  "dreamPreviewImageUrl",
  "dreamPreviewImageId",
  "dreamWallpaperAnswers",
  "dreamWallpaperDraft",
  "dreamCheckoutPackage",
  "dreamFinalGenerationToken",
  "dreamFinalImageUrl",
  "dreamSelectedDevice",
  "dreamSelectedRatio",
  "dreamSelectedTheme",
  "dreamSelectedStyle",
  "dreamQuoteTone",
  "dreamCurrentDraft",
  "dreamCurrentDraftId",
  "dreamPreviewPolicy",
  "dreamPreviewGenerated",
  "dreamPreviewGenerationId",
  "dreamCheckoutOrderToken",
  "dreamOrderSnapshotToken",
  "dreamWallpaperInput",
  "dreamPreviewMeta",
  "dreamWallpaperMeta",
  "dreamWallpaperDimensions",
  "dreamPackageId",
  "dreamWallpaperType",
  "dreamCheckoutWallpaperType",
  "dreamCustomerEmail",
  "dreamFinalSessionId",
  "dreamFinalAssets",
  "dreamCheckoutStartedAt",
  "previewImageUrl",
  "finalImageUrl",
];

export type DreamState = {
  draftId?: string | null;
  draftCreatedAt?: number | null;
  draftUpdatedAt?: number | null;
  previewCreatedAt?: number | null;
  orderId?: string | null;
  orderToken?: string | null;
  orderSnapshotToken?: string | null;
  checkoutStartedAt?: number | null;
  wallpaperType?: string | null;
  previewImageUrl?: string | null;
  previewImageId?: string | null;
  finalGenerationToken?: string | null;
  finalImageUrl?: string | null;
  finalSessionId?: string | null;
  customerEmail?: string | null;
  status?: "draft" | "preview_created" | "pending_payment" | "paid" | "final_generated" | "error" | null;
  updatedAt?: number | null;
};

type ClearOptions = {
  preserveAppVersion?: boolean;
};

export type CurrentOrderState = {
  orderId?: string | null;
  orderToken?: string | null;
  previewImageUrl?: string | null;
  previewImageId?: string | null;
  finalGenerationToken?: string | null;
  finalImageUrl?: string | null;
};

export function ensureAppStateVersion() {
  if (!canUseBrowserStorage()) {
    return false;
  }

  const currentVersion = sessionStorage.getItem(appStateVersionKey);
  if (currentVersion === APP_STATE_VERSION) {
    return false;
  }

  clearDreamState({ preserveAppVersion: false });
  sessionStorage.setItem(appStateVersionKey, APP_STATE_VERSION);
  localStorage.setItem(appStateVersionKey, APP_STATE_VERSION);
  return true;
}

export function getDreamState(): DreamState | null {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const stored = readDreamStateValue(localStorage.getItem(dreamStateKey))
    || readDreamStateValue(sessionStorage.getItem(dreamStateKey));
  if (stored) {
    return stored;
  }

  const legacy = hydrateLegacyDreamState();
  return hasMeaningfulDreamState(legacy) ? legacy : null;
}

export function saveDreamState(partial: Partial<DreamState>) {
  if (!canUseBrowserStorage()) {
    return null;
  }

  const current = getDreamState() || {};
  const next: DreamState = {
    ...current,
    ...partial,
    updatedAt: Date.now(),
  };

  persistDreamState(next);
  return next;
}

export function clearDreamState(options: ClearOptions = {}) {
  if (!canUseBrowserStorage()) {
    return;
  }

  clearStorage(sessionStorage, options);
  clearStorage(localStorage, options);

  if (options.preserveAppVersion !== false) {
    sessionStorage.setItem(appStateVersionKey, APP_STATE_VERSION);
    localStorage.setItem(appStateVersionKey, APP_STATE_VERSION);
  }
}

export function isDraftExpired(state: DreamState | null) {
  if (!state) {
    return false;
  }

  if (state.status === "paid" || state.status === "final_generated") {
    return false;
  }

  const timestamp =
    state.draftUpdatedAt ||
    state.draftCreatedAt ||
    state.updatedAt ||
    0;

  return Boolean(timestamp && Date.now() - timestamp > DRAFT_TTL_MS);
}

export function isUnpaidOrderExpired(state: DreamState | null) {
  if (!state) {
    return false;
  }

  if (
    state.status === "paid" ||
    state.status === "final_generated"
  ) {
    return false;
  }

  const timestamp =
    state.checkoutStartedAt ||
    state.previewCreatedAt ||
    state.updatedAt ||
    0;

  return Boolean(state.orderToken && timestamp && Date.now() - timestamp > UNPAID_ORDER_TTL_MS);
}

export function ensureFreshDreamState() {
  if (!canUseBrowserStorage()) {
    return null;
  }

  ensureAppStateVersion();
  const state = getDreamState();
  if (!state) {
    return null;
  }

  if (isUnpaidOrderExpired(state) || isDraftExpired(state)) {
    void abandonCurrentOrder({
      orderId: state.orderId,
      orderToken: state.orderToken,
    });
    clearDreamState();
    return null;
  }

  persistDreamState(state);
  return state;
}

export function startOver(options: { redirectTo?: string } = {}) {
  if (!canUseBrowserStorage()) {
    return;
  }

  const currentState = getCurrentOrderState();
  const redirectTo = options.redirectTo || "/create";

  void abandonCurrentOrder(currentState);
  clearDreamState();
  window.history.replaceState(null, "", redirectTo);
  window.location.assign(redirectTo);
}

export function saveCurrentOrderState(state: CurrentOrderState) {
  if (!canUseBrowserStorage()) {
    return;
  }

  const now = Date.now();
  saveDreamState({
    orderId: state.orderId ?? null,
    orderToken: state.orderToken ?? null,
    previewImageUrl: state.previewImageUrl ?? null,
    previewImageId: state.previewImageId ?? null,
    finalGenerationToken: state.finalGenerationToken ?? null,
    finalImageUrl: state.finalImageUrl ?? null,
    previewCreatedAt:
      state.previewImageUrl ? now : getDreamState()?.previewCreatedAt || null,
    checkoutStartedAt:
      state.orderToken ? now : getDreamState()?.checkoutStartedAt || null,
    status:
      state.finalGenerationToken || state.finalImageUrl
        ? "paid"
        : state.orderToken
          ? "preview_created"
          : getDreamState()?.status || "draft",
  });
}

export function getCurrentOrderState(): CurrentOrderState {
  const state = getDreamState();
  return {
    orderId: state?.orderId || null,
    orderToken: state?.orderToken || null,
    previewImageUrl: state?.previewImageUrl || null,
    previewImageId: state?.previewImageId || null,
    finalGenerationToken: state?.finalGenerationToken || null,
    finalImageUrl: state?.finalImageUrl || null,
  };
}

export function setDreamStateMessage(message: string) {
  if (!canUseBrowserStorage()) {
    return;
  }

  sessionStorage.setItem(dreamMessageKey, message);
}

export function consumeDreamStateMessage() {
  if (!canUseBrowserStorage()) {
    return "";
  }

  const message = sessionStorage.getItem(dreamMessageKey) || "";
  sessionStorage.removeItem(dreamMessageKey);
  return message;
}

function persistDreamState(state: DreamState) {
  const serialized = JSON.stringify(state);
  sessionStorage.setItem(dreamStateKey, serialized);
  localStorage.setItem(dreamStateKey, serialized);
  mirrorDreamStateKeys(state);
}

function mirrorDreamStateKeys(state: DreamState) {
  setOrRemove("dreamDraftCreatedAt", state.draftCreatedAt);
  setOrRemove("dreamDraftUpdatedAt", state.draftUpdatedAt);
  setOrRemove("dreamPreviewCreatedAt", state.previewCreatedAt);
  setOrRemove("dreamCheckoutStartedAt", state.checkoutStartedAt);
  setOrRemove("dreamOrderId", state.orderId);
  setOrRemove("dreamCheckoutOrderToken", state.orderToken);
  setOrRemove("dreamOrderToken", state.orderToken);
  setOrRemove("previewImageUrl", state.previewImageUrl);
  setOrRemove("dreamPreviewImageUrl", state.previewImageUrl);
  setOrRemove("dreamPreviewImageId", state.previewImageId);
  setOrRemove("dreamFinalGenerationToken", state.finalGenerationToken);
  setOrRemove("finalImageUrl", state.finalImageUrl);
  setOrRemove("dreamFinalImageUrl", state.finalImageUrl);
  setOrRemove("dreamWallpaperType", state.wallpaperType);
  setOrRemove("dreamCustomerEmail", state.customerEmail);
  setOrRemove("dreamFinalSessionId", state.finalSessionId);
  setOrRemove("dreamOrderSnapshotToken", state.orderSnapshotToken);
}

function clearStorage(storage: Storage, options: ClearOptions) {
  const keys = new Set(explicitStateKeys);
  const matchers = [
    "dream",
    "wallpaper",
    "preview",
    "order",
    "checkout",
    "final",
    "package",
    "answers",
    "session",
  ];

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key) {
      continue;
    }

    const normalized = key.toLowerCase();
    if (matchers.some((matcher) => normalized.includes(matcher))) {
      keys.add(key);
    }
  }

  keys.forEach((key) => {
    if (options.preserveAppVersion !== false && key === appStateVersionKey) {
      return;
    }

    storage.removeItem(key);
  });
}

function abandonCurrentOrder(state: CurrentOrderState) {
  if (!state.orderId && !state.orderToken) {
    return;
  }

  fetch("/api/order-abandon", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: state.orderId || undefined,
      orderToken: state.orderToken || undefined,
    }),
    keepalive: true,
  }).catch(() => {});
}

function readDreamStateValue(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as DreamState;
  } catch {
    return null;
  }
}

function readJson<T>(value: string | null) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}

function hydrateLegacyDreamState(): DreamState {
  const draft = readJson<Record<string, unknown>>(sessionStorage.getItem("dreamCurrentDraft"));
  const previewGenerated = sessionStorage.getItem("dreamPreviewGenerated") === "true";
  const finalImageUrl = sessionStorage.getItem("finalImageUrl");
  const finalGenerationToken = sessionStorage.getItem("dreamFinalGenerationToken");

  return {
    draftId:
      stringOrNull(draft?.id) || sessionStorage.getItem("dreamCurrentDraftId"),
    draftCreatedAt: timestampValue(
      sessionStorage.getItem("dreamDraftCreatedAt"),
      stringOrNull(draft?.createdAt),
    ),
    draftUpdatedAt: timestampValue(
      sessionStorage.getItem("dreamDraftUpdatedAt"),
      stringOrNull(draft?.updatedAt),
    ),
    previewCreatedAt: timestampValue(
      sessionStorage.getItem("dreamPreviewCreatedAt"),
    ),
    orderId: sessionStorage.getItem("dreamOrderId"),
    orderToken:
      sessionStorage.getItem("dreamCheckoutOrderToken") ||
      sessionStorage.getItem("dreamOrderToken"),
    orderSnapshotToken: sessionStorage.getItem("dreamOrderSnapshotToken"),
    checkoutStartedAt: timestampValue(
      sessionStorage.getItem("dreamCheckoutStartedAt"),
    ),
    wallpaperType: sessionStorage.getItem("dreamWallpaperType"),
    previewImageUrl: sessionStorage.getItem("previewImageUrl"),
    previewImageId: sessionStorage.getItem("dreamPreviewImageId"),
    finalGenerationToken,
    finalImageUrl,
    finalSessionId: sessionStorage.getItem("dreamFinalSessionId"),
    customerEmail: sessionStorage.getItem("dreamCustomerEmail"),
    status: finalImageUrl
      ? "final_generated"
      : finalGenerationToken
        ? "paid"
        : previewGenerated
          ? "preview_created"
          : draft
            ? "draft"
            : null,
    updatedAt: timestampValue(sessionStorage.getItem("dreamDraftUpdatedAt")),
  };
}

function hasMeaningfulDreamState(state: DreamState) {
  return Boolean(
    state.draftId ||
      state.orderId ||
      state.orderToken ||
      state.previewImageUrl ||
      state.finalGenerationToken ||
      state.finalImageUrl,
  );
}

function canUseBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function setOrRemove(key: string, value: string | number | null | undefined) {
  const normalized = typeof value === "number" ? String(value) : value;
  if (normalized) {
    sessionStorage.setItem(key, normalized);
    localStorage.setItem(key, normalized);
    return;
  }

  sessionStorage.removeItem(key);
  localStorage.removeItem(key);
}

function timestampValue(...values: Array<string | null | undefined>) {
  for (const value of values) {
    if (!value) {
      continue;
    }

    const numeric = Number(value);
    if (Number.isFinite(numeric) && numeric > 0) {
      return numeric;
    }

    const parsed = Date.parse(value);
    if (Number.isFinite(parsed) && parsed > 0) {
      return parsed;
    }
  }

  return null;
}

function stringOrNull(value: unknown) {
  return typeof value === "string" ? value : null;
}
