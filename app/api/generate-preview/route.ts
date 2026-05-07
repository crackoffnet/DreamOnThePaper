import { NextResponse } from "next/server";
import {
  containsAbusiveInput,
  hasMeaningfulInput,
  previewGenerationSchema,
} from "@/lib/schemas";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";
import { getImageGenerationConfig } from "@/lib/imageGenerationConfig";
import {
  attachPreviewImage,
  createOrder,
  type DbOrder,
} from "@/lib/orders";
import {
  hashOperationalValue,
  patchOrderTracking,
  trackOrderEvent,
} from "@/lib/orderEvents";
import {
  type OrderSnapshot,
  signCheckoutOrderToken,
  signOrderSnapshot,
  storeOrder,
} from "@/lib/order-state";
import { getRequestMetadata } from "@/lib/requestMetadata";
import {
  checkPreviewAttemptLimit,
  checkPreviewSessionSuccess,
  checkPreviewSuccessLimit,
  recordPreviewSuccess,
} from "@/lib/rateLimit";
import {
  assertSameOrigin,
  getClientIp,
  safeLog,
} from "@/lib/security";
import {
  savePreviewImageFromBase64,
} from "@/lib/storage";
import type {
  DeviceType,
  GenerateResponse,
  QuoteTone,
  RatioType,
  ThemeType,
  WallpaperInput,
  WallpaperStyle,
} from "@/lib/types";
import {
  isWallpaperProductId,
  wallpaperProducts,
  wallpaperTypeFromDevice,
} from "@/lib/wallpaperProducts";
import {
  buildPreviewWallpaperPrompt,
  getPreviewImageSize,
  getWallpaperMeta,
  isValidRatioForDevice,
} from "@/lib/wallpaper";

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
};

