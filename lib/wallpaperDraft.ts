"use client";

import type { WallpaperInput, WallpaperMeta } from "@/lib/types";
import { clearDreamState } from "@/lib/clientState";
import { defaultWallpaperInput } from "@/lib/wallpaper";

export type WallpaperDraft = {
  id: string;
  orderId?: string | null;
  input: WallpaperInput;
  previewStatus: "not_started" | "generating" | "ready" | "failed";
  previewImageId?: string | null;
  previewImageUrl?: string | null;
  orderToken?: string | null;
  orderSnapshotToken?: string | null;
  previewMeta?: WallpaperMeta | null;
  createdAt: string;
  updatedAt: string;
};

export type PreviewPolicy = {
  freePreviewUsed: boolean;
  freePreviewDraftId?: string | null;
};

const draftKey = "dreamCurrentDraft";
const policyKey = "dreamPreviewPolicy";

export function getPreviewPolicy(): PreviewPolicy {
  repairStalePreviewPolicy();
  const stored = readJson<PreviewPolicy>(policyKey);
  if (stored) {
    return stored;
  }

  return {
    freePreviewUsed: sessionStorage.getItem("dreamPreviewGenerated") === "true",
    freePreviewDraftId: sessionStorage.getItem("dreamPreviewGenerationId") || null,
  };
}

export function savePreviewPolicy(policy: PreviewPolicy) {
  sessionStorage.setItem(policyKey, JSON.stringify(policy));
  sessionStorage.setItem("dreamPreviewGenerated", String(policy.freePreviewUsed));
  sessionStorage.setItem("dreamPreviewCreated", String(policy.freePreviewUsed));
  if (policy.freePreviewDraftId) {
    sessionStorage.setItem("dreamPreviewGenerationId", policy.freePreviewDraftId);
  }
}

export function getCurrentDraft() {
  const stored = readJson<WallpaperDraft>(draftKey);
  if (stored) {
    const repaired = repairDraft(stored);
    syncLegacyStorage(repaired);
    return repaired;
  }

  const hydrated = repairDraft(hydrateLegacyDraft());
  saveCurrentDraft(hydrated);
  return hydrated;
}

export function saveCurrentDraft(draft: WallpaperDraft) {
  const next = {
    ...draft,
    updatedAt: new Date().toISOString(),
  };
  sessionStorage.setItem(draftKey, JSON.stringify(next));
  syncLegacyStorage(next);
  return next;
}

export function updateDraftInput(input: WallpaperInput) {
  return saveCurrentDraft({
    ...getCurrentDraft(),
    input,
  });
}

export function markDraftGenerating() {
  return saveCurrentDraft({
    ...getCurrentDraft(),
    previewStatus: "generating",
  });
}

export function markDraftReady(
  imageUrl: string,
  meta: WallpaperMeta,
  order?: {
    orderId?: string;
    previewImageId?: string | null;
    orderToken?: string;
    orderSnapshotToken?: string;
  },
) {
  const draft = getCurrentDraft();
  const ready = saveCurrentDraft({
    ...draft,
    orderId: order?.orderId || draft.orderId || draft.id,
    previewStatus: "ready",
    previewImageId: order?.previewImageId || draft.previewImageId || null,
    previewImageUrl: imageUrl,
    orderToken: order?.orderToken || draft.orderToken || null,
    orderSnapshotToken: order?.orderSnapshotToken || draft.orderSnapshotToken || null,
    previewMeta: meta,
  });
  savePreviewPolicy({
    freePreviewUsed: true,
    freePreviewDraftId: ready.id,
  });
  return ready;
}

export function markDraftFailed() {
  return saveCurrentDraft({
    ...getCurrentDraft(),
    previewStatus: "failed",
  });
}

export function createNewWallpaperDraft() {
  clearDreamWallpaperState();
  const now = new Date().toISOString();
  const draft: WallpaperDraft = {
    id: crypto.randomUUID(),
    orderId: null,
    input: { ...defaultWallpaperInput },
    previewStatus: "not_started",
    previewImageId: null,
    previewImageUrl: null,
    orderToken: null,
    orderSnapshotToken: null,
    previewMeta: null,
    createdAt: now,
    updatedAt: now,
  };

  sessionStorage.setItem(draftKey, JSON.stringify(draft));
  sessionStorage.setItem("dreamWallpaperInput", JSON.stringify(draft.input));
  return draft;
}

