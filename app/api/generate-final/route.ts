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
} from "@/lib/orders";
import { getRuntimeEnv, getRuntimeEnvPresence } from "@/lib/env";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { assertSameOrigin, safeLog } from "@/lib/security";
import { saveFinalAssetImage } from "@/lib/storage";
import {
  buildFinalAssetPrompt,
  buildFinalGenerationPlan,
  type FinalGenerationPlanItem,
} from "@/lib/finalGenerationPlan";
import { getWallpaperMeta } from "@/lib/wallpaper";
import { packages, type PackageId } from "@/lib/packages";
import type { FinalAssetResult } from "@/lib/types";
import { getRequestMetadata } from "@/lib/requestMetadata";
import { patchOrderTracking, trackOrderEvent } from "@/lib/orderEvents";
import { getImageGenerationConfig, type ImageQuality } from "@/lib/imageGenerationConfig";
import {
  getOpenAIImageDimensions,
  getOpenAIImageSize,
} from "@/lib/openaiImageSize";
import { readImageDimensions } from "@/lib/imageDimensions";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

type FinalImageConfig = {
  model: string;
  quality: ImageQuality;
  outputFormat: "png" | "jpeg" | "webp";
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
  const totalStartedAt = Date.now();
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

    const packageType: PackageId = "single";
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

    const claimablePackageType: PackageId = "single";
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
        const latestPackageType: PackageId = "single";
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
    logFinalTiming({
      requestId,
      orderId,
      packageType: claimablePackageType,
      step: "prompt_plan_built",
      durationMs: Date.now() - totalStartedAt,
      expectedAssets: plan.length,
    });
    const existingAssets = await getFinalAssets(orderId);
    const missingItems = plan.filter(
      (item) =>
        !existingAssets.some(
          (asset) =>
            asset.asset_type === item.assetType &&
            (asset.generation_status || "generated") === "generated",
        ),
    );

    const imageConfig = getImageGenerationConfig().final;
    const concurrency = 1;
    const assetResults = await runWithConcurrency(missingItems, concurrency, (item) =>
      generateFinalAsset({
        item,
        env,
        imageConfig,
        orderId: claimableOrder.id,
        requestId,
        packageType: claimablePackageType,
        promptHash: claimableOrder.prompt_hash,
      }),
    );
    const failedAssets = assetResults.filter((result) => result.status === "rejected");

    for (const result of assetResults) {
      if (result.status !== "fulfilled") {
        continue;
      }

      const { item, savedFinal } = result.value;
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

    if (failedAssets.length > 0) {
      safeLog("OpenAI final generation failed", failedAssets.length);
      await markFinalFailed(orderId, `${failedAssets.length} final asset(s) failed`);
      void trackOrderEvent({
        orderId,
        customerId: claimableOrder.customer_id || null,
        eventType: "final_generation_failed",
        statusBefore: "final_generating",
        statusAfter: "failed",
        packageType: claimablePackageType,
        requestMetadata,
        metadata: { requestId, failedAssets: failedAssets.length },
      });
      return finalError(
        "Your payment is verified, but we couldn't finish every wallpaper. You will not be charged again. Please retry missing assets.",
        502,
      );
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
      totalDurationMs: Date.now() - totalStartedAt,
    });
    logFinalTiming({
      requestId,
      orderId,
      packageType: claimablePackageType,
      step: "total_job_complete",
      durationMs: Date.now() - totalStartedAt,
      expectedAssets: plan.length,
      completedAssets: finalAssets.length,
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
    packageType: "single",
    wallpaperType: order.wallpaper_type || order.device,
    packageName: packages.single.name,
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
  const saved = await saveFinalAssetImage(orderId, assetType, bytes, contentType);
  return {
    ...saved,
    dimensions: readImageDimensions(bytes, contentType),
  };
}

async function generateFinalAsset(input: {
  item: FinalGenerationPlanItem;
  env: ReturnType<typeof getRuntimeEnv>;
  imageConfig: FinalImageConfig;
  orderId: string;
  requestId: string;
  packageType: PackageId;
  promptHash: string;
}) {
  const { item, env, imageConfig, orderId, requestId, packageType, promptHash } = input;
  const promptStartedAt = Date.now();
  const prompt = buildFinalAssetPrompt(item);
  logFinalTiming({
    requestId,
    orderId,
    packageType,
    step: "prompt_built",
    assetType: item.assetType,
    width: item.width,
    height: item.height,
    durationMs: Date.now() - promptStartedAt,
  });

  const openAiStartedAt = Date.now();
  const openAiSize = getOpenAIImageSize(item.width, item.height);
  logFinalTiming({
    requestId,
    orderId,
    packageType,
    step: "openai_start",
    assetType: item.assetType,
    width: item.width,
    height: item.height,
    model: imageConfig.model,
    quality: imageConfig.quality,
    openAiSize,
  });
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify({
      model: imageConfig.model,
      prompt,
      size: openAiSize,
      quality: imageConfig.quality,
      output_format: imageConfig.outputFormat,
      moderation: "auto",
      n: 1,
    }),
  });
  logFinalTiming({
    requestId,
    orderId,
    packageType,
    step: "openai_complete",
    assetType: item.assetType,
    width: item.width,
    height: item.height,
    quality: imageConfig.quality,
    model: imageConfig.model,
    openAiSize,
    durationMs: Date.now() - openAiStartedAt,
    providerStatus: response.status,
  });

  if (!response.ok) {
    throw new Error(`OpenAI failed with status ${response.status}`);
  }

  const result = (await response.json()) as OpenAIImageResponse;
  const image = result.data?.[0];
  let savedFinal: Awaited<ReturnType<typeof saveFinalAssetImage>> | null = null;
  let actualDimensions: { width: number; height: number } | null = null;

  if (image?.b64_json) {
    const decodeStartedAt = Date.now();
    const bytes = base64ToBytes(image.b64_json);
    actualDimensions = readImageDimensions(bytes, "image/png");
    logFinalTiming({
      requestId,
      orderId,
      packageType,
      step: "base64_decoded",
      assetType: item.assetType,
      durationMs: Date.now() - decodeStartedAt,
      bytes: bytes.byteLength,
    });

    const uploadStartedAt = Date.now();
    savedFinal = await saveFinalAssetImage(
      orderId,
      item.assetType,
      bytes,
      "image/png",
    );
    logFinalTiming({
      requestId,
      orderId,
      packageType,
      step: "r2_upload_complete",
      assetType: item.assetType,
      durationMs: Date.now() - uploadStartedAt,
      bytes: savedFinal.size,
    });
  } else if (image?.url) {
    const uploadStartedAt = Date.now();
    const remoteSaved = await saveRemoteFinalImage(orderId, item.assetType, image.url);
    savedFinal = remoteSaved;
    actualDimensions = remoteSaved?.dimensions || null;
    logFinalTiming({
      requestId,
      orderId,
      packageType,
      step: "remote_fetch_r2_upload_complete",
      assetType: item.assetType,
      durationMs: Date.now() - uploadStartedAt,
      bytes: savedFinal?.size,
    });
  }

  if (!savedFinal) {
    throw new Error("OpenAI returned no final image");
  }

  const d1StartedAt = Date.now();
  const resolvedDimensions =
    actualDimensions ||
    getOpenAIImageDimensions(openAiSize) || { width: item.width, height: item.height };
  await insertFinalAsset({
    orderId,
    assetType: item.assetType,
    width: resolvedDimensions.width,
    height: resolvedDimensions.height,
    r2Key: savedFinal.key,
    fileSizeBytes: savedFinal.size,
    promptHash,
  });
  logFinalTiming({
    requestId,
    orderId,
    packageType,
    step: "d1_asset_insert_complete",
    assetType: item.assetType,
    durationMs: Date.now() - d1StartedAt,
  });

  return { item, savedFinal };
}

