import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getOrder,
  inputFromDbOrder,
  markFinalFailed,
  markFinalGenerated,
  resetFailedFinalGeneration,
  resetStaleFinalGeneration,
  startFinalGeneration,
} from "@/lib/orders";
import { getRuntimeEnv, getRuntimeEnvPresence } from "@/lib/env";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { assertSameOrigin, safeLog } from "@/lib/security";
import { saveFinalImage, saveFinalImageFromBase64 } from "@/lib/storage";
import {
  buildFinalWallpaperPrompt,
  getFinalImageSize,
  getWallpaperMeta,
} from "@/lib/wallpaper";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

const generateFinalSchema = z
  .object({
    finalGenerationToken: z.string().min(24).max(12000).optional(),
    orderToken: z.string().min(24).max(12000).optional(),
  })
  .transform((input) => ({
    finalGenerationToken: input.finalGenerationToken || input.orderToken || "",
  }))
  .refine((input) => input.finalGenerationToken.length >= 24, {
    message: "Please confirm payment before generating.",
    path: ["finalGenerationToken"],
  });

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let orderId: string | undefined;
  let orderStatus: string | undefined;
  let finalGenerationAttempts: number | undefined;

  try {
    if (!assertSameOrigin(request)) {
      logFinalFailure({ requestId, failureReason: "Origin not allowed" });
      return finalError("Request origin is not allowed.", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = generateFinalSchema.safeParse(body);

    if (!parsed.success) {
      logFinalFailure({ requestId, failureReason: "Missing finalGenerationToken" });
      return finalError("Please confirm payment before generating.", 402);
    }

    const token = await verifyFinalGenerationToken(parsed.data.finalGenerationToken);
    if (!token) {
      logFinalFailure({
        requestId,
        failureReason: "Invalid or expired finalGenerationToken",
      });
      return finalError("Please confirm payment before generating.", 402);
    }

    orderId = token.orderId;
    const order = await getOrder(orderId);
    orderStatus = order?.status;
    finalGenerationAttempts = order?.final_generation_attempts;
    console.info("[generate-final]", {
      requestId,
      orderId,
      orderStatus,
      finalGenerationAttempts,
      event: "generation_requested",
    });

    if (!order) {
      logFinalFailure({ requestId, orderId, failureReason: "Order missing in D1" });
      return finalError(
        "We found your payment session, but could not restore your wallpaper order. Please contact support.",
        404,
      );
    }

    if (
      order.prompt_hash !== token.promptHash ||
      order.stripe_session_id !== token.sessionId
    ) {
      logFinalFailure({
        requestId,
        orderId,
        orderStatus,
        finalGenerationAttempts,
        failureReason: "Final token does not match D1 order",
      });
      return finalError("Unable to verify this paid order.", 400);
    }

    if (order.status === "final_generated" && order.final_r2_key) {
      console.info("[generate-final]", {
        requestId,
        orderId,
        orderStatus,
        finalGenerationAttempts,
        event: "existing_final_returned",
      });
      return finalSuccess(
        order.final_r2_key,
        inputFromDbOrder(order),
        order.width,
        order.height,
        true,
      );
    }

    if (order.status === "final_generating") {
      const reset = await resetStaleFinalGeneration(orderId);
      if (reset) {
        console.info("[generate-final]", {
          requestId,
          orderId,
          orderStatus,
          finalGenerationAttempts,
          event: "stale_generation_reset",
        });
      } else {
        console.info("[generate-final]", {
          requestId,
          orderId,
          orderStatus,
          finalGenerationAttempts,
          event: "generation_still_in_progress",
        });
        return finalInProgress();
      }
    }

    if (order.status === "failed") {
      const reset = await resetFailedFinalGeneration(orderId);
      if (!reset) {
        logFinalFailure({
          requestId,
          orderId,
          orderStatus,
          finalGenerationAttempts,
          failureReason: "Final generation previously failed",
        });
        return finalStatusError(
          "failed",
          "Your payment is verified, but generation failed. Please retry.",
          500,
        );
      }
    }

    const claimableOrder = await getOrder(orderId);
    orderStatus = claimableOrder?.status;
    finalGenerationAttempts = claimableOrder?.final_generation_attempts;

    if (!claimableOrder) {
      logFinalFailure({ requestId, orderId, failureReason: "Order missing after reset" });
      return finalError(
        "We found your payment session, but could not restore your wallpaper order. Please contact support.",
        404,
      );
    }

    if (claimableOrder.status === "final_generated" && claimableOrder.final_r2_key) {
      return finalSuccess(
        claimableOrder.final_r2_key,
        inputFromDbOrder(claimableOrder),
        claimableOrder.width,
        claimableOrder.height,
        true,
      );
    }

    if (claimableOrder.status === "final_generating") {
      return finalInProgress();
    }

    if (claimableOrder.status !== "paid") {
      logFinalFailure({
        requestId,
        orderId,
        orderStatus,
        finalGenerationAttempts,
        failureReason: "Order is not paid",
      });
      return finalError("Payment is not verified yet. Please wait a moment and retry.", 402);
    }

    const claimed = await startFinalGeneration(orderId);
    if (!claimed) {
      const latest = await getOrder(orderId);
      orderStatus = latest?.status;
      finalGenerationAttempts = latest?.final_generation_attempts;

      if (latest?.status === "final_generated" && latest.final_r2_key) {
        return finalSuccess(
          latest.final_r2_key,
          inputFromDbOrder(latest),
          latest.width,
          latest.height,
          true,
        );
      }

      logFinalFailure({
        requestId,
        orderId,
        orderStatus,
        finalGenerationAttempts,
        failureReason: "Unable to claim final generation atomically",
      });
      return finalInProgress();
    }

    const env = getRuntimeEnv();
    if (!env.OPENAI_API_KEY) {
      await markFinalFailed(orderId, "OPENAI_API_KEY missing");
      logFinalFailure({
        requestId,
        orderId,
        orderStatus: "final_generating",
        finalGenerationAttempts: (finalGenerationAttempts || 0) + 1,
        failureReason: "Missing OPENAI_API_KEY",
        envPresence: getRuntimeEnvPresence(),
      });
      return finalError(
        "Your payment is verified, but we couldn't finish the wallpaper generation. You will not be charged again. Please retry or contact support.",
        503,
      );
    }

    const input = inputFromDbOrder(claimableOrder);
    const prompt = buildFinalWallpaperPrompt(input);
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        prompt,
        size: getFinalImageSize(input),
        quality: "high",
        output_format: "png",
        moderation: "auto",
        n: 1,
      }),
    });

    if (!response.ok) {
      safeLog("OpenAI final generation failed", response.status);
      await markFinalFailed(orderId, `OpenAI failed with status ${response.status}`);
      return finalError(
        "Your payment is verified, but we couldn't finish the wallpaper generation. You will not be charged again. Please retry or contact support.",
        502,
      );
    }

    const result = (await response.json()) as OpenAIImageResponse;
    const image = result.data?.[0];
    const savedFinal = image?.b64_json
      ? await saveFinalImageFromBase64(orderId, image.b64_json, "image/png")
      : image?.url
        ? await saveRemoteFinalImage(orderId, image.url)
        : null;

    if (!savedFinal) {
      await markFinalFailed(orderId, "OpenAI returned no final image");
      return finalError(
        "Your payment is verified, but we couldn't finish the wallpaper generation. You will not be charged again. Please retry or contact support.",
        502,
      );
    }

    await markFinalGenerated(orderId, savedFinal.key);

    console.info("[generate-final]", {
      requestId,
      orderId,
      orderStatus: "final_generated",
      finalGenerationAttempts: (finalGenerationAttempts || 0) + 1,
      event: "final_ready",
    });

    return NextResponse.json({
      success: true,
      imageUrl: savedFinal.url,
      finalImageUrl: savedFinal.url,
      status: "ready",
      finalWidth: claimableOrder.width,
      finalHeight: claimableOrder.height,
      meta: getWallpaperMeta(input),
      reused: false,
    });
  } catch (error) {
    logFinalFailure({
      requestId,
      orderId,
      orderStatus,
      finalGenerationAttempts,
      failureReason: "Final generation failed",
      errorMessage: error instanceof Error ? error.message : "Unknown final error",
      envPresence: getRuntimeEnvPresence(),
    });

    if (orderId) {
      await markFinalFailed(orderId, "Unhandled final generation error").catch(() => {});
    }

    return finalError(
      "Your payment is verified, but we couldn't finish the wallpaper generation. You will not be charged again. Please retry or contact support.",
      500,
    );
  }
}

