import { NextResponse } from "next/server";
import {
  containsAbusiveInput,
  hasMeaningfulInput,
  previewGenerationSchema,
} from "@/lib/schemas";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";
import { getImageGenerationConfig } from "@/lib/imageGenerationConfig";
import { getOpenAIImageSize } from "@/lib/openaiImageSize";
import {
  attachPreviewImage,
  createOrder,
  expireOrderIfNeeded,
  getOrder,
  replacePreviewImage,
  type DbOrder,
} from "@/lib/orders";
import {
  hashOperationalValue,
  patchOrderTracking,
  trackOrderEvent,
} from "@/lib/orderEvents";
import {
  type OrderSnapshot,
  hashOrderInput,
  signCheckoutOrderToken,
  signOrderSnapshot,
  storeOrder,
  verifyCheckoutOrderToken,
} from "@/lib/order-state";
import { createPreviewInputHash } from "@/lib/previewHash";
import { getRequestMetadata } from "@/lib/requestMetadata";
import {
  checkPreviewAttemptLimit,
  checkPreviewBrowserHourlyLimit,
  checkPreviewIpHourlyLimit,
} from "@/lib/rateLimit";
import {
  assertSameOrigin,
  getClientIp,
  safeLog,
} from "@/lib/security";
import {
  appendBrowserCookie,
  hashUserAgent,
  resolveBrowserIdentity,
} from "@/lib/browserIdentity";
import {
  abandonExistingBrowserDraft,
  consumePreviewEntitlement,
  getPreviewAvailability,
  recordPreviewAttempt,
  setActiveBrowserOrder,
  trackPreviewEntitlement,
} from "@/lib/previewEntitlements";
import {
  savePreviewImage,
} from "@/lib/storage";
import type {
  DeviceType,
  GenerateResponse,
  RatioType,
  ThemeType,
  WallpaperInput,
  WallpaperStyle,
  isRatioType,
} from "@/lib/types";
import {
  buildLegacyWallpaperFields,
  emptyVisualOnlyDreamProfile,
  profileFromStoredAnswers,
  sanitizeDreamProfile,
} from "@/lib/visualDreamProfile";
import {
  isWallpaperProductId,
  wallpaperProducts,
  wallpaperTypeFromDevice,
} from "@/lib/wallpaperProducts";
import {
  buildPreviewWallpaperPrompt,
  getWallpaperMeta,
  isValidRatioForDevice,
} from "@/lib/wallpaper";
import {
  validateCustomSize,
} from "@/lib/wallpaperPresets";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

type PreviewRouteResponse = GenerateResponse & {
  wallpaperType?: string;
};

type PreviewGenerationSuccess = {
  success: true;
  result: OpenAIImageResponse;
};

type PreviewGenerationFailure = {
  success: false;
  status: number;
  code:
    | "PREVIEW_AI_UNAVAILABLE"
    | "PREVIEW_GENERATION_FAILED"
    | "PREVIEW_INTERNAL_ERROR";
  message: string;
};