async function runWithConcurrency<T, R>(
  items: T[],
  concurrency: number,
  worker: (item: T) => Promise<R>,
) {
  const results: PromiseSettledResult<R>[] = [];
  let nextIndex = 0;
  const workerCount = Math.max(1, Math.min(concurrency, items.length || 1));

  await Promise.all(
    Array.from({ length: workerCount }, async () => {
      while (nextIndex < items.length) {
        const currentIndex = nextIndex;
        nextIndex += 1;
        results[currentIndex] = await worker(items[currentIndex])
          .then((value) => ({ status: "fulfilled" as const, value }))
          .catch((reason) => ({ status: "rejected" as const, reason }));
      }
    }),
  );

  return results;
}

function base64ToBytes(content: string) {
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
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
  const plannedTypes = new Set(plan.map((item) => item.assetType));

  if (
    plan.every((item) =>
      assets.some(
        (asset) =>
          asset.asset_type === item.assetType &&
          (asset.generation_status || "generated") === "generated",
      ),
    )
  ) {
    return assets.filter(
      (asset) =>
        plannedTypes.has(asset.asset_type) &&
        (asset.generation_status || "generated") === "generated",
    );
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

  if (order.status === "final_generated") {
    const generated = assets.find(
      (asset) => (asset.generation_status || "generated") === "generated",
    );
    if (generated) {
      return [generated];
    }
  }

  return null;
}

function labelForAsset(assetType: string) {
  if (assetType === "mobile") return "Mobile wallpaper";
  if (assetType === "tablet") return "Tablet wallpaper";
  if (assetType === "desktop") return "Desktop wallpaper";
  if (assetType === "custom") return "Custom size wallpaper";
  return "Wallpaper";
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

function logFinalTiming(details: {
  requestId: string;
  orderId?: string;
  packageType?: string;
  step: string;
  assetType?: string;
  width?: number;
  height?: number;
  quality?: string;
  model?: string;
  openAiSize?: string;
  durationMs?: number;
  providerStatus?: number;
  expectedAssets?: number;
  completedAssets?: number;
  bytes?: number;
}) {
  console.info("[final-generation-timing]", details);
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
