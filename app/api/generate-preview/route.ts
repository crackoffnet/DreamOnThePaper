import { NextResponse } from "next/server";
import { createMockWallpaperSvg } from "@/lib/mock";
import {
  containsAbusiveInput,
  hasMeaningfulInput,
  previewGenerationSchema,
} from "@/lib/schemas";
import {
  assertSameOrigin,
  getClientIp,
  safeLog,
} from "@/lib/security";
import { getRuntimeEnv } from "@/lib/env";
import {
  checkPreviewAttemptLimit,
  checkPreviewSessionSuccess,
  checkPreviewSuccessLimit,
  recordPreviewSuccess,
} from "@/lib/rateLimit";
import {
  storeOrder,
  type OrderSnapshot,
  signCheckoutOrderToken,
  signOrderSnapshot,
} from "@/lib/order-state";
import { attachPreviewImage, createOrder, type DbOrder } from "@/lib/orders";
import type { WallpaperInput } from "@/lib/types";
import {
  buildPreviewWallpaperPrompt,
  getPreviewImageSize,
  getWallpaperMeta,
} from "@/lib/wallpaper";
import {
  savePreviewImageFromBase64,
  savePreviewImageFromDataUrl,
} from "@/lib/storage";
import { getImageGenerationConfig } from "@/lib/imageGenerationConfig";
import { getRequestMetadata } from "@/lib/requestMetadata";
import {
  hashOperationalValue,
  patchOrderTracking,
  trackOrderEvent,
} from "@/lib/orderEvents";
import { wallpaperProducts, wallpaperTypeFromDevice } from "@/lib/wallpaperProducts";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const requestMetadata = await getRequestMetadata(request);
  let orderId: string | undefined;

  try {
    if (!assertSameOrigin(request)) {
      return previewError("Request origin is not allowed.", 403);
    }

    const env = getRuntimeEnv();
    const bypassToken = request.headers.get("x-admin-bypass-token");
    const hasRateLimitBypass =
      Boolean(env.PREVIEW_RATE_LIMIT_BYPASS_TOKEN) &&
      bypassToken === env.PREVIEW_RATE_LIMIT_BYPASS_TOKEN;
    const clientIp = getClientIp(request);

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
          metadata: { requestId, reason: "attempt_limit", code: "PREVIEW_ATTEMPT_LIMIT" },
        });
        return previewError(
          "Too many preview attempts. Please wait and try again.",
          429,
          "PREVIEW_ATTEMPT_LIMIT",
          attemptLimit.retryAfterSeconds,
        );
      }
    }

    const body = await request.json().catch(() => null);
    if (hasOversizedCustomDimensions(body)) {
      return previewError(
        "Custom size is too large. Keep it within 3840px per side and 3840 x 2160 total pixels.",
      );
    }

    const parsed = previewGenerationSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      void trackOrderEvent({
        eventType: "preview_failed",
        requestMetadata,
        metadata: { requestId, reason: "invalid_input" },
      });
      return previewError("Please check your wallpaper answers and try again.");
    }

    if (!hasMeaningfulInput(parsed.data)) {
      return previewError("Please add a little more detail first.");
    }

    const joined = Object.values(parsed.data).join(" ");
    if (containsAbusiveInput(joined)) {
      return previewError("Please keep the wallpaper request safe and respectful.");
    }

    if (!hasRateLimitBypass) {
      const sessionSuccess = await checkPreviewSessionSuccess(
        parsed.data.previewSessionId,
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
          "You've reached today's preview limit. Please try again tomorrow.",
          429,
          "PREVIEW_DAILY_LIMIT",
          successLimit.retryAfterSeconds,
        );
      }
    }

    const input = parsed.data as WallpaperInput;
    const wallpaperType = wallpaperTypeFromDevice(input.device);
    const product = wallpaperProducts[wallpaperType];
    const imageConfig = getImageGenerationConfig().preview;
    const meta = getWallpaperMeta(input);
    const prompt = buildPreviewWallpaperPrompt(input);
    void trackOrderEvent({
      eventType: "preview_requested",
      requestMetadata,
      packageType: "single",
      metadata: {
        requestId,
        device: input.device,
        ratio: input.ratio,
        theme: input.theme,
        style: input.style,
      },
    });
    const dbOrder = await createOrder(input);
    orderId = dbOrder?.id;

    if (!dbOrder) {
      void trackOrderEvent({
        eventType: "preview_failed",
        requestMetadata,
        metadata: { requestId, reason: "order_create_failed" },
      });
      return previewError(
        "We couldn't create your preview right now. Please try again.",
        503,
        "PREVIEW_GENERATION_FAILED",
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
      wallpaper_type: wallpaperType,
      package_name: product.label,
      amount_cents: product.amount,
      currency: "usd",
      custom_width: input.customWidth || null,
      custom_height: input.customHeight || null,
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

    if (!env.OPENAI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return previewError(
          "We couldn't create your preview right now. Please try again.",
          503,
          "PREVIEW_GENERATION_FAILED",
        );
      }

      const savedPreview = await savePreviewImageFromDataUrl(
        dbOrder.id,
        createMockWallpaperSvg(input, { preview: true }),
      );

      if (!savedPreview) {
        return previewError(
          "We couldn't create your preview right now. Please try again.",
          500,
          "PREVIEW_GENERATION_FAILED",
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
        metadata: { requestId, previewStored: true },
      });
      if (!hasRateLimitBypass) {
        await recordPreviewSuccess(clientIp, parsed.data.previewSessionId);
      }
      console.info(JSON.stringify({ event: "preview_created", orderId: order.orderId }));

      return NextResponse.json({
        success: true,
        orderId: order.orderId,
        previewImageId: order.previewImageId || null,
        previewImageUrl: savedPreview.url,
        orderToken,
        orderSnapshotToken,
        imageUrl: savedPreview.url,
        meta,
        preview: true,
        mock: true,
      });
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: imageConfig.model,
        prompt,
        size: getPreviewImageSize(input),
        quality: imageConfig.quality,
        output_format: imageConfig.outputFormat,
        output_compression: imageConfig.compression,
        moderation: "auto",
        n: 1,
      }),
    });

    if (!response.ok) {
      safeLog("OpenAI preview generation failed", response.status);
      void trackOrderEvent({
        orderId,
        eventType: "preview_failed",
        requestMetadata,
        metadata: { requestId, providerStatus: response.status },
      });
      return previewError(
        "We couldn't create your preview right now. Please try again.",
        502,
        "PREVIEW_GENERATION_FAILED",
      );
    }

    const result = (await response.json()) as OpenAIImageResponse;
    const image = result.data?.[0];
    const savedPreview = image?.b64_json
      ? await savePreviewImageFromBase64(
          dbOrder.id,
          image.b64_json,
          "image/jpeg",
        )
      : image?.url
        ? await saveRemotePreviewImage(dbOrder.id, image.url)
        : null;

    if (!savedPreview) {
      void trackOrderEvent({
        orderId,
        eventType: "preview_failed",
        requestMetadata,
        metadata: { requestId, reason: "preview_r2_save_failed" },
      });
      return previewError(
        "We couldn't create your preview right now. Please try again.",
        502,
        "PREVIEW_GENERATION_FAILED",
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
      metadata: { requestId, previewStored: true },
    });
    if (!hasRateLimitBypass) {
      await recordPreviewSuccess(clientIp, parsed.data.previewSessionId);
    }
    console.info(JSON.stringify({ event: "preview_created", orderId: order.orderId }));

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      previewImageId: order.previewImageId || null,
      previewImageUrl: savedPreview.url,
      orderToken,
      orderSnapshotToken,
      imageUrl: savedPreview.url,
      meta,
      preview: true,
      mock: false,
    });
  } catch (error) {
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
      "PREVIEW_GENERATION_FAILED",
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
  return savePreviewImageFromBase64(
    orderId,
    bytesToBase64(bytes),
    contentType,
  );
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
  code?: string,
  retryAfterSeconds?: number,
) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
      error: message,
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

function hasOversizedCustomDimensions(body: unknown) {
  if (!body || typeof body !== "object") {
    return false;
  }

  const customBody = body as { customWidth?: unknown; customHeight?: unknown };
  const width =
    typeof customBody.customWidth === "number" ? customBody.customWidth : 0;
  const height =
    typeof customBody.customHeight === "number" ? customBody.customHeight : 0;

  return width > 3840 || height > 3840 || width * height > 3840 * 2160;
}
