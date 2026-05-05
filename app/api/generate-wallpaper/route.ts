import { NextResponse } from "next/server";
import { createMockWallpaperSvg } from "@/lib/mock";
import {
  containsAbusiveInput,
  generateWallpaperSchema,
  hasMeaningfulInput,
} from "@/lib/schemas";
import {
  assertSameOrigin,
  checkRateLimit,
  jsonError,
  safeLog,
} from "@/lib/security";
import { verifyOrderToken } from "@/lib/payment";
import type { WallpaperInput } from "@/lib/types";
import { buildWallpaperPrompt, getWallpaperMeta } from "@/lib/wallpaper";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return jsonError("Request origin is not allowed.", 403);
    }

    if (!checkRateLimit(request, "generate-wallpaper", 4)) {
      return jsonError("Too many requests. Please wait a moment and try again.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = generateWallpaperSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Please check your wallpaper answers and try again.");
    }

    if (parsed.data.website) {
      return jsonError("Unable to create your wallpaper. Please try again.");
    }

    if (!hasMeaningfulInput(parsed.data)) {
      return jsonError("Please add a little more detail first.");
    }

    const joined = [
      parsed.data.goals,
      parsed.data.lifestyle,
      parsed.data.career,
      parsed.data.personalLife,
      parsed.data.health,
      parsed.data.place,
      parsed.data.feelingWords,
      parsed.data.reminder,
    ].join(" ");

    if (containsAbusiveInput(joined)) {
      return jsonError("Please keep the wallpaper request safe and respectful.");
    }

    const order = parsed.data.orderToken
      ? await verifyOrderToken(parsed.data.orderToken)
      : null;

    if (!order) {
      return jsonError("Please confirm payment before generating.", 402);
    }

    const input: WallpaperInput = {
      device: parsed.data.device,
      ratio: parsed.data.ratio,
      theme: parsed.data.theme,
      style: parsed.data.style,
      goals: parsed.data.goals,
      lifestyle: parsed.data.lifestyle,
      career: parsed.data.career,
      personalLife: parsed.data.personalLife,
      health: parsed.data.health,
      place: parsed.data.place,
      feelingWords: parsed.data.feelingWords,
      reminder: parsed.data.reminder,
      quoteTone: parsed.data.quoteTone,
    };
    const meta = getWallpaperMeta(input);
    const prompt = buildWallpaperPrompt(input);

    if (!process.env.OPENAI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return jsonError("Image generation is not configured yet.", 503);
      }

      return NextResponse.json({
        imageUrl: createMockWallpaperSvg(input),
        meta,
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
        size: meta.imageSize,
        quality: "high",
        output_format: "png",
        moderation: "auto",
        n: 1,
      }),
    });

    if (!response.ok) {
      safeLog("OpenAI image generation failed", response.status);
      return jsonError(
        "We could not create your wallpaper right now. Please try again.",
        502,
      );
    }

    const result = (await response.json()) as OpenAIImageResponse;
    const image = result.data?.[0];
    const imageUrl = image?.b64_json
      ? `data:image/png;base64,${image.b64_json}`
      : image?.url;

    if (!imageUrl) {
      return jsonError(
        "The image service did not return a wallpaper. Please try again.",
        502,
      );
    }

    return NextResponse.json({ imageUrl, meta, mock: false });
  } catch (error) {
    safeLog("Wallpaper generation error", error);
    return jsonError("Unable to create your wallpaper. Please try again.", 500);
  }
}