type NormalizedPreviewBody = {
  wallpaperType: "mobile" | "tablet" | "desktop" | "custom";
  input: WallpaperInput;
  previewSessionId: string;
  website: string;
  width: number;
  height: number;
  mood: string;
  orderId: string | null;
  orderToken: string | null;
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const requestMetadata = await getRequestMetadata(request);
  let orderId: string | undefined;
  const browserIdentity = resolveBrowserIdentity(request);

  try {
    if (!assertSameOrigin(request)) {
      return previewError("Request origin is not allowed.", 403, undefined, undefined, browserIdentity);
    }

    const env = getRuntimeEnv();
    const bindings = getOptionalCloudflareBindings();
    const bypassToken = request.headers.get("x-admin-bypass-token");
    const hasRateLimitBypass =
      Boolean(env.PREVIEW_RATE_LIMIT_BYPASS_TOKEN) &&
      bypassToken === env.PREVIEW_RATE_LIMIT_BYPASS_TOKEN;
    const clientIp = getClientIp(request);
    const browserId = browserIdentity.browserId;
    const uaHash = await hashUserAgent(requestMetadata.userAgent);

    const rawBody = await request.json().catch(() => null);
    const normalizedBody = normalizePreviewRequestBody(rawBody);

    if (!normalizedBody) {
      return previewError(
        "Please complete your wallpaper settings and try again.",
        400,
        "PREVIEW_INVALID_INPUT",
        undefined,
        browserIdentity,
      );
    }

    if (!hasRateLimitBypass) {
      const [browserLimit, ipLimit, attemptLimit] = await Promise.all([
        checkPreviewBrowserHourlyLimit(browserId),
        checkPreviewIpHourlyLimit(clientIp),
        checkPreviewAttemptLimit(clientIp),
      ]);
      const limitingResult =
        !browserLimit.allowed
          ? browserLimit
          : !ipLimit.allowed
            ? ipLimit
            : !attemptLimit.allowed
              ? attemptLimit
              : null;

      if (limitingResult) {
        logPreviewRateLimit({
          requestId,
          failureReason: "Preview abuse limit exceeded",
          limitType: "attempt",
          retryAfterSeconds: limitingResult.retryAfterSeconds,
          ipHash: requestMetadata.ipHash,
        });
        void recordPreviewAttempt({
          browserId,
          ipHash: requestMetadata.ipHash,
          uaHash,
          outcome: "rate_limited",
          denialReason: !browserLimit.allowed
            ? "browser_hourly_limit"
            : !ipLimit.allowed
              ? "ip_hourly_limit"
              : "attempt_limit",
        });
        void trackOrderEvent({
          eventType: "preview_failed",
          requestMetadata,
          metadata: {
            requestId,
            reason: "attempt_limit",
            code: "PREVIEW_RATE_LIMITED",
          },
        });
        return previewError(
          "Too many preview requests. Please wait a few minutes and try again.",
          429,
          "PREVIEW_RATE_LIMITED",
          limitingResult.retryAfterSeconds,
          browserIdentity,
        );
      }
    }

    const parsed = previewGenerationSchema.safeParse({
      ...normalizedBody.input,
      previewSessionId: normalizedBody.previewSessionId,
      website: normalizedBody.website,
    });

    if (!parsed.success || parsed.data.website) {
      void trackOrderEvent({
        eventType: "preview_failed",
        requestMetadata,
        metadata: { requestId, reason: "invalid_input" },
      });
      return previewError(
        "Please complete your wallpaper settings and try again.",
        400,
        "PREVIEW_INVALID_INPUT",
        undefined,
        browserIdentity,
      );
    }

    if (!hasMeaningfulInput(parsed.data)) {
      return previewError(
        "Please complete your wallpaper settings and try again.",
        400,
        "PREVIEW_INVALID_INPUT",
        undefined,
        browserIdentity,
      );
    }

    const joined = JSON.stringify(parsed.data.dreamProfile);
    if (containsAbusiveInput(joined)) {
      return previewError(
        "Please keep the wallpaper request safe and respectful.",
        400,
        "PREVIEW_INVALID_INPUT",
        undefined,
        browserIdentity,
      );
    }

    if (!bindings.DB || !bindings.WALLPAPER_BUCKET) {
      console.error("[generate-preview]", {
        requestId,
        failureReason: "Missing preview storage bindings",
        hasDb: Boolean(bindings.DB),
        hasWallpaperBucket: Boolean(bindings.WALLPAPER_BUCKET),
      });
      return previewError(
        "Preview storage is temporarily unavailable. Please try again soon.",
        503,
        "PREVIEW_STORAGE_UNAVAILABLE",
        undefined,
        browserIdentity,
      );
    }

    if (!bindings.DREAM_RATE_LIMITS) {
      console.warn("[generate-preview]", {
        requestId,
        failureReason: "Rate limit KV binding missing; continuing without KV enforcement",
      });
    }

    if (!env.OPENAI_API_KEY) {
      console.error("[generate-preview]", {
        requestId,
        failureReason: "Missing OPENAI_API_KEY",
      });
      return previewError(
        "Preview generation is temporarily unavailable. Please try again soon.",
        503,
        "PREVIEW_AI_UNAVAILABLE",
        undefined,
        browserIdentity,
      );
    }

    const previewAvailability = await getPreviewAvailability(browserId);
    if (false && !hasRateLimitBypass && !previewAvailability.hasPreviewAvailable) {
      void recordPreviewAttempt({
        browserId,
        ipHash: requestMetadata.ipHash,
        uaHash,
        outcome: "rate_limited",
        denialReason: "preview_limit_reached",
      }).catch((error) => {
        console.warn("[generate-preview]", {
          requestId,
          failureReason: "Preview attempt tracking failed",
          errorMessage: error instanceof Error ? error.message : "Unknown preview attempt error",
        });
      });
      console.warn("[generate-preview]", {
        requestId,
        browserIdPresent: !browserIdentity.created,
        previewAllowed: false,
        denialReason: "preview_limit_reached",
        nextPreviewAt: previewAvailability.nextPreviewAt,
      });
      return previewError(
        "You’ve already used your free preview for this browser.",
        429,
        "PREVIEW_LIMIT_REACHED",
        undefined,
        browserIdentity,
        {
          hasPreviewAvailable: false,
          nextPreviewAt: previewAvailability.nextPreviewAt,
          activeOrderId: previewAvailability.activeOrderId,
        },
      );
    }

    const input = parsed.data as WallpaperInput;
    const product = wallpaperProducts[normalizedBody.wallpaperType];
    const imageConfig = getImageGenerationConfig().preview;
    const meta = getWallpaperMeta(input);
    const previewInputHash = createPreviewInputHash(input, {
      wallpaperType: normalizedBody.wallpaperType,
      mood: normalizedBody.mood,
      width: meta.finalWidth,
      height: meta.finalHeight,
      presetId: meta.presetId,
    });
    const prompt = buildPreviewWallpaperPrompt(input);

    void trackOrderEvent({
      eventType: "preview_requested",
      requestMetadata,
      packageType: "single",
      metadata: {
        requestId,
        wallpaperType: normalizedBody.wallpaperType,
        device: input.device,
        ratio: input.ratio,
        theme: input.theme,
        style: input.style,
      },
    });

    const existingOrder = await resolveExistingPreviewOrder(normalizedBody);

    if (
      previewAvailability.activeOrderId &&
      previewAvailability.activeOrderId !== existingOrder?.id
    ) {
      void abandonExistingBrowserDraft(browserId).catch((error) => {
        console.warn("[generate-preview]", {
          requestId,
          failureReason: "Old browser draft cleanup failed",
          errorMessage: error instanceof Error ? error.message : "Unknown browser cleanup error",
        });
      });
    }

    const dbOrder = existingOrder || (await createOrder(input));
    orderId = dbOrder?.id;

    if (!dbOrder) {
      return previewError(
        "We couldn't create your preview right now. Please try again.",
        503,
        "PREVIEW_INTERNAL_ERROR",
        undefined,
        browserIdentity,
      );
    }

    const previewPromptHash = await hashOrderInput(input);

    await patchOrderTracking(dbOrder.id, {
      client_ip: requestMetadata.ip,
      client_ip_hash: requestMetadata.ipHash,
      country: requestMetadata.country,
      user_agent: requestMetadata.userAgent,
      referer: requestMetadata.referer,
      utm_source: requestMetadata.utmSource,
      utm_medium: requestMetadata.utmMedium,
      utm_campaign: requestMetadata.utmCampaign,
      landing_path: requestMetadata.landingPath,
      package_type: "single",
      wallpaper_type: normalizedBody.wallpaperType,
      package_name: product.label,
      amount_cents: product.amount,
      currency: "usd",
      device: input.device,
      ratio: input.ratio,
      width: meta.finalWidth,
      height: meta.finalHeight,
      preset_id: meta.presetId,
      ratio_label: meta.ratioLabel,
      custom_width: input.customWidth || null,
      custom_height: input.customHeight || null,
      theme: input.theme,
      style: input.style,
      quote_tone: input.quoteTone || "none",
      mood: normalizedBody.mood || null,
      prompt_hash: previewPromptHash,
      sanitized_answers_json: JSON.stringify(input.dreamProfile),
      answers_hash: await hashOperationalValue(
        JSON.stringify(input.dreamProfile),
      ),
    });

    const aiResult = await generatePreviewImage({
      requestId,
      apiKey: env.OPENAI_API_KEY,
      prompt,
      imageConfig,
      input,
    });

    if (!aiResult.success) {
      void recordPreviewAttempt({
        browserId,
        orderId: dbOrder.id,
        ipHash: requestMetadata.ipHash,
        uaHash,
        outcome: "failed",
        denialReason: aiResult.code,
      });
      void trackOrderEvent({
        orderId,
        eventType: "preview_failed",
        requestMetadata,
        metadata: {
          requestId,
          reason: aiResult.code,
        },
      });
      return previewError(
        aiResult.message,
        aiResult.status,
        aiResult.code === "PREVIEW_GENERATION_FAILED"
          ? "PREVIEW_AI_FAILED"
          : aiResult.code,
        undefined,
        browserIdentity,
      );
    }

    const image = aiResult.result.data?.[0];
    let savedPreview: Awaited<ReturnType<typeof savePreviewImage>> | null = null;

    try {
      savedPreview = image?.b64_json
        ? await saveProcessedPreviewImage(
            dbOrder.id,
            base64ToBytes(image.b64_json),
            input,
          )
        : image?.url
          ? await saveRemotePreviewImage(dbOrder.id, image.url, input)
          : null;
    } catch (error) {
      console.error("[generate-preview]", {
        requestId,
        failureReason: "Preview image save failed",
        errorName: error instanceof Error ? error.name : "Error",
        errorMessage: error instanceof Error ? error.message : "Unknown storage error",
        stack:
          process.env.NODE_ENV !== "production" && error instanceof Error
            ? error.stack
            : undefined,
      });
      void recordPreviewAttempt({
        browserId,
        orderId: dbOrder.id,
        ipHash: requestMetadata.ipHash,
        uaHash,
        outcome: "failed",
        denialReason: "preview_storage_failed",
      });
      return previewError(
        "Preview storage is temporarily unavailable. Please try again soon.",
        503,
        "PREVIEW_STORAGE_UNAVAILABLE",
        undefined,
        browserIdentity,
      );
    }

    if (!savedPreview) {
      return previewError(
        "Preview storage is temporarily unavailable. Please try again soon.",
        503,
        "PREVIEW_STORAGE_UNAVAILABLE",
        undefined,
        browserIdentity,
      );
    }

    const updatedOrder = existingOrder
      ? await replacePreviewImage({
          orderId: dbOrder.id,
          previewR2Key: savedPreview.key,
          previewInputHash,
        })
      : await attachPreviewImage(dbOrder.id, savedPreview.key);
    const order = orderSnapshotFromDbOrder(
      updatedOrder || dbOrder,
      input,
      savedPreview.url,
      savedPreview.key,
      previewPromptHash,
    );
    storeOrder(order);
    const orderToken = await signCheckoutOrderToken(order);
    const orderSnapshotToken = await signOrderSnapshot(order);

    void patchOrderTracking(dbOrder.id, {
      preview_r2_key: savedPreview.key,
      preview_asset_key: savedPreview.key,
      preview_input_hash: previewInputHash,
      preview_stale: 0,
      preview_created_at: new Date().toISOString(),
      order_token_hash: await hashOperationalValue(orderToken),
      preset_id: meta.presetId,
      ratio_label: meta.ratioLabel,
      final_width: meta.finalWidth,
      final_height: meta.finalHeight,
      output_format: "png",
      generation_status: "preview_created",
    });
    void trackOrderEvent({
      orderId: dbOrder.id,
      eventType: "preview_generated",
      statusAfter: "preview_created",
      packageType: "single",
      requestMetadata,
      metadata: {
        requestId,
        wallpaperType: normalizedBody.wallpaperType,
        previewStored: true,
      },
    });

    if (false && !hasRateLimitBypass) {
      const entitlementResult = await consumePreviewEntitlement({
        browserId,
        ipHash: requestMetadata.ipHash,
        uaHash,
      });
      if ("unavailable" in entitlementResult && entitlementResult.unavailable) {
        return previewError(
          entitlementResult.message,
          503,
          "PREVIEW_ENTITLEMENT_UNAVAILABLE",
          undefined,
          browserIdentity,
        );
      }
      if (!entitlementResult.allowed) {
        return previewError(
          "You’ve already used your free preview for this browser.",
          429,
          "PREVIEW_LIMIT_REACHED",
          undefined,
          browserIdentity,
          {
            hasPreviewAvailable: false,
            nextPreviewAt: entitlementResult.nextPreviewAt,
            activeOrderId: previewAvailability.activeOrderId,
          },
        );
      }
    }

    void trackPreviewEntitlement({
      browserId,
      ipHash: requestMetadata.ipHash,
      uaHash,
    });

    await setActiveBrowserOrder(browserId, dbOrder.id).catch((error) => {
      console.warn("[generate-preview]", {
        requestId,
        failureReason: "Browser session persistence failed",
        errorMessage: error instanceof Error ? error.message : "Unknown browser session error",
      });
    });
    void recordPreviewAttempt({
      browserId,
      orderId: dbOrder.id,
      ipHash: requestMetadata.ipHash,
      uaHash,
      outcome: "generated",
      denialReason: null,
    }).catch((error) => {
      console.warn("[generate-preview]", {
        requestId,
        failureReason: "Preview attempt tracking failed",
        errorMessage: error instanceof Error ? error.message : "Unknown preview attempt error",
      });
    });

    console.info("[generate-preview]", {
      requestId,
      orderId: order.orderId,
      browserIdPresent: !browserIdentity.created,
      previewAllowed: true,
      wallpaperType: normalizedBody.wallpaperType,
      model: imageConfig.model,
      event: "preview_created",
    });

    const response: PreviewRouteResponse = {
      success: true,
      wallpaperType: normalizedBody.wallpaperType,
      orderId: order.orderId,
      previewImageId: order.previewImageId || null,
      previewImageUrl: savedPreview.url,
      previewUrl: savedPreview.url,
      orderToken,
      orderSnapshotToken,
      imageUrl: savedPreview.url,
      meta,
      selectedLabel: meta.selectedLabel,
      ratioLabel: meta.ratioLabel,
      finalWidth: meta.finalWidth,
      finalHeight: meta.finalHeight,
      outputFormat: meta.outputFormat,
      previewInputHash,
      previewCreatedAt: Date.now(),
      preview: true,
      mock: false,
      hasPreviewAvailable: true,
      nextPreviewAt: null,
      activeOrderId: dbOrder.id,
    };

    const jsonResponse = NextResponse.json(response);
    appendBrowserCookie(jsonResponse, browserIdentity.setCookie);
    return jsonResponse;
  } catch (error) {
    console.error("[generate-preview]", {
      requestId,
      failureReason: "Unhandled generate-preview error",
      errorName: error instanceof Error ? error.name : "Error",
      errorMessage:
        error instanceof Error ? error.message : "Unknown preview error",
      stack:
        process.env.NODE_ENV !== "production" && error instanceof Error
          ? error.stack
          : undefined,
    });
    safeLog("Preview generation error", error);
    void trackOrderEvent({
      orderId,
      eventType: "preview_failed",
      requestMetadata,
      metadata: { requestId, reason: "unhandled_preview_error" },
    });
    void recordPreviewAttempt({
      browserId: browserIdentity.browserId,
      orderId: orderId || null,
      ipHash: requestMetadata.ipHash,
      uaHash: await hashUserAgent(requestMetadata.userAgent),
      outcome: "failed",
      denialReason: "unhandled_preview_error",
    }).catch(() => {});
    return previewError(
      "We couldn't create your preview right now. Please try again.",
      500,
      "PREVIEW_INTERNAL_ERROR",
      undefined,
      browserIdentity,
    );
  }
}

