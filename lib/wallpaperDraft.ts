"use client";

import type { WallpaperInput, WallpaperMeta } from "@/lib/types";
import { defaultWallpaperInput } from "@/lib/wallpaper";

export type WallpaperDraft = {
  id: string;
  orderId?: string | null;
  input: WallpaperInput;
  previewStatus: "not_started" | "generating" | "ready" | "failed";
  previewImageId?: string | null;
  previewImageUrl?: string | null;
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
  if (policy.freePreviewDraftId) {
    sessionStorage.setItem("dreamPreviewGenerationId", policy.freePreviewDraftId);
  }
}

export function getCurrentDraft() {
  const stored = readJson<WallpaperDraft>(draftKey);
  if (stored) {
    syncLegacyStorage(stored);
    return stored;
  }

  const hydrated = hydrateLegacyDraft();
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
  const now = new Date().toISOString();
  const draft: WallpaperDraft = {
    id: crypto.randomUUID(),
    orderId: null,
    input: { ...defaultWallpaperInput },
    previewStatus: "not_started",
    previewImageId: null,
    previewImageUrl: null,
    orderSnapshotToken: null,
    previewMeta: null,
    createdAt: now,
    updatedAt: now,
  };

  sessionStorage.setItem(draftKey, JSON.stringify(draft));
  sessionStorage.setItem("dreamWallpaperInput", JSON.stringify(draft.input));
  sessionStorage.removeItem("dreamPreviewMeta");
  sessionStorage.removeItem("previewImageUrl");
  sessionStorage.removeItem("finalImageUrl");
  sessionStorage.removeItem("dreamWallpaperMeta");
  sessionStorage.removeItem("dreamOrderToken");
  sessionStorage.removeItem("dreamOrderSnapshotToken");
  sessionStorage.removeItem("dreamOrderId");
  sessionStorage.removeItem("dreamPreviewImageId");
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

function readJson<T>(key: string) {
  try {
    const value = sessionStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : null;
  } catch {
    return null;
  }
}
