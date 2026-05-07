"use client";

import type { WallpaperInput, WallpaperMeta } from "@/lib/types";
import {
  clearDreamState,
  ensureFreshDreamState,
  saveDreamState,
} from "@/lib/clientState";
import { createPreviewInputHash } from "@/lib/previewHash";
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
  previewInputHash?: string | null;
  previewCreatedAt?: number | null;
  previewStale?: boolean;
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
  ensureFreshDreamState();
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
  saveDreamState({
    draftId: next.id,
    draftCreatedAt: Date.parse(next.createdAt),
    draftUpdatedAt: Date.parse(next.updatedAt),
    orderId: next.orderId || null,
    orderToken: next.orderToken || null,
    orderSnapshotToken: next.orderSnapshotToken || null,
    previewImageUrl: next.previewImageUrl || null,
    previewImageId: next.previewImageId || null,
    previewInputHash: next.previewInputHash || null,
    previewStale: next.previewStale || false,
    wallpaperType: next.input.device,
    status:
      next.previewStatus === "ready"
        ? "preview_created"
        : next.previewStatus === "not_started" || next.previewStatus === "generating"
          ? "draft"
          : "error",
  });
  return next;
}

export function updateDraftInput(input: WallpaperInput) {
  const draft = getCurrentDraft();
  const currentInputHash = createPreviewInputHash(input);
  const hasPreview = Boolean(draft.previewImageUrl);

  return saveCurrentDraft({
    ...draft,
    input,
    previewStale:
      hasPreview && Boolean(draft.previewInputHash) && draft.previewInputHash !== currentInputHash,
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
    previewInputHash?: string;
    previewCreatedAt?: number;
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
    previewInputHash:
      order?.previewInputHash || createPreviewInputHash(draft.input),
    previewCreatedAt: order?.previewCreatedAt || Date.now(),
    previewStale: false,
  });
  savePreviewPolicy({
    freePreviewUsed: true,
    freePreviewDraftId: ready.id,
  });
  saveDreamState({
    orderId: ready.orderId || null,
    orderToken: ready.orderToken || null,
    orderSnapshotToken: ready.orderSnapshotToken || null,
    previewImageUrl: ready.previewImageUrl || null,
    previewImageId: ready.previewImageId || null,
    previewInputHash: ready.previewInputHash || null,
    previewCreatedAt: ready.previewCreatedAt || Date.now(),
    previewStale: false,
    wallpaperType: ready.input.device,
    status: "preview_created",
  });
  return ready;
}

export function markDraftFailed() {
  const draft = getCurrentDraft();
  return saveCurrentDraft({
    ...draft,
    previewStatus: "failed",
    previewStale: Boolean(draft.previewImageUrl),
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
    previewInputHash: null,
    previewCreatedAt: null,
    previewStale: false,
    createdAt: now,
    updatedAt: now,
  };

  sessionStorage.setItem(draftKey, JSON.stringify(draft));
  sessionStorage.setItem("dreamWallpaperInput", JSON.stringify(draft.input));
  saveDreamState({
    draftId: draft.id,
    draftCreatedAt: Date.parse(draft.createdAt),
    draftUpdatedAt: Date.parse(draft.updatedAt),
    wallpaperType: draft.input.device,
    status: "draft",
  });
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
    previewInputHash: sessionStorage.getItem("dreamPreviewInputHash"),
    previewCreatedAt: timestampValue(sessionStorage.getItem("dreamPreviewCreatedAt")),
    previewStale: sessionStorage.getItem("dreamPreviewStale") === "true",
    createdAt: now,
    updatedAt: now,
  };
}

function syncLegacyStorage(draft: WallpaperDraft) {
  sessionStorage.setItem("dreamDraftCreatedAt", String(Date.parse(draft.createdAt)));
  sessionStorage.setItem("dreamDraftUpdatedAt", String(Date.parse(draft.updatedAt)));
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
  } else {
    sessionStorage.removeItem("previewImageUrl");
  }

  if (draft.previewCreatedAt) {
    sessionStorage.setItem("dreamPreviewCreatedAt", String(draft.previewCreatedAt));
  } else {
    sessionStorage.removeItem("dreamPreviewCreatedAt");
  }

  if (draft.previewInputHash) {
    sessionStorage.setItem("dreamPreviewInputHash", draft.previewInputHash);
  } else {
    sessionStorage.removeItem("dreamPreviewInputHash");
  }

  if (draft.previewStale) {
    sessionStorage.setItem("dreamPreviewStale", "true");
  } else {
    sessionStorage.removeItem("dreamPreviewStale");
  }

  if (draft.previewMeta) {
    sessionStorage.setItem("dreamPreviewMeta", JSON.stringify(draft.previewMeta));
  } else {
    sessionStorage.removeItem("dreamPreviewMeta");
  }
}

function repairDraft(draft: WallpaperDraft): WallpaperDraft {
  const previewInputHash =
    draft.previewInputHash ||
    (draft.previewImageUrl ? createPreviewInputHash(draft.input) : null);

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
      previewInputHash: null,
      previewCreatedAt: null,
      previewStale: false,
    };
  }

  return {
    ...draft,
    previewInputHash,
    previewCreatedAt:
      draft.previewCreatedAt ||
      timestampValue(sessionStorage.getItem("dreamPreviewCreatedAt")),
    previewStale: Boolean(draft.previewStale),
  };
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
  sessionStorage.removeItem("dreamPreviewCreatedAt");
  sessionStorage.removeItem("dreamPreviewInputHash");
  sessionStorage.removeItem("dreamPreviewStale");
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

function timestampValue(value: string | null) {
  if (!value) {
    return null;
  }

  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : null;
}
