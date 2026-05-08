import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder, markFinalGenerated } from "@/lib/orders";
import { assertSameOrigin } from "@/lib/security";
import { resolveServableFinalAssets } from "@/lib/finalAssetState";
import type { PackageId } from "@/lib/packages";
import {
  getBearerToken,
  verifyResultOrFinalAccessToken,
} from "@/lib/resultAccessToken";

const schema = z.object({
  resultAccessToken: z.string().min(24).max(12000).optional(),
  finalGenerationToken: z.string().min(24).max(12000).optional(),
  orderId: z.string().min(8).max(120).optional(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json(
        { success: false, message: "Request origin is not allowed." },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => null);
    const parsed = schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { success: false, state: "session_invalid", message: "Missing final wallpaper access token." },
        { status: 400 },
      );
    }

    const tokenValue =
      parsed.data.resultAccessToken ||
      parsed.data.finalGenerationToken ||
      getBearerToken(request);
    const token = tokenValue
      ? await verifyResultOrFinalAccessToken(tokenValue)
      : null;
    console.info("[final-asset-health]", {
      requestId,
      orderId: parsed.data.orderId,
      hasAuthHeader: Boolean(request.headers.get("authorization")),
      tokenValid: Boolean(token),
      failureReason: token ? undefined : "missing_or_invalid_token",
    });
    if (!token) {
      return NextResponse.json(
        {
          success: false,
          code: "RESULT_ACCESS_DENIED",
          state: "session_invalid",
          message: "This result link is no longer valid.",
        },
        { status: 403 },
      );
    }

    const order = await getOrder(token.orderId);
    if (!order) {
      return NextResponse.json(
        { success: false, state: "session_invalid", message: "Wallpaper order was not found." },
        { status: 404 },
      );
    }

    if (
      order.id !== (parsed.data.orderId || order.id) ||
      order.stripe_session_id !== token.sessionId
    ) {
      return NextResponse.json(
        {
          success: false,
          code: "RESULT_ACCESS_DENIED",
          state: "session_invalid",
          message: "This result link is no longer valid.",
        },
        { status: 403 },
      );
    }

    const packageType: PackageId = "single";
    const resolved = await resolveServableFinalAssets(order, packageType);
    if (resolved.primaryAsset?.r2_key && resolved.hasR2Object && order.status !== "final_generated") {
      await markFinalGenerated(order.id, resolved.primaryAsset.r2_key).catch((error) => {
        console.warn("[final-asset-health]", {
          requestId,
          orderId: order.id,
          failureReason: "Recover final_generated status failed",
          errorMessage: error instanceof Error ? error.message : "Unknown recovery error",
        });
      });
    }

    const primary = resolved.primaryAsset;
    const effectiveStatus =
      order.status === "final_generated" && !resolved.hasR2Object
        ? "failed"
        : order.status;
    const state = resolveFinalAssetState(effectiveStatus, resolved.hasR2Object);

    console.info("[result-page]", {
      orderId: order.id,
      paymentVerified: order.stripe_payment_status === "paid",
      hasFinalAssetRow: resolved.hasFinalAssetRow,
      hasR2Object: resolved.hasR2Object,
      finalStatus: state,
    });

    return NextResponse.json({
      success: true,
      state,
      orderStatus: effectiveStatus,
      hasFinalAssetRow: resolved.hasFinalAssetRow,
      finalAssetCount: resolved.finalAssets.length,
      hasR2Object: resolved.hasR2Object,
      assetId: primary?.id || null,
      assetType: primary?.asset_type || null,
      width: primary?.width || null,
      height: primary?.height || null,
    });
  } catch (error) {
    console.error("[final-asset-health]", {
      requestId,
      failureReason: "Final asset health check failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    return NextResponse.json(
      { success: false, state: "session_invalid", message: "Unable to verify final wallpaper health." },
      { status: 500 },
    );
  }
}

function resolveFinalAssetState(orderStatus: string, hasR2Object: boolean) {
  if (hasR2Object) {
    return "final_generated";
  }

  if (orderStatus === "pending_payment" || orderStatus === "preview_created" || orderStatus === "draft") {
    return "payment_pending";
  }

  if (orderStatus === "paid") {
    return "payment_verified";
  }

  if (orderStatus === "final_generating") {
    return "final_generating";
  }

  if (orderStatus === "failed" || orderStatus === "final_generated") {
    return "final_failed_retryable";
  }

  return "session_invalid";
}
