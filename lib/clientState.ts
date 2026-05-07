"use client";

import { APP_STATE_VERSION } from "@/lib/appStateVersion";

const appStateVersionKey = "dreamAppStateVersion";

const explicitStateKeys = [
  "dreamPreviewCreated",
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
  "previewImageUrl",
  "finalImageUrl",
];

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
  return true;
}

export function clearDreamState(options: ClearOptions = {}) {
  if (!canUseBrowserStorage()) {
    return;
  }

  clearStorage(sessionStorage, options);
  clearStorage(localStorage, options);

  if (options.preserveAppVersion !== false) {
    sessionStorage.setItem(appStateVersionKey, APP_STATE_VERSION);
  }
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

  setOrRemove("dreamOrderId", state.orderId);
  setOrRemove("dreamCheckoutOrderToken", state.orderToken);
  setOrRemove("previewImageUrl", state.previewImageUrl);
  setOrRemove("dreamPreviewImageId", state.previewImageId);
  setOrRemove("dreamFinalGenerationToken", state.finalGenerationToken);
  setOrRemove("finalImageUrl", state.finalImageUrl);
}

export function getCurrentOrderState(): CurrentOrderState {
  if (!canUseBrowserStorage()) {
    return {};
  }

  return {
    orderId:
      sessionStorage.getItem("dreamOrderId") ||
      localStorage.getItem("dreamOrderId"),
    orderToken:
      sessionStorage.getItem("dreamCheckoutOrderToken") ||
      sessionStorage.getItem("dreamOrderToken") ||
      localStorage.getItem("dreamCheckoutOrderToken") ||
      localStorage.getItem("dreamOrderToken"),
    previewImageUrl: sessionStorage.getItem("previewImageUrl"),
    previewImageId: sessionStorage.getItem("dreamPreviewImageId"),
    finalGenerationToken: sessionStorage.getItem("dreamFinalGenerationToken"),
    finalImageUrl: sessionStorage.getItem("finalImageUrl"),
  };
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

function canUseBrowserStorage() {
  return typeof window !== "undefined" && Boolean(window.sessionStorage);
}

function setOrRemove(key: string, value: string | null | undefined) {
  if (value) {
    sessionStorage.setItem(key, value);
    return;
  }

  sessionStorage.removeItem(key);
}
