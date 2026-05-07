import { NextResponse } from "next/server";
import { z } from "zod";
import {
  type DbOrder,
  type FinalAsset,
  getOrder,
  inputFromDbOrder,
  insertFinalAsset,
  markFinalFailed,
  markFinalGenerated,
  reopenPaidFinalOrder,
  resetFailedFinalGeneration,
  resetStaleFinalGeneration,
  startFinalGeneration,
} from "@/lib/orders";
import { getRuntimeEnv, getRuntimeEnvPresence } from "@/lib/env";
import { assertSameOrigin, safeLog } from "@/lib/security";
import { saveFinalAssetImage, saveFinalSourceImage } from "@/lib/storage";
import {
  assetToResult,
  resolveServableFinalAssets,
} from "@/lib/finalAssetState";
import {
  getBearerToken,
  verifyResultOrFinalAccessToken,
} from "@/lib/resultAccessToken";
import {
  buildFinalAssetPrompt,
  buildFinalGenerationPlan,
  type FinalGenerationPlanItem,
} from "@/lib/finalGenerationPlan";
import { getWallpaperMeta } from "@/lib/wallpaper";
import { packages, type PackageId } from "@/lib/packages";
import { getRequestMetadata } from "@/lib/requestMetadata";
import { patchOrderTracking, trackOrderEvent } from "@/lib/orderEvents";
import { getImageGenerationConfig, type ImageQuality } from "@/lib/imageGenerationConfig";
import { detectSourceImageSize, renderFinalWallpaper } from "@/lib/imageProcessing";

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
    resultAccessToken: z.string().min(24).max(12000).optional(),
    finalGenerationToken: z.string().min(24).max(12000).optional(),
    orderToken: z.string().min(24).max(12000).optional(),
  })
  .transform((input) => ({
    accessToken:
      input.resultAccessToken || input.finalGenerationToken || input.orderToken || "",
  }))
  .refine((input) => input.accessToken.length >= 24, {
    message: "Please confirm payment before generating.",
    path: ["resultAccessToken"],
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
      logFinalFailure({ requestId, failureReason: "Missing result access token" });
      return finalError("Please confirm payment before generating.", 402);
    }

    const token = await verifyResultOrFinalAccessToken(
      parsed.data.accessToken || getBearerToken(request),
    );
    if (!token) {
      logFinalFailure({
        requestId,
        failureReason: "Invalid or expired result access token",
      });
      return finalError("This result link is no longer valid.", 403, "session_invalid");
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
      order.stripe_session_id !== token.sessionId
    ) {
      logFinalFailure({
        requestId,
        orderId,
        orderStatus,
        finalGenerationAttempts,
        failureReason: "Final token does not match D1 order",
      });
      return finalError("This result link is no longer valid.", 403, "session_invalid");
    }

    const packageType: PackageId = "single";
    const readyAssets = await getReadyAssets(order, packageType);
    if (readyAssets.assets.length > 0) {
      console.info("[generate-final]", {
        requestId,
        orderId,
        orderStatus,
        finalGenerationAttempts,
        event: "existing_final_returned",
      });
      return finalAssetsSuccess(order, readyAssets.assets, true);
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

    if (
      order.status === "final_generated" &&
      readyAssets.inconsistent &&
      order.stripe_payment_status === "paid"
    ) {
      const reopened = await reopenPaidFinalOrder(orderId);
      console.warn("[final-generation]", {
        requestId,
        orderId,
        wallpaperType: order.wallpaper_type || order.device,
        step: "reopen_missing_final_asset_order",
        status: reopened ? "reopened" : "skipped",
      });
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
    if (claimableReadyAssets.assets.length > 0) {
      return finalAssetsSuccess(claimableOrder, claimableReadyAssets.assets, true);
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

      if (latest?.status === "final_generated") {
        const latestPackageType: PackageId = "single";
        const latestAssets = await getReadyAssets(latest, latestPackageType);
        if (latestAssets.assets.length > 0) {
          return finalAssetsSuccess(latest, latestAssets.assets, true);
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
    const existingAssets = await getReadyAssets(
      claimableOrder,
      claimablePackageType,
    );
    const missingItems = plan.filter(
      (item) =>
        !existingAssets.assets.some(
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
          width: item.finalWidth,
          height: item.finalHeight,
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
        "final_failed_retryable",
      );
    }

    const resolvedFinalAssets = await getReadyAssets(claimableOrder, claimablePackageType);
    const finalAssets = resolvedFinalAssets.assets;
    const firstAsset = resolvedFinalAssets.primaryAsset;
    if (!firstAsset || finalAssets.length === 0) {
      await markFinalFailed(orderId, "Generated wallpaper file was missing after save");
      console.error("[final-generation]", {
        requestId,
        orderId,
        wallpaperType: claimableOrder.wallpaper_type || claimableOrder.device,
        step: "final_asset_missing_after_save",
        status: "failed",
      });
      return finalStatusError(
        "failed",
        "Your payment was received, but the final image could not be completed successfully. Please retry without paying again.",
        500,
        "final_failed_retryable",
      );
    }
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
      "final_failed_retryable",
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
  const meta = getWallpaperMeta(input);

  return NextResponse.json({
    success: true,
    status: "ready",
    imageUrl: primary?.imageUrl,
    finalImageUrl: primary?.imageUrl,
    finalWidth: primary?.width,
    finalHeight: primary?.height,
    selectedLabel: meta.selectedLabel,
    ratioLabel: meta.ratioLabel,
    outputFormat: "PNG",
    finalUrl: primary?.imageUrl,
    finalAssets,
    packageType: "single",
    wallpaperType: order.wallpaper_type || order.device,
    packageName: packages.single.name,
    meta,
    reused,
  });
}

function finalInProgress() {
  return NextResponse.json(
    {
      success: false,
      status: "generating",
      state: "final_generating",
      message: "Your wallpaper is still being created.",
      error: "Your wallpaper is still being created.",
    },
    { status: 202 },
  );
}

function finalStatusError(
  statusValue: string,
  message: string,
  status = 400,
  state = "final_failed_retryable",
) {
  return NextResponse.json(
    {
      success: false,
      status: statusValue,
      state,
      message,
      error: message,
    },
    { status },
  );
}

async function saveRemoteFinalImage(
  orderId: string,
  assetType: string,
  url: string,
  finalWidth: number,
  finalHeight: number,
  modelSize: string,
) {
  const response = await fetch(url);

  if (!response.ok) {
    return null;
  }

  const bytes = new Uint8Array(await response.arrayBuffer());
  const contentType = response.headers.get("content-type") || "image/png";
  const sourceDimensions = detectSourceImageSize(
    bytes,
    modelSizeToDimensions(modelSize),
    contentType,
  );
  await saveFinalSourceImage(orderId, assetType, bytes, "image/png");
  const rendered = await renderFinalWallpaper(bytes, {
    width: finalWidth,
    height: finalHeight,
  });
  const saved = await saveFinalAssetImage(
    orderId,
    assetType,
    rendered.bytes,
    rendered.contentType,
  );
  return {
    savedFinal: saved,
    sourceDimensions,
    finalDimensions: {
      width: rendered.width,
      height: rendered.height,
    },
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
    width: item.finalWidth,
    height: item.finalHeight,
    durationMs: Date.now() - promptStartedAt,
  });

  const openAiStartedAt = Date.now();
  const openAiSize = item.modelSize;
  logFinalTiming({
    requestId,
    orderId,
    packageType,
    step: "openai_start",
    assetType: item.assetType,
    width: item.finalWidth,
    height: item.finalHeight,
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
    width: item.finalWidth,
    height: item.finalHeight,
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
  let sourceDimensions: { width: number; height: number } | null = null;
  let finalDimensions: { width: number; height: number } | null = null;

  if (image?.b64_json) {
    const decodeStartedAt = Date.now();
    const bytes = base64ToBytes(image.b64_json);
    sourceDimensions = detectSourceImageSize(bytes, modelSizeToDimensions(openAiSize));
    logFinalTiming({
      requestId,
      orderId,
      packageType,
      step: "base64_decoded",
      assetType: item.assetType,
      durationMs: Date.now() - decodeStartedAt,
      bytes: bytes.byteLength,
    });

    await saveFinalSourceImage(orderId, item.assetType, bytes, "image/png");

    const resizeStartedAt = Date.now();
    const rendered = await renderFinalWallpaper(bytes, {
      width: item.finalWidth,
      height: item.finalHeight,
    });
    finalDimensions = {
      width: rendered.width,
      height: rendered.height,
    };
    logFinalTiming({
      requestId,
      orderId,
      packageType,
      step: "final_resize_complete",
      assetType: item.assetType,
      durationMs: Date.now() - resizeStartedAt,
      bytes: rendered.bytes.byteLength,
    });

    const uploadStartedAt = Date.now();
    savedFinal = await saveFinalAssetImage(
      orderId,
      item.assetType,
      rendered.bytes,
      rendered.contentType,
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
    const remoteSaved = await saveRemoteFinalImage(
      orderId,
      item.assetType,
      image.url,
      item.finalWidth,
      item.finalHeight,
      item.modelSize,
    );
    savedFinal = remoteSaved?.savedFinal || null;
    sourceDimensions = remoteSaved?.sourceDimensions || null;
    finalDimensions = remoteSaved?.finalDimensions || null;
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
  const resolvedDimensions = finalDimensions || {
    width: item.finalWidth,
    height: item.finalHeight,
  };
  await insertFinalAsset({
    orderId,
    assetType: item.assetType,
    width: resolvedDimensions.width,
    height: resolvedDimensions.height,
    r2Key: savedFinal.key,
    fileSizeBytes: savedFinal.size,
    promptHash,
  });
  await patchOrderTracking(orderId, {
    wallpaper_type: item.wallpaperType,
    preset_id: item.presetId,
    ratio_label: item.ratioLabel,
    source_width: sourceDimensions?.width || null,
    source_height: sourceDimensions?.height || null,
    final_width: resolvedDimensions.width,
    final_height: resolvedDimensions.height,
    output_format: "png",
    generation_status: "generated",
    final_asset_key: savedFinal.key,
    final_r2_key: savedFinal.key,
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

async function getReadyAssets(order: DbOrder, packageType: PackageId) {
  return resolveServableFinalAssets(order, packageType);
}

function modelSizeToDimensions(size: string) {
  if (size === "1024x1536") {
    return { width: 1024, height: 1536 };
  }
  if (size === "1536x1024") {
    return { width: 1536, height: 1024 };
  }
  return { width: 1024, height: 1024 };
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
  console.error("[final-generation-error]", details);
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

function finalError(message: string, status = 400, state = "final_failed_retryable") {
  return NextResponse.json(
    {
      success: false,
      state,
      message,
      error: message,
    },
    { status },
  );
}