async function finalSuccess(
  r2Key: string,
  input: ReturnType<typeof inputFromDbOrder>,
  finalWidth: number,
  finalHeight: number,
  reused: boolean,
) {
  return NextResponse.json({
    success: true,
    status: "ready",
    imageUrl: `/api/wallpaper-image/${encodeURIComponent(r2Key)}`,
    finalImageUrl: `/api/wallpaper-image/${encodeURIComponent(r2Key)}`,
    finalWidth,
    finalHeight,
    meta: getWallpaperMeta(input),
    reused,
  });
}

function finalInProgress() {
  return NextResponse.json(
    {
      success: false,
      status: "generating",
      message: "Your wallpaper is still being created.",
      error: "Your wallpaper is still being created.",
    },
    { status: 202 },
  );
}

function finalStatusError(statusValue: string, message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      status: statusValue,
      message,
      error: message,
    },
    { status },
  );
}

async function saveRemoteFinalImage(orderId: string, url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  return saveFinalImage(orderId, bytes, contentType);
}

function logFinalFailure(details: {
  requestId: string;
  orderId?: string;
  orderStatus?: string;
  finalGenerationAttempts?: number;
  failureReason: string;
  errorMessage?: string;
  envPresence?: ReturnType<typeof getRuntimeEnvPresence>;
}) {
  console.error("[generate-final]", details);
}

function finalError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
    },
    { status },
  );
}
