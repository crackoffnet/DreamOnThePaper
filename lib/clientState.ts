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
  "dreamCustomerEmail",
  "dreamFinalSessionId",
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
  const currentVersion = sessionStorage.getItem(appStateVersionKey);

  if (currentVersion === APP_STATE_VERSION) {
    return false;
  }

  clearDreamState({ preserveAppVersion: false });
  sessionStorage.setItem(appStateVersionKey, APP_STATE_VERSION);
  return true;
}

export function clearDreamState(options: ClearOptions = {}) {
  clearStorage(sessionStorage, options);
  clearStorage(localStorage, options);

  if (options.preserveAppVersion !== false) {
    sessionStorage.setItem(appStateVersionKey, APP_STATE_VERSION);
  }
}

export function saveCurrentOrderState(state: CurrentOrderState) {
  setOrRemove("dreamOrderId", state.orderId);
  setOrRemove("dreamCheckoutOrderToken", state.orderToken);
  setOrRemove("previewImageUrl", state.previewImageUrl);
  setOrRemove("dreamPreviewImageId", state.previewImageId);
  setOrRemove("dreamFinalGenerationToken", state.finalGenerationToken);
  setOrRemove("finalImageUrl", state.finalImageUrl);
}

export function getCurrentOrderState(): CurrentOrderState {
  return {
    orderId: sessionStorage.getItem("dreamOrderId"),
    orderToken: sessionStorage.getItem("dreamCheckoutOrderToken"),
    previewImageUrl: sessionStorage.getItem("previewImageUrl"),
    previewImageId: sessionStorage.getItem("dreamPreviewImageId"),
    finalGenerationToken: sessionStorage.getItem("dreamFinalGenerationToken"),
    finalImageUrl: sessionStorage.getItem("finalImageUrl"),
  };
}

function clearStorage(storage: Storage, options: ClearOptions) {
  const keys = new Set(explicitStateKeys);
  const matchers = ["dream", "wallpaper", "preview", "order", "checkout", "final"];

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

function setOrRemove(key: string, value: string | null | undefined) {
  if (value) {
    sessionStorage.setItem(key, value);
    return;
  }

  sessionStorage.removeItem(key);
}
