import { NextResponse } from "next/server";
import { createMockWallpaperSvg } from "@/lib/mock";
import {
  containsAbusiveInput,
  hasMeaningfulInput,
  previewGenerationSchema,
} from "@/lib/schemas";
import {
  assertSameOrigin,
  safeLog,
} from "@/lib/security";
import { getRuntimeEnv } from "@/lib/env";
import { checkIpRateLimit, consumePreviewSession } from "@/lib/rateLimit";
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

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return previewError("Request origin is not allowed.", 403);
    }

    if (!(await checkIpRateLimit(request, "preview", 3, 24 * 60 * 60 * 1000))) {
      return previewError("Too many preview requests. Please try again later.", 429);
    }

    const body = await request.json().catch(() => null);
    if (hasOversizedCustomDimensions(body)) {
      return previewError("Custom size cannot exceed 3840px on either side.");
    }

    const parsed = previewGenerationSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      return previewError("Please check your wallpaper answers and try again.");
    }

    if (!hasMeaningfulInput(parsed.data)) {
      return previewError("Please add a little more detail first.");
    }

    const joined = Object.values(parsed.data).join(" ");
    if (containsAbusiveInput(joined)) {
      return previewError("Please keep the wallpaper request safe and respectful.");
    }

    if (!(await consumePreviewSession(parsed.data.previewSessionId))) {
      return previewError(
        "You already created your free preview. Unlock the full wallpaper to continue.",
        409,
      );
    }

    const input = parsed.data as WallpaperInput;
    const env = getRuntimeEnv();
    const meta = getWallpaperMeta(input);
    const prompt = buildPreviewWallpaperPrompt(input);
    const dbOrder = await createOrder(input);

    if (!dbOrder) {
      return previewError("Preview generation failed", 503);
    }

    if (!env.OPENAI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return previewError("Preview generation is not configured yet.", 503);
      }

      const savedPreview = await savePreviewImageFromDataUrl(
        dbOrder.id,
        createMockWallpaperSvg(input, { preview: true }),
      );

      if (!savedPreview) {
        return previewError("Preview generation failed", 500);
      }
      await attachPreviewImage(dbOrder.id, savedPreview.key);
      const order = orderSnapshotFromDbOrder(dbOrder, input, savedPreview.url);
      storeOrder(order);
      const orderToken = await signCheckoutOrderToken(order);
      const orderSnapshotToken = await signOrderSnapshot(order);
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
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        prompt,
        size: getPreviewImageSize(input),
        quality: "low",
        output_format: "png",
        moderation: "auto",
        n: 1,
      }),
    });

    if (!response.ok) {
      safeLog("OpenAI preview generation failed", response.status);
      return previewError("Preview generation failed", 502);
    }

    const result = (await response.json()) as OpenAIImageResponse;
    const image = result.data?.[0];
    const savedPreview = image?.b64_json
      ? await savePreviewImageFromBase64(dbOrder.id, image.b64_json, "image/png")
      : image?.url
        ? await saveRemotePreviewImage(dbOrder.id, image.url)
        : null;

    if (!savedPreview) {
      return previewError("Preview generation failed", 502);
    }
    await attachPreviewImage(dbOrder.id, savedPreview.key);
    const order = orderSnapshotFromDbOrder(dbOrder, input, savedPreview.url);
    storeOrder(order);
    const orderToken = await signCheckoutOrderToken(order);
    const orderSnapshotToken = await signOrderSnapshot(order);
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
    return previewError("Preview generation failed", 500);
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

function previewError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
    },
    { status },
  );
}

function hasOversizedCustomDimensions(body: unknown) {
  if (!body || typeof body !== "object") {
    return false;
  }

  const customBody = body as { customWidth?: unknown; customHeight?: unknown };
  return (
    (typeof customBody.customWidth === "number" && customBody.customWidth > 3840) ||
    (typeof customBody.customHeight === "number" && customBody.customHeight > 3840)
  );
}