function orderSnapshotFromDbOrder(
  dbOrder: DbOrder,
  input: WallpaperInput,
  previewImageUrl: string,
  previewImageId?: string,
  promptHash?: string,
): OrderSnapshot {
  return {
    orderId: dbOrder.id,
    packageId: "single",
    packageType: "single",
    input,
    promptHash: promptHash || dbOrder.prompt_hash,
    status: "preview_created",
    previewImageId: previewImageId || dbOrder.preview_r2_key || imageIdFromUrl(previewImageUrl),
    previewImageUrl,
    device: dbOrder.device,
    ratio: dbOrder.ratio,
    width: String(dbOrder.width),
    height: String(dbOrder.height),
    theme: dbOrder.theme,
    style: dbOrder.style,
    quoteTone: dbOrder.quote_tone || "none",
    createdAt: new Date(dbOrder.created_at).toISOString(),
    expiresAt: dbOrder.expires_at
      ? new Date(dbOrder.expires_at).toISOString()
      : undefined,
  };
}

async function resolveExistingPreviewOrder(
  body: NormalizedPreviewBody,
): Promise<DbOrder | null> {
  const orderId = body.orderId || (await resolveOrderIdFromToken(body.orderToken));
  if (!orderId) {
    return null;
  }

  const order = await getOrder(orderId);
  if (!order) {
    return null;
  }

  const activeOrder = await expireOrderIfNeeded(order);
  if (!activeOrder) {
    return null;
  }

  if (
    activeOrder.status === "draft" ||
    activeOrder.status === "preview_created" ||
    activeOrder.status === "pending_payment"
  ) {
    return activeOrder;
  }

  return null;
}