export function getDraftPreviewSessionId(draftId: string) {
  return `preview:${draftId}`;
}

function hydrateLegacyDraft(): WallpaperDraft {
  const now = new Date().toISOString();
  const input =
    readJson<WallpaperInput>("dreamWallpaperInput") || { ...defaultWallpaperInput };
  const previewImageUrl = sessionStorage.getItem("previewImageUrl");
  const previewMeta = readJson<WallpaperMeta>("dreamPreviewMeta");
  const hasPreview = Boolean(previewImageUrl && previewMeta);

  return {
    id: sessionStorage.getItem("dreamCurrentDraftId") || crypto.randomUUID(),
    orderId: sessionStorage.getItem("dreamOrderId") || null,
    input,
    previewStatus: hasPreview ? "ready" : "not_started",
    previewImageId: sessionStorage.getItem("dreamPreviewImageId") || null,
    previewImageUrl,
    orderToken: sessionStorage.getItem("dreamCheckoutOrderToken") || null,
    orderSnapshotToken: sessionStorage.getItem("dreamOrderSnapshotToken") || null,
    previewMeta,
    createdAt: now,
    updatedAt: now,
  };
}

function syncLegacyStorage(draft: WallpaperDraft) {
  sessionStorage.setItem("dreamCurrentDraftId", draft.id);
  sessionStorage.setItem("dreamWallpaperInput", JSON.stringify(draft.input));

  if (draft.orderId) {
    sessionStorage.setItem("dreamOrderId", draft.orderId);
  }

  if (draft.previewImageId) {
    sessionStorage.setItem("dreamPreviewImageId", draft.previewImageId);
  }

  if (draft.orderToken) {
    sessionStorage.setItem("dreamCheckoutOrderToken", draft.orderToken);
  }

  if (draft.orderSnapshotToken) {
    sessionStorage.setItem("dreamOrderSnapshotToken", draft.orderSnapshotToken);
  }

  if (draft.previewImageUrl) {
    sessionStorage.setItem("previewImageUrl", draft.previewImageUrl);
  }

  if (draft.previewMeta) {
    sessionStorage.setItem("dreamPreviewMeta", JSON.stringify(draft.previewMeta));
  }
}

function repairDraft(draft: WallpaperDraft): WallpaperDraft {
  if (
    draft.previewStatus === "ready" &&
    (!draft.orderId || !draft.previewImageUrl || !draft.orderToken)
  ) {
    clearBrokenCheckoutState();
    return {
      ...draft,
      orderId: null,
      previewStatus: "not_started",
      previewImageId: null,
      previewImageUrl: null,
      orderToken: null,
      orderSnapshotToken: null,
      previewMeta: null,
    };
  }

  return draft;
}

function repairStalePreviewPolicy() {
  const previewGenerated = sessionStorage.getItem("dreamPreviewGenerated") === "true";
  const hasOrderToken = Boolean(sessionStorage.getItem("dreamCheckoutOrderToken"));

  if (previewGenerated && !hasOrderToken) {
    clearBrokenCheckoutState();
    sessionStorage.setItem(
      policyKey,
      JSON.stringify({ freePreviewUsed: false, freePreviewDraftId: null }),
    );
    sessionStorage.setItem("dreamPreviewGenerated", "false");
  }
}

export function clearBrokenCheckoutState() {
  sessionStorage.removeItem("dreamOrderToken");
  sessionStorage.removeItem("dreamCheckoutOrderToken");
  sessionStorage.removeItem("dreamOrderSnapshotToken");
  sessionStorage.removeItem("dreamOrderId");
  sessionStorage.removeItem("dreamPreviewImageId");
  sessionStorage.removeItem("dreamPreviewCreated");
  sessionStorage.removeItem("dreamPreviewMeta");
  sessionStorage.removeItem("previewImageUrl");
}

export function clearDreamWallpaperState() {
  clearDreamState();
}

function readJson<T>(key: string) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}
