import { NextResponse } from "next/server";
import { z } from "zod";
import { getFinalAssets, getOrder, inputFromDbOrder } from "@/lib/orders";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { assertSameOrigin } from "@/lib/security";
import { getWallpaperMeta } from "@/lib/wallpaper";
import { buildFinalGenerationPlan } from "@/lib/finalGenerationPlan";
import type { PackageId } from "@/lib/packages";

const orderStatusSchema = z.object({
  finalGenerationToken: z.string().min(24).max(12000),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    if (!assertSameOrigin(request)) {
      return statusError("Request origin is not allowed.", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = orderStatusSchema.safeParse(body);

    if (!parsed.success) {
      return statusError("Please confirm payment before checking status.", 402);
    }

    const token = await verifyFinalGenerationToken(parsed.data.finalGenerationToken);
    if (!token) {
      return statusError("Please confirm payment before checking status.", 402);
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
      order.prompt_hash !== token.promptHash ||
      order.stripe_session_id !== token.sessionId
    ) {
      console.error("[order-status]", {
        requestId,
        orderId: token.orderId,
        failureReason: "Token does not match D1 order",
      });
      return statusError("Unable to verify this paid order.", 400);
    }

    const assets = await getFinalAssets(order.id);
    const packageType: PackageId = "single";
    const plan = buildFinalGenerationPlan(order, packageType);
    const plannedTypes = new Set(plan.map((item) => item.assetType));
    const expectedAssets = plan.length;
    const plannedAssets = assets.filter((asset) => plannedTypes.has(asset.asset_type));
    const completedAssets = plannedAssets.filter(
      (asset) => (asset.generation_status || "generated") === "generated",
    ).length;
    const failedAssets = plannedAssets.filter(
      (asset) => asset.generation_status === "failed",
    ).length;
    const finalAssets = plannedAssets.map((asset) => ({
      id: asset.id,
      assetType: asset.asset_type,
      label: labelForAsset(asset.asset_type),
      imageUrl: `/api/final-asset?assetId=${encodeURIComponent(asset.id)}`,
      width: asset.width,
      height: asset.height,
      format: "PNG" as const,
    }));
    const finalImageUrl =
      order.status === "final_generated" && order.final_r2_key
        ? `/api/wallpaper-image/${encodeURIComponent(order.final_r2_key)}`
        : finalAssets[0]?.imageUrl;

    return NextResponse.json({
      success: true,
      status: order.status,
      hasFinalImage: Boolean(finalImageUrl || finalAssets.length),
      finalImageUrl,
      imageUrl: finalImageUrl,
      finalAssets,
      packageType,
      wallpaperType: order.wallpaper_type || order.device,
      expectedAssets,
      completedAssets,
      failedAssets,
      finalWidth: finalAssets[0]?.width || (finalImageUrl ? order.width : undefined),
      finalHeight: finalAssets[0]?.height || (finalImageUrl ? order.height : undefined),
      meta: finalImageUrl ? getWallpaperMeta(inputFromDbOrder(order)) : undefined,
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

function labelForAsset(assetType: string) {
  if (assetType === "mobile") return "Mobile wallpaper";
  if (assetType === "tablet") return "Tablet wallpaper";
  if (assetType === "desktop") return "Desktop wallpaper";
  if (assetType === "custom") return "Custom size wallpaper";
  return "Wallpaper";
}

function statusError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
    },
    { status },
  );
}