async function resolveOrderIdFromToken(orderToken: string | null) {
  if (!orderToken) {
    return null;
  }

  const token = await verifyCheckoutOrderToken(orderToken);
  return token?.orderId || null;
}

async function saveProcessedPreviewImage(
  orderId: string,
  bytes: Uint8Array,
  _input: WallpaperInput,
  contentType = "image/png",
) {
  return savePreviewImage(orderId, bytes, contentType);
}

async function saveRemotePreviewImage(
  orderId: string,
  url: string,
  input: WallpaperInput,
) {
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  return saveProcessedPreviewImage(orderId, bytes, input, contentType);
}

async function generatePreviewImage(input: {
  requestId: string;
  apiKey: string;
  prompt: string;
  imageConfig: ReturnType<typeof getImageGenerationConfig>["preview"];
  input: WallpaperInput;
}): Promise<PreviewGenerationSuccess | PreviewGenerationFailure> {
  const meta = getWallpaperMeta(input.input);
  const requestedWidth = meta.finalWidth;
  const requestedHeight = meta.finalHeight;
  const models = [input.imageConfig.model];
  if (input.imageConfig.model !== "gpt-image-1") {
    models.push("gpt-image-1");
  }
  const sizes = [meta.modelSize as ReturnType<typeof getOpenAIImageSize>];
  if (!sizes.includes("auto")) {
    sizes.push("auto");
  }

  for (let modelIndex = 0; modelIndex < models.length; modelIndex += 1) {
    const model = models[modelIndex];

    for (let sizeIndex = 0; sizeIndex < sizes.length; sizeIndex += 1) {
      const openAiSize = sizes[sizeIndex];
      console.info("[generate-preview]", {
        requestId: input.requestId,
        step: "openai_preview_request",
        model,
        requestedWidth,
        requestedHeight,
        openAiSize,
        quality: input.imageConfig.quality,
      });

      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${input.apiKey}`,
        },
        body: JSON.stringify({
          model,
          prompt: input.prompt,
          size: openAiSize,
          quality: input.imageConfig.quality,
          output_format: input.imageConfig.outputFormat,
          output_compression: input.imageConfig.compression,
          moderation: "auto",
          n: 1,
        }),
      });

      if (response.ok) {
        return {
          success: true,
          result: (await response.json()) as OpenAIImageResponse,
        };
      }

      const responseText = await response.text().catch(() => "");
      console.error("[generate-preview]", {
        requestId: input.requestId,
        failureReason: "OpenAI preview generation failed",
        model,
        requestedWidth,
        requestedHeight,
        openAiSize,
        providerStatus: response.status,
        errorMessage: responseText.slice(0, 300),
      });

      if (response.status === 401 || response.status === 403) {
        return {
          success: false,
          status: 503,
          code: "PREVIEW_AI_UNAVAILABLE",
          message:
            "Preview generation is temporarily unavailable. Please try again soon.",
        };
      }

      if (response.status === 400) {
        const canTryAnotherSize = sizeIndex < sizes.length - 1;
        const canTryAnotherModel = modelIndex < models.length - 1;
        if (canTryAnotherSize || canTryAnotherModel) {
          continue;
        }
      }

      return {
        success: false,
        status: 502,
        code: "PREVIEW_GENERATION_FAILED",
        message: "We couldn't create your preview right now. Please try again.",
      };
    }
  }

  return {
    success: false,
    status: 503,
    code: "PREVIEW_AI_UNAVAILABLE",
    message: "Preview generation is temporarily unavailable. Please try again soon.",
  };
}

function normalizePreviewRequestBody(body: unknown): NormalizedPreviewBody | null {
  if (!body || typeof body !== "object") {
    return null;
  }

  const payload = body as Record<string, unknown>;
  const device = normalizeDevice(payload.device, payload.wallpaperType);
  if (!device) {
    return null;
  }

  const wallpaperType = wallpaperTypeFromDevice(device);
  const ratio = normalizeRatio(payload.ratio, device);
  const theme = normalizeTheme(payload.theme);
  const style = normalizeStyle(payload.style);
  const previewSessionId = stringValue(payload.previewSessionId);
  const website = stringValue(payload.website);
  const mood = stringValue(payload.mood);
  const answers =
    payload.answers && typeof payload.answers === "object"
      ? (payload.answers as Record<string, unknown>)
      : {};
  const dreamProfile = sanitizeDreamProfile(
    profileFromStoredAnswers(payload.dreamProfile || answers || emptyVisualOnlyDreamProfile),
  );
  const legacyFields = buildLegacyWallpaperFields(dreamProfile);
  const width = numberValue(payload.width);
  const height = numberValue(payload.height);
  const customWidth = numberValue(payload.customWidth) ?? width;
  const customHeight = numberValue(payload.customHeight) ?? height;
  const validatedCustom =
    device === "custom" && ratio === "custom"
      ? validateCustomSize(customWidth, customHeight)
      : null;

  if (!ratio || !theme || !style || !previewSessionId) {
    return null;
  }

  if (device === "custom" && ratio === "custom") {
    if (!validatedCustom || !validatedCustom.valid) {
      return null;
    }
  }

  const input: WallpaperInput = {
    device,
    ratio,
    theme,
    style,
    dreamProfile,
    goals: legacyFields.goals,
    lifestyle: legacyFields.lifestyle,
    career: legacyFields.career,
    personalLife: legacyFields.personalLife,
    health: legacyFields.health,
    place: legacyFields.place,
    feelingWords: legacyFields.feelingWords,
    reminder: legacyFields.reminder,
    quoteTone: "none",
    customWidth:
      device === "custom" && validatedCustom?.valid ? validatedCustom.width : undefined,
    customHeight:
      device === "custom" && validatedCustom?.valid ? validatedCustom.height : undefined,
  };

  const meta = getWallpaperMeta(input);
  const resolvedWidth = meta.finalWidth;
  const resolvedHeight = meta.finalHeight;

  if (!isValidRatioForDevice(device, ratio)) {
    return null;
  }

  return {
    wallpaperType,
    input,
    previewSessionId,
    website,
    width: resolvedWidth,
    height: resolvedHeight,
    mood,
    orderId: stringValue(payload.orderId) || null,
    orderToken: stringValue(payload.orderToken) || null,
  };
}

function normalizeDevice(
  device: unknown,
  wallpaperType: unknown,
): DeviceType | null {
  if (device === "mobile" || device === "tablet" || device === "desktop" || device === "custom") {
    return device;
  }

  if (isWallpaperProductId(wallpaperType)) {
    return wallpaperType;
  }

  if (typeof device !== "string") {
    return null;
  }

  const normalized = device.toLowerCase();
  if (normalized.includes("phone") || normalized.includes("mobile")) {
    return "mobile";
  }
  if (normalized.includes("ipad") || normalized.includes("tablet")) {
    return "tablet";
  }
  if (normalized.includes("desktop")) {
    return "desktop";
  }
  if (normalized.includes("custom")) {
    return "custom";
  }

  return null;
}

function normalizeRatio(value: unknown, device: DeviceType): RatioType | "" {
  if (typeof value !== "string") {
    return device === "custom" ? "custom" : "";
  }

  return isRatioType(value) ? value : "";
}

function normalizeTheme(value: unknown): ThemeType | "" {
  if (value === "light" || value === "dark") {
    return value;
  }

  return "";
}

function normalizeStyle(value: unknown): WallpaperStyle | "" {
  if (
    value === "soft-luxury" ||
    value === "minimal" ||
    value === "dreamy" ||
    value === "nature" ||
    value === "feminine" ||
    value === "wealth-business" ||
    value === "family-home" ||
    value === "fitness-health" ||
    value === "freedom-travel"
  ) {
    return value;
  }

  return "";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function base64ToBytes(content: string) {
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function imageIdFromUrl(value: string) {
  const match = value.match(/\/api\/wallpaper-image\/(.+)$/);
  return match ? decodeURIComponent(match[1]) : "";
}

function previewError(
  message: string,
  status = 400,
  code?:
    | "PREVIEW_INVALID_INPUT"
    | "PREVIEW_ATTEMPT_LIMIT"
    | "PREVIEW_DAILY_LIMIT"
    | "PREVIEW_SESSION_USED"
    | "PREVIEW_LIMIT_REACHED"
    | "PREVIEW_ENTITLEMENT_UNAVAILABLE"
    | "PREVIEW_RATE_LIMITED"
    | "PREVIEW_AI_UNAVAILABLE"
    | "PREVIEW_AI_FAILED"
    | "PREVIEW_STORAGE_UNAVAILABLE"
    | "PREVIEW_GENERATION_FAILED"
    | "PREVIEW_INTERNAL_ERROR",
  retryAfterSeconds?: number,
  browserIdentity?: { setCookie: string },
  extras?: {
    hasPreviewAvailable?: boolean;
    nextPreviewAt?: string | null;
    activeOrderId?: string | null;
  },
) {
  const response = NextResponse.json(
    {
      success: false,
      code,
      message,
      error: message,
      retryAfterSeconds,
      hasPreviewAvailable: extras?.hasPreviewAvailable,
      nextPreviewAt: extras?.nextPreviewAt,
      activeOrderId: extras?.activeOrderId,
    },
    {
      status,
      headers:
        retryAfterSeconds && status === 429
          ? { "Retry-After": String(retryAfterSeconds) }
          : undefined,
    },
  );
  if (browserIdentity?.setCookie) {
    appendBrowserCookie(response, browserIdentity.setCookie);
  }
  return response;
}

function logPreviewRateLimit(details: {
  requestId: string;
  failureReason: string;
  limitType: "attempt" | "success";
  retryAfterSeconds: number;
  ipHash?: string;
}) {
  console.error("[preview-rate-limit]", details);
}
