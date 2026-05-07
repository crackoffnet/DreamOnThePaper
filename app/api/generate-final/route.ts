import { NextResponse } from "next/server";
import { z } from "zod";
import {
  type DbOrder,
  type FinalAsset,
  getOrder,
  getFinalAssets,
  inputFromDbOrder,
  insertFinalAsset,
  markFinalFailed,
  markFinalGenerated,
  resetFailedFinalGeneration,
  resetStaleFinalGeneration,
  startFinalGeneration,
  updateOrderStatus,
} from "@/lib/orders";
import { getRuntimeEnv, getRuntimeEnvPresence } from "@/lib/env";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { assertSameOrigin, safeLog } from "@/lib/security";
import { saveFinalAssetImage, saveFinalAssetImageFromBase64 } from "@/lib/storage";
import { buildFinalAssetPrompt, buildFinalGenerationPlan } from "@/lib/finalGenerationPlan";
import { getFinalImageSize, getWallpaperMeta } from "@/lib/wallpaper";
import { packages, type PackageId } from "@/lib/packages";
import type { FinalAssetResult } from "@/lib/types";
import { getRequestMetadata } from "@/lib/requestMetadata";
import { patchOrderTracking, trackOrderEvent } from "@/lib/orderEvents";

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
  const requestMetadata = await getRequestMetadata(request);
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

    const packageType = (order.package_type || token.packageId || "single") as PackageId;
    const readyAssets = await getReadyAssets(order, packageType);
    if (readyAssets) {
      console.info("[generate-final]", {
        requestId,
        orderId,
        orderStatus,
        finalGenerationAttempts,
        event: "existing_final_returned",
      });
      return finalAssetsSuccess(order, readyAssets, true);
    }

    if (
      order.status === "final_generated" &&
      order.stripe_payment_status === "paid" &&
      packages[packageType].finalAssetCount > 1
    ) {
      await updateOrderStatus(orderId, "paid");
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

    const claimablePackageType = (claimableOrder.package_type ||
      token.packageId ||
      "single") as PackageId;
    const claimableReadyAssets = await getReadyAssets(
      claimableOrder,
      claimablePackageType,
    );
    if (claimableReadyAssets) {
      return finalAssetsSuccess(claimableOrder, claimableReadyAssets, true);
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
        const latestPackageType = (latest.package_type ||
          token.packageId ||
          "single") as PackageId;
        const latestAssets = await getReadyAssets(latest, latestPackageType);
        if (latestAssets) {
          return finalAssetsSuccess(latest, latestAssets, true);
        }
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
    void trackOrderEvent({
      orderId,
      customerId: claimableOrder.customer_id || null,
      eventType: "final_generation_started",
      statusBefore: "paid",
      statusAfter: "final_generating",
      packageType: claimablePackageType,
      requestMetadata,
      metadata: { requestId, expectedAssets: packages[claimablePackageType].finalAssetCount },
    });

    const env = getRuntimeEnv();
    if (!env.OPENAI_API_KEY) {
      await markFinalFailed(orderId, "OPENAI_API_KEY missing");
      void trackOrderEvent({
        orderId,
        customerId: claimableOrder.customer_id || null,
        eventType: "final_generation_failed",
        statusBefore: "final_generating",
        statusAfter: "failed",
        packageType: claimablePackageType,
        requestMetadata,
        metadata: { requestId, reason: "missing_openai_key" },
      });
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

    const plan = buildFinalGenerationPlan(claimableOrder, claimablePackageType);
    const existingAssets = await getFinalAssets(orderId);
    const missingItems = plan.filter(
      (item) =>
        !existingAssets.some((asset) => asset.asset_type === item.assetType),
    );

    for (const item of missingItems) {
      const prompt = buildFinalAssetPrompt(item);
      const response = await fetch("https://api.openai.com/v1/images/generations", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
          prompt,
          size: getOpenAiSizeForAsset(item.input),
          quality: "high",
          output_format: "png",
          moderation: "auto",
          n: 1,
        }),
      });

      if (!response.ok) {
        safeLog("OpenAI final generation failed", response.status);
        await markFinalFailed(orderId, `OpenAI failed with status ${response.status}`);
        void trackOrderEvent({
          orderId,
          customerId: claimableOrder.customer_id || null,
          eventType: "final_generation_failed",
          statusBefore: "final_generating",
          statusAfter: "failed",
          packageType: claimablePackageType,
          requestMetadata,
          metadata: { requestId, providerStatus: response.status },
        });
        return finalError(
          "Your payment is verified, but we couldn't finish the wallpaper generation. You will not be charged again. Please retry or contact support.",
          502,
        );
      }

      const result = (await response.json()) as OpenAIImageResponse;
      const image = result.data?.[0];
      const savedFinal = image?.b64_json
        ? await saveFinalAssetImageFromBase64(
            orderId,
            item.assetType,
            image.b64_json,
            "image/png",
          )
        : image?.url
          ? await saveRemoteFinalImage(orderId, item.assetType, image.url)
          : null;

      if (!savedFinal) {
        await markFinalFailed(orderId, "OpenAI returned no final image");
        void trackOrderEvent({
          orderId,
          customerId: claimableOrder.customer_id || null,
          eventType: "final_generation_failed",
          statusBefore: "final_generating",
          statusAfter: "failed",
          packageType: claimablePackageType,
          requestMetadata,
          metadata: { requestId, reason: "no_final_image" },
        });
        return finalError(
          "Your payment is verified, but we couldn't finish the wallpaper generation. You will not be charged again. Please retry or contact support.",
          502,
        );
      }

      await insertFinalAsset({
        orderId,
        assetType: item.assetType,
        width: item.width,
        height: item.height,
        r2Key: savedFinal.key,
        fileSizeBytes: savedFinal.size,
        promptHash: claimableOrder.prompt_hash,
      });
      void trackOrderEvent({
        orderId,
        customerId: claimableOrder.customer_id || null,
        eventType: "final_asset_generated",
        statusAfter: "final_generating",
        packageType: claimablePackageType,
        requestMetadata,
        metadata: {
          requestId,
          assetType: item.assetType,
          width: item.width,
          height: item.height,
          fileSizeBytes: savedFinal.size,
        },
      });
    }

    const finalAssets = await getFinalAssets(orderId);
    const firstAsset = finalAssets[0];
    await markFinalGenerated(orderId, firstAsset?.r2_key || "");
    void patchOrderTracking(orderId, {
      final_generated_at: Date.now(),
      final_failure_reason: null,
      final_failed_at: null,
    });
    void trackOrderEvent({
      orderId,
      customerId: claimableOrder.customer_id || null,
      eventType: "final_generation_completed",
      statusBefore: "final_generating",
      statusAfter: "final_generated",
      packageType: claimablePackageType,
      requestMetadata,
      metadata: { requestId, assetCount: finalAssets.length },
    });

    console.info("[generate-final]", {
      requestId,
      orderId,
      orderStatus: "final_generated",
      finalGenerationAttempts: (finalGenerationAttempts || 0) + 1,
      event: "final_ready",
    });

    return finalAssetsSuccess(
      { ...claimableOrder, final_r2_key: firstAsset?.r2_key || null },
      finalAssets,
      false,
    );
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
      void trackOrderEvent({
        orderId,
        eventType: "final_generation_failed",
        statusBefore: orderStatus,
        statusAfter: "failed",
        requestMetadata,
        metadata: { requestId, reason: "unhandled_final_error" },
      });
    }

    return finalError(
      "Your payment is verified, but we couldn't finish the wallpaper generation. You will not be charged again. Please retry or contact support.",
      500,
    );
  }
}

