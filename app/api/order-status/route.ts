import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder, inputFromDbOrder } from "@/lib/orders";
import { assertSameOrigin } from "@/lib/security";
import { getWallpaperMeta } from "@/lib/wallpaper";
import { resolveServableFinalAssets } from "@/lib/finalAssetState";
import type { PackageId } from "@/lib/packages";
import {
  getBearerToken,
  verifyResultOrFinalAccessToken,
} from "@/lib/resultAccessToken";

const orderStatusSchema = z.object({
  resultAccessToken: z.string().min(24).max(12000).optional(),
  finalGenerationToken: z.string().min(24).max(12000).optional(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    if (!assertSameOrigin(request)) {
      return statusError("Request origin is not allowed.", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = orderStatusSchema.safeParse(body);

    if (!parsed.success || (!parsed.data.resultAccessToken && !parsed.data.finalGenerationToken && !request.headers.get("authorization"))) {
      return statusError("Please confirm payment before checking status.", 402);
    }

    const token = await verifyResultOrFinalAccessToken(
      parsed.data.resultAccessToken ||
        parsed.data.finalGenerationToken ||
        getBearerToken(request),
    );
    if (!token) {
      return statusError("This result link is no longer valid.", 403, "RESULT_ACCESS_DENIED");
    }

    const order = await getOrder(token.orderId);
    if (!order) {
      console.error("[order-status]", {
        requestId,
        orderId: token.orderId,
        failureReason: "Order missing in D1",
      });
      return statusError("We could not restore your wallpaper order.", 404);
    }

    if (
      order.stripe_session_id !== token.sessionId
    ) {
      console.error("[order-status]", {
        requestId,
        orderId: token.orderId,
        failureReason: "Token does not match D1 order",
      });
      return statusError("This result link is no longer valid.", 403, "RESULT_ACCESS_DENIED");
    }

    const packageType: PackageId = "single";
    const resolved = await resolveServableFinalAssets(order, packageType);
    const finalAssets = resolved.finalAssets;
    const finalImageUrl = resolved.finalImageUrl;
    const effectiveStatus =
      order.status === "final_generated" && !resolved.hasR2Object
        ? "failed"
        : order.status;
    const state =
      effectiveStatus === "failed"
        ? "final_failed_retryable"
        : effectiveStatus === "final_generating"
          ? "final_generating"
          : effectiveStatus === "paid"
            ? "payment_verified"
            : resolved.hasR2Object
              ? "final_generated"
              : "session_invalid";

    return NextResponse.json({
      success: true,
      status: effectiveStatus,
      state,
      hasFinalImage: resolved.hasR2Object,
      finalImageUrl,
      imageUrl: finalImageUrl,
      finalAssets,
      packageType,
      wallpaperType: order.wallpaper_type || order.device,
      expectedAssets: resolved.expectedAssets,
      completedAssets: resolved.completedAssets,
      failedAssets: resolved.inconsistent ? 1 : 0,
      finalWidth: finalAssets[0]?.width || undefined,
      finalHeight: finalAssets[0]?.height || undefined,
      meta: resolved.hasR2Object ? getWallpaperMeta(inputFromDbOrder(order)) : undefined,
      message:
        effectiveStatus === "failed"
          ? "Your payment is verified, but the final file is missing. Please retry generation."
          : undefined,
    });
  } catch (error) {
    console.error("[order-status]", {
      requestId,
      failureReason: "Order status failed",
      errorMessage: error instanceof Error ? error.message : "Unknown status error",
    });
    return statusError("Unable to check wallpaper status.", 500);
  }
}

function statusError(message: string, status = 400, code?: string) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
      error: message,
    },
    { status },
  );
}
