import { NextResponse } from "next/server";
import { createMockWallpaperSvg } from "@/lib/mock";
import {
  containsAbusiveInput,
  hasMeaningfulInput,
  wallpaperInputSchema,
} from "@/lib/schemas";
import {
  assertSameOrigin,
  checkRateLimit,
  jsonError,
  safeLog,
} from "@/lib/security";
import type { WallpaperInput } from "@/lib/types";
import {
  buildPreviewWallpaperPrompt,
  getPreviewImageSize,
  getWallpaperMeta,
} from "@/lib/wallpaper";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return jsonError("Request origin is not allowed.", 403);
    }

    if (!checkRateLimit(request, "generate-preview", 6)) {
      return jsonError("Too many preview requests. Please wait a moment.", 429);
    }

    const body = await request.json().catch(() => null);
    if (hasOversizedCustomDimensions(body)) {
      return jsonError("Custom size cannot exceed 3840px on either side.");
    }

    const parsed = wallpaperInputSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      return jsonError("Please check your wallpaper answers and try again.");
    }

    if (!hasMeaningfulInput(parsed.data)) {
      return jsonError("Please add a little more detail first.");
    }

    const joined = Object.values(parsed.data).join(" ");
    if (containsAbusiveInput(joined)) {
      return jsonError("Please keep the wallpaper request safe and respectful.");
    }

    const input = parsed.data as WallpaperInput;
    const meta = getWallpaperMeta(input);
    const prompt = buildPreviewWallpaperPrompt(input);

    if (!process.env.OPENAI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return jsonError("Preview generation is not configured yet.", 503);
      }

      return NextResponse.json({
        imageUrl: createMockWallpaperSvg(input, { preview: true }),
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
      return jsonError("We could not create your preview right now.", 502);
    }

    const result = (await response.json()) as OpenAIImageResponse;
    const image = result.data?.[0];
    const imageUrl = image?.b64_json
      ? `data:image/png;base64,${image.b64_json}`
      : image?.url;

    if (!imageUrl) {
      return jsonError("The image service did not return a preview.", 502);
    }

    return NextResponse.json({ imageUrl, meta, preview: true, mock: false });
  } catch (error) {
    safeLog("Preview generation error", error);
    return jsonError("Unable to create your preview. Please try again.", 500);
  }
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