async function finalAssetsSuccess(
  order: DbOrder,
  assets: FinalAsset[],
  reused: boolean,
) {
  const input = inputFromDbOrder(order);
  const finalAssets = assets.map((asset) => assetToResult(asset));
  const primary = finalAssets[0];

  return NextResponse.json({
    success: true,
    status: "ready",
    imageUrl: primary?.imageUrl,
    finalImageUrl: primary?.imageUrl,
    finalWidth: primary?.width,
    finalHeight: primary?.height,
    finalAssets,
    packageType: order.package_type || "single",
    packageName: packages[(order.package_type || "single") as PackageId].name,
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

async function saveRemoteFinalImage(orderId: string, assetType: string, url: string) {
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  return saveFinalAssetImage(orderId, assetType, bytes, contentType);
}

function assetToResult(asset: FinalAsset): FinalAssetResult {
  return {
    id: asset.id,
    assetType: asset.asset_type,
    label: labelForAsset(asset.asset_type),
    imageUrl: `/api/final-asset?assetId=${encodeURIComponent(asset.id)}`,
    width: asset.width,
    height: asset.height,
    format: "PNG",
  };
}

async function getReadyAssets(order: DbOrder, packageType: PackageId) {
  const plan = buildFinalGenerationPlan(order, packageType);
  const assets = await getFinalAssets(order.id);

  if (
    plan.every((item) =>
      assets.some((asset) => asset.asset_type === item.assetType),
    )
  ) {
    return assets;
  }

  if (
    assets.length === 0 &&
    order.final_r2_key &&
    packageType === "single"
  ) {
    return [
      {
        id: `legacy-${order.id}`,
        order_id: order.id,
        asset_type: "single",
        width: order.width,
        height: order.height,
        r2_key: order.final_r2_key,
        format: "png",
        created_at: order.final_generated_at || order.updated_at,
      } satisfies FinalAsset,
    ];
  }

  return null;
}

function labelForAsset(assetType: string) {
  if (assetType === "mobile") return "Mobile wallpaper";
  if (assetType === "desktop") return "Desktop wallpaper";
  if (assetType === "version_1") return "Version 1";
  if (assetType === "version_2") return "Version 2";
  if (assetType === "version_3") return "Version 3";
  return "Wallpaper";
}

function getOpenAiSizeForAsset(input: ReturnType<typeof inputFromDbOrder>) {
  return getFinalImageSize(input);
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
