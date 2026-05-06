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
import { checkIpRateLimit, consumePreviewSession } from "@/lib/rateLimit";
import { createPreviewOrder, signOrderSnapshot } from "@/lib/order-state";
import type { WallpaperInput } from "@/lib/types";
import {
  buildPreviewWallpaperPrompt,
  getPreviewImageSize,
  getWallpaperMeta,
} from "@/lib/wallpaper";
import {
  saveGeneratedImageFromBase64,
  saveGeneratedImageFromDataUrl,
} from "@/lib/storage";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return previewError("Request origin is not allowed.", 403);
    }

    if (!checkIpRateLimit(request, "preview", 3, 24 * 60 * 60 * 1000)) {
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

    if (!consumePreviewSession(parsed.data.previewSessionId)) {
      return previewError(
        "You already created your free preview. Unlock the full wallpaper to continue.",
        409,
      );
    }

    const input = parsed.data as WallpaperInput;
    const meta = getWallpaperMeta(input);
    const prompt = buildPreviewWallpaperPrompt(input);

    if (!process.env.OPENAI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return previewError("Preview generation is not configured yet.", 503);
      }

      const mockImageUrl = saveGeneratedImageFromDataUrl(
        createMockWallpaperSvg(input, { preview: true }),
      );

      if (!mockImageUrl) {
        return previewError("Preview generation failed", 500);
      }
      const order = await createPreviewOrder(input, mockImageUrl);
      const orderSnapshotToken = await signOrderSnapshot(order);

      return NextResponse.json({
        success: true,
        orderId: order.orderId,
        previewImageId: order.previewImageId || null,
        previewImageUrl: mockImageUrl,
        orderSnapshotToken,
        imageUrl: mockImageUrl,
        meta,
        preview: true,
        mock: true,
      });
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
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
    const imageUrl = image?.b64_json
      ? saveGeneratedImageFromBase64(image.b64_json, "image/png")
      : image?.url;

    if (!imageUrl) {
      return previewError("Preview generation failed", 502);
    }
    const order = await createPreviewOrder(input, imageUrl);
    const orderSnapshotToken = await signOrderSnapshot(order);

    return NextResponse.json({
      success: true,
      orderId: order.orderId,
      previewImageId: order.previewImageId || null,
      previewImageUrl: imageUrl,
      orderSnapshotToken,
      imageUrl,
      meta,
      preview: true,
      mock: false,
    });
  } catch (error) {
    safeLog("Preview generation error", error);
    return previewError("Preview generation failed", 500);
  }
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
