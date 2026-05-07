import { NextResponse } from "next/server";
import { getFinalAssetById, getOrder } from "@/lib/orders";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { getImageResponse } from "@/lib/storage";
import { getRequestMetadata } from "@/lib/requestMetadata";
import {
  createDownloadEvent,
  patchOrderTracking,
  trackOrderEvent,
} from "@/lib/orderEvents";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestMetadata = await getRequestMetadata(request);
  const assetId = url.searchParams.get("assetId") || "";
  const tokenValue = url.searchParams.get("token") || "";

  if (!assetId || !tokenValue) {
    return assetError("Missing wallpaper access details.", 400);
  }

  const token = await verifyFinalGenerationToken(tokenValue);
  if (!token) {
    return assetError("This wallpaper link is expired or invalid.", 403);
  }

  const order = await getOrder(token.orderId);
  if (!order) {
    return assetError("Wallpaper order was not found.", 404);
  }

  if (
    order.prompt_hash !== token.promptHash ||
    order.stripe_session_id !== token.sessionId ||
    order.status !== "final_generated"
  ) {
    return assetError("Unable to verify this wallpaper.", 403);
  }

  const asset = await getFinalAssetById(order.id, assetId);
  if (!asset) {
    return assetError("Wallpaper file was not found.", 404);
  }

  const response = await getImageResponse(asset.r2_key);
  if (!response || response.status === 404) {
    return assetError("Wallpaper file was not found.", 404);
  }

  if (url.searchParams.get("download") === "1") {
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="${filenameForAsset(asset.asset_type, order.id)}"`,
    );
  }
  response.headers.set("Cache-Control", "private, no-store");
  void createDownloadEvent({
    orderId: order.id,
    customerId: order.customer_id || null,
    assetId: asset.id,
    assetType: asset.asset_type,
    requestMetadata,
  });
  void patchOrderTracking(order.id, {
    download_count: (order.download_count || 0) + 1,
    first_downloaded_at: order.download_count ? undefined : new Date().toISOString(),
    last_downloaded_at: new Date().toISOString(),
  });
  void trackOrderEvent({
    orderId: order.id,
    customerId: order.customer_id || null,
    eventType: "download_started",
    packageType: order.package_type || undefined,
    requestMetadata,
    metadata: {
      assetId: asset.id,
      assetType: asset.asset_type,
      download: url.searchParams.get("download") === "1",
    },
  });
  return response;
}

function filenameForAsset(assetType: string, orderId: string) {
  const shortId = orderId.slice(0, 8);
  if (assetType === "mobile") return `dream-on-the-paper-mobile-${shortId}.png`;
  if (assetType === "desktop") return `dream-on-the-paper-desktop-${shortId}.png`;
  if (assetType === "version_1") return `dream-on-the-paper-version-1-${shortId}.png`;
  if (assetType === "version_2") return `dream-on-the-paper-version-2-${shortId}.png`;
  if (assetType === "version_3") return `dream-on-the-paper-version-3-${shortId}.png`;
  return `dream-on-the-paper-wallpaper-${shortId}.png`;
}

function assetError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
    },
    { status },
  );
}