const MAX_TOTAL_PIXELS = 3840 * 2160;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const requestMetadata = await getRequestMetadata(request);
  let orderId: string | undefined;

  try {
    if (!assertSameOrigin(request)) {
      return previewError("Request origin is not allowed.", 403);
    }

    const env = getRuntimeEnv();
    const bindings = getOptionalCloudflareBindings();
    const bypassToken = request.headers.get("x-admin-bypass-token");
    const hasRateLimitBypass =
      Boolean(env.PREVIEW_RATE_LIMIT_BYPASS_TOKEN) &&
      bypassToken === env.PREVIEW_RATE_LIMIT_BYPASS_TOKEN;
    const clientIp = getClientIp(request);

    const rawBody = await request.json().catch(() => null);
    const normalizedBody = normalizePreviewRequestBody(rawBody);

    if (!normalizedBody) {
      return previewError(
        "Please complete your wallpaper settings and try again.",
        400,
        "PREVIEW_INVALID_INPUT",
      );
    }

    if (!hasRateLimitBypass) {
      const attemptLimit = await checkPreviewAttemptLimit(clientIp);
      if (!attemptLimit.allowed) {
        logPreviewRateLimit({
          requestId,
          failureReason: "Preview attempt limit exceeded",
          limitType: "attempt",
          retryAfterSeconds: attemptLimit.retryAfterSeconds,
        });
        void trackOrderEvent({
          eventType: "preview_failed",
          requestMetadata,
          metadata: {
            requestId,
            reason: "attempt_limit",
            code: "PREVIEW_ATTEMPT_LIMIT",
          },
        });
        return previewError(
          "Too many preview attempts. Please wait and try again.",
          429,
          "PREVIEW_ATTEMPT_LIMIT",
          attemptLimit.retryAfterSeconds,
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
      );
    }

    if (!hasMeaningfulInput(parsed.data)) {
      return previewError(
        "Please complete your wallpaper settings and try again.",
        400,
        "PREVIEW_INVALID_INPUT",
      );
    }

    const joined = Object.values(parsed.data).join(" ");
    if (containsAbusiveInput(joined)) {
      return previewError(
        "Please keep the wallpaper request safe and respectful.",
        400,
        "PREVIEW_INVALID_INPUT",
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
      );
    }

    if (!hasRateLimitBypass) {
      const sessionSuccess = await checkPreviewSessionSuccess(
        normalizedBody.previewSessionId,
      );
      if (!sessionSuccess.allowed) {
        return previewError(
          "You already created your free preview. Unlock the full wallpaper to continue.",
          409,
          "PREVIEW_SESSION_USED",
          sessionSuccess.retryAfterSeconds,
        );
      }

      const successLimit = await checkPreviewSuccessLimit(clientIp);
      if (!successLimit.allowed) {
        logPreviewRateLimit({
          requestId,
          failureReason: "Preview daily success limit exceeded",
          limitType: "success",
          retryAfterSeconds: successLimit.retryAfterSeconds,
        });
        return previewError(
          "You've reached today's free preview limit. Please try again tomorrow.",
          429,
          "PREVIEW_DAILY_LIMIT",
          successLimit.retryAfterSeconds,
        );
      }
    }

    const input = parsed.data as WallpaperInput;
    const product = wallpaperProducts[normalizedBody.wallpaperType];
    const imageConfig = getImageGenerationConfig().preview;
    const meta = getWallpaperMeta(input);
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

    const dbOrder = await createOrder(input);
    orderId = dbOrder?.id;

    if (!dbOrder) {
      return previewError(
        "We couldn't create your preview right now. Please try again.",
        503,
        "PREVIEW_INTERNAL_ERROR",
      );
    }

    void patchOrderTracking(dbOrder.id, {
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
      custom_width: input.customWidth || null,
      custom_height: input.customHeight || null,
      mood: normalizedBody.mood || null,
      answers_hash: await hashOperationalValue(
        [
          input.goals,
          input.lifestyle,
          input.career,
          input.personalLife,
          input.health,
          input.place,
          input.feelingWords,
          input.reminder,
        ].join("|"),
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
      void trackOrderEvent({
        orderId,
        eventType: "preview_failed",
        requestMetadata,
        metadata: {
          requestId,
          reason: aiResult.code,
        },
      });
      return previewError(aiResult.message, aiResult.status, aiResult.code);
    }

    const image = aiResult.result.data?.[0];
    let savedPreview: Awaited<ReturnType<typeof savePreviewImageFromBase64>> | null =
      null;

    try {
      savedPreview = image?.b64_json
        ? await savePreviewImageFromBase64(dbOrder.id, image.b64_json, "image/jpeg")
        : image?.url
          ? await saveRemotePreviewImage(dbOrder.id, image.url)
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
      return previewError(
        "Preview storage is temporarily unavailable. Please try again soon.",
        503,
        "PREVIEW_STORAGE_UNAVAILABLE",
      );
    }

    if (!savedPreview) {
      return previewError(
        "Preview storage is temporarily unavailable. Please try again soon.",
        503,
        "PREVIEW_STORAGE_UNAVAILABLE",
      );
    }

    await attachPreviewImage(dbOrder.id, savedPreview.key);
    const order = orderSnapshotFromDbOrder(dbOrder, input, savedPreview.url);
    storeOrder(order);
    const orderToken = await signCheckoutOrderToken(order);
    const orderSnapshotToken = await signOrderSnapshot(order);

    void patchOrderTracking(dbOrder.id, {
      preview_r2_key: savedPreview.key,
      preview_created_at: new Date().toISOString(),
      order_token_hash: await hashOperationalValue(orderToken),
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

    if (!hasRateLimitBypass) {
      await recordPreviewSuccess(clientIp, normalizedBody.previewSessionId);
    }

    console.info("[generate-preview]", {
      requestId,
      orderId: order.orderId,
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
      orderToken,
      orderSnapshotToken,
      imageUrl: savedPreview.url,
      meta,
      preview: true,
      mock: false,
    };

    return NextResponse.json(response);
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
    return previewError(
      "We couldn't create your preview right now. Please try again.",
      500,
      "PREVIEW_INTERNAL_ERROR",
    );
  }
}

function orderSnapshotFromDbOrder(
  dbOrder: DbOrder,
  input: WallpaperInput,
  previewImageUrl: string,
): OrderSnapshot {
  return {
    orderId: dbOrder.id,
    packageId: "single",
    packageType: "single",
    input,
    promptHash: dbOrder.prompt_hash,
    status: "preview_created",
    previewImageId: dbOrder.preview_r2_key || imageIdFromUrl(previewImageUrl),
    previewImageUrl,
    device: dbOrder.device,
    ratio: dbOrder.ratio,
    width: String(dbOrder.width),
    height: String(dbOrder.height),
    theme: dbOrder.theme,
    style: dbOrder.style,
    quoteTone: dbOrder.quote_tone,
    createdAt: new Date(dbOrder.created_at).toISOString(),
    expiresAt: dbOrder.expires_at
      ? new Date(dbOrder.expires_at).toISOString()
      : undefined,
  };
}

async function saveRemotePreviewImage(orderId: string, url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  return savePreviewImageFromBase64(orderId, bytesToBase64(bytes), contentType);
}

async function generatePreviewImage(input: {
  requestId: string;
  apiKey: string;
  prompt: string;
  imageConfig: ReturnType<typeof getImageGenerationConfig>["preview"];
  input: WallpaperInput;
}): Promise<PreviewGenerationSuccess | PreviewGenerationFailure> {
  const models = [input.imageConfig.model];
  if (input.imageConfig.model !== "gpt-image-1") {
    models.push("gpt-image-1");
  }

  for (let index = 0; index < models.length; index += 1) {
    const model = models[index];
    console.info("[generate-preview]", {
      requestId: input.requestId,
      step: "openai_preview_request",
      model,
      size: getPreviewImageSize(input.input),
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
        size: getPreviewImageSize(input.input),
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

    if (response.status === 400 && index < models.length - 1) {
      continue;
    }

    return {
      success: false,
      status: 502,
      code: "PREVIEW_GENERATION_FAILED",
      message: "We couldn't create your preview right now. Please try again.",
    };
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
  const quoteTone = normalizeQuoteTone(payload.quoteTone);
  const previewSessionId = stringValue(payload.previewSessionId);
  const website = stringValue(payload.website);
  const mood = stringValue(payload.mood);
  const answers =
    payload.answers && typeof payload.answers === "object"
      ? (payload.answers as Record<string, unknown>)
      : {};
  const width = numberValue(payload.width);
  const height = numberValue(payload.height);
  const customWidth = numberValue(payload.customWidth) ?? width;
  const customHeight = numberValue(payload.customHeight) ?? height;

  if (!ratio || !theme || !style || !previewSessionId) {
    return null;
  }

  if (device === "custom") {
    if (
      typeof customWidth !== "number" ||
      typeof customHeight !== "number" ||
      customWidth <= 0 ||
      customHeight <= 0 ||
      customWidth > 3840 ||
      customHeight > 3840 ||
      customWidth * customHeight > MAX_TOTAL_PIXELS
    ) {
      return null;
    }
  }

  const input: WallpaperInput = {
    device,
    ratio,
    theme,
    style,
    goals: stringValue(payload.goals) || stringValue(answers.goals),
    lifestyle: stringValue(payload.lifestyle) || stringValue(answers.lifestyle),
    career: stringValue(payload.career) || stringValue(answers.career),
    personalLife:
      stringValue(payload.personalLife) || stringValue(answers.personalLife),
    health: stringValue(payload.health) || stringValue(answers.health),
    place: stringValue(payload.place) || stringValue(answers.place),
    feelingWords:
      stringValue(payload.feelingWords) || stringValue(answers.feelingWords),
    reminder: stringValue(payload.reminder) || stringValue(answers.reminder),
    quoteTone,
    customWidth: device === "custom" ? customWidth : undefined,
    customHeight: device === "custom" ? customHeight : undefined,
  };

  const meta = getWallpaperMeta(input);
  const [resolvedWidth, resolvedHeight] = meta.imageSize.split("x").map(Number);

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

  return value as RatioType;
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

function normalizeQuoteTone(value: unknown): QuoteTone {
  if (
    value === "soft-emotional" ||
    value === "powerful-confident" ||
    value === "spiritual-calm" ||
    value === "none"
  ) {
    return value;
  }

  return "soft-emotional";
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value : "";
}

function numberValue(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }
  return btoa(binary);
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
    | "PREVIEW_AI_UNAVAILABLE"
    | "PREVIEW_STORAGE_UNAVAILABLE"
    | "PREVIEW_GENERATION_FAILED"
    | "PREVIEW_INTERNAL_ERROR",
  retryAfterSeconds?: number,
) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
      error: message,
      retryAfterSeconds,
    },
    {
      status,
      headers:
        retryAfterSeconds && status === 429
          ? { "Retry-After": String(retryAfterSeconds) }
          : undefined,
    },
  );
}

function logPreviewRateLimit(details: {
  requestId: string;
  failureReason: string;
  limitType: "attempt" | "success";
  retryAfterSeconds: number;
}) {
  console.error("[preview-rate-limit]", details);
}
