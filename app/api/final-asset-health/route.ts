import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder } from "@/lib/orders";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { assertSameOrigin } from "@/lib/security";
import { resolveServableFinalAssets } from "@/lib/finalAssetState";
import type { PackageId } from "@/lib/packages";

const schema = z.object({
  finalGenerationToken: z.string().min(24).max(12000),
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

    const token = await verifyFinalGenerationToken(parsed.data.finalGenerationToken);
    if (!token) {
      return NextResponse.json(
        { success: false, state: "session_invalid", message: "This wallpaper access token is invalid." },
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
      order.prompt_hash !== token.promptHash ||
      order.stripe_session_id !== token.sessionId
    ) {
      return NextResponse.json(
        { success: false, state: "session_invalid", message: "Unable to verify this wallpaper order." },
        { status: 403 },
      );
    }

    const packageType: PackageId = "single";
    const resolved = await resolveServableFinalAssets(order, packageType);
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
