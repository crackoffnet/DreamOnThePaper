import { NextResponse } from "next/server";
import { createMockWallpaperSvg } from "@/lib/mock";
import { containsAbusiveInput, hasMeaningfulInput, orderTokenSchema } from "@/lib/schemas";
import { assertSameOrigin, jsonError, safeLog } from "@/lib/security";
import { getRuntimeEnv } from "@/lib/env";
import { verifyOrderToken } from "@/lib/payment";
import { consumeFinalSession, releaseFinalSession } from "@/lib/rateLimit";
import { getOpenAIImageSize } from "@/lib/openaiImageSize";
import type { OrderSnapshot } from "@/lib/order-state";
import {
  getOrderById,
  markFinalGenerated,
  markFinalGenerating,
  markOrderFailed,
  markOrderPaid,
} from "@/lib/order-state";
import {
  buildWallpaperPrompt,
  getWallpaperMeta,
} from "@/lib/wallpaper";
import {
  saveGeneratedImageFromDataUrl,
  saveFinalImageFromBase64,
} from "@/lib/storage";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return jsonError("Request origin is not allowed.", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = orderTokenSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Please confirm payment before generating.", 402);
    }

    const tokenOrder = await verifyOrderToken(parsed.data.orderToken);
    if (!tokenOrder) {
      return jsonError("Please confirm payment before generating.", 402);
    }

    const storedOrder = getOrderById(tokenOrder.orderId);
    const order: OrderSnapshot =
      storedOrder ||
      ({
        orderId: tokenOrder.orderId,
        packageId: tokenOrder.packageId,
        input: tokenOrder.input,
        promptHash: tokenOrder.promptHash,
        sessionId: tokenOrder.sessionId,
        status: "paid",
      } satisfies OrderSnapshot);

    if (order.promptHash !== tokenOrder.promptHash) {
      return jsonError("Unable to verify this order.", 400);
    }

    if (order.status === "final_generated" && order.finalImageUrl) {
      return NextResponse.json({
        success: true,
        imageUrl: order.finalImageUrl,
        meta: getWallpaperMeta(order.input),
        reused: true,
      });
    }

    if (order.status === "final_generating") {
      return jsonError("Your wallpaper is already being created.", 409);
    }

    if (order.status !== "paid" && order.status !== "failed") {
      return jsonError("Please confirm payment before generating.", 402);
    }

    const input = order.input;
    const env = getRuntimeEnv();
    if (!hasMeaningfulInput(input)) {
      return jsonError("Please add a little more detail first.");
    }

    const joined = [
      input.goals,
      input.lifestyle,
      input.career,
      input.personalLife,
      input.health,
      input.place,
      input.feelingWords,
      input.reminder,
    ].join(" ");

    if (containsAbusiveInput(joined)) {
      return jsonError("Please keep the wallpaper request safe and respectful.");
    }

    if (!(await consumeFinalSession(tokenOrder.sessionId))) {
      return jsonError("Your wallpaper is already being created.", 409);
    }

    const generatingOrder = markFinalGenerating(order);
    const meta = getWallpaperMeta(input);
    const prompt = buildWallpaperPrompt(input);
    const [requestedWidth, requestedHeight] = meta.imageSize
      .split("x")
      .map((value) => Number(value));
    const openAiSize = getOpenAIImageSize(requestedWidth, requestedHeight);

    try {
      if (!env.OPENAI_API_KEY) {
        if (process.env.NODE_ENV === "production") {
          markOrderPaid(generatingOrder, tokenOrder.sessionId);
          markOrderFailed(generatingOrder);
          await releaseFinalSession(tokenOrder.sessionId);
          return jsonError("Image generation is not configured yet.", 503);
        }

        const mockImageUrl = await saveGeneratedImageFromDataUrl(
          createMockWallpaperSvg(input),
        );

        if (!mockImageUrl) {
          markOrderPaid(generatingOrder, tokenOrder.sessionId);
          markOrderFailed(generatingOrder);
          await releaseFinalSession(tokenOrder.sessionId);
          return jsonError("Unable to create your wallpaper. Please try again.", 500);
        }

        markFinalGenerated(generatingOrder, mockImageUrl);
        return NextResponse.json({
          success: true,
          imageUrl: mockImageUrl,
          meta,
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
          size: openAiSize,
          quality: "high",
          output_format: "png",
          moderation: "auto",
          n: 1,
        }),
      });

      if (!response.ok) {
        safeLog("OpenAI image generation failed", response.status);
        markOrderPaid(generatingOrder, tokenOrder.sessionId);
        markOrderFailed(generatingOrder);
        await releaseFinalSession(tokenOrder.sessionId);
        return jsonError(
          "We could not create your wallpaper right now. Please try again.",
          502,
        );
      }

      const result = (await response.json()) as OpenAIImageResponse;
      const image = result.data?.[0];
      const imageUrl = image?.b64_json
        ? (await saveFinalImageFromBase64(order.orderId, image.b64_json, "image/png")).url
        : image?.url;

      if (!imageUrl) {
        markOrderPaid(generatingOrder, tokenOrder.sessionId);
        markOrderFailed(generatingOrder);
        await releaseFinalSession(tokenOrder.sessionId);
        return jsonError(
          "The image service did not return a wallpaper. Please try again.",
          502,
        );
      }

      markFinalGenerated(generatingOrder, imageUrl);
      return NextResponse.json({ success: true, imageUrl, meta, mock: false });
    } catch (error) {
      markOrderPaid(generatingOrder, tokenOrder.sessionId);
      markOrderFailed(generatingOrder);
      await releaseFinalSession(tokenOrder.sessionId);
      safeLog("Wallpaper generation provider error", error);
      return jsonError("Unable to create your wallpaper. Please try again.", 500);
    }
  } catch (error) {
    safeLog("Wallpaper generation error", error);
    return jsonError("Unable to create your wallpaper. Please try again.", 500);
  }
}
