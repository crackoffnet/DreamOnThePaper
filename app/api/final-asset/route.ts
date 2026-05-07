import { NextResponse } from "next/server";
import { getFinalAssetById, getOrder } from "@/lib/orders";
import { getImageResponse } from "@/lib/storage";
import { getRequestMetadata } from "@/lib/requestMetadata";
import {
  createDownloadEvent,
  patchOrderTracking,
  trackOrderEvent,
} from "@/lib/orderEvents";
import {
  getBearerToken,
  verifyResultOrFinalAccessToken,
} from "@/lib/resultAccessToken";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requestId = crypto.randomUUID();
  const requestMetadata = await getRequestMetadata(request);
  const assetId = url.searchParams.get("assetId") || "";
  const orderId = url.searchParams.get("orderId") || "";
  const tokenValue = url.searchParams.get("token") || "";

  if (!assetId || !orderId || (!tokenValue && !request.headers.get("authorization"))) {
    return assetError("Missing wallpaper access details.", 400, "FINAL_ASSET_BAD_REQUEST");
  }

  const verifiedToken = await verifyResultOrFinalAccessToken(
    tokenValue || getBearerToken(request),
  );
  console.info("[final-asset-auth]", {
    requestId,
    orderId,
    assetId,
    hasToken: Boolean(tokenValue || request.headers.get("authorization")),
    tokenValid: Boolean(verifiedToken),
    failureReason: verifiedToken ? undefined : "missing_or_invalid_token",
  });
  if (!verifiedToken) {
    return assetError(
      "This result link is no longer valid.",
      403,
      "RESULT_ACCESS_DENIED",
    );
  }

  const order = await getOrder(verifiedToken.orderId);
  if (!order) {
    console.warn("[final-asset]", {
      requestId,
      orderId: verifiedToken.orderId,
      assetId,
      failureReason: "Order not found",
    });
    return assetError("Wallpaper order was not found.", 404, "FINAL_ASSET_ORDER_NOT_FOUND");
  }

  if (
    order.id !== orderId ||
    order.stripe_session_id !== verifiedToken.sessionId ||
    !["paid", "final_generating", "final_generated", "failed"].includes(order.status)
  ) {
    console.warn("[final-asset]", {
      requestId,
      orderId: order.id,
      assetId,
      failureReason: "Token verification failed for order",
    });
    return assetError("This result link is no longer valid.", 403, "RESULT_ACCESS_DENIED");
  }

  const asset = await getFinalAssetById(order.id, assetId);
  if (!asset) {
    console.warn("[final-asset]", {
      requestId,
      orderId: order.id,
      assetId,
      failureReason: "Asset row missing",
      hasAssetRow: false,
      hasR2Object: false,
    });
    return assetError("The wallpaper file is not available.", 404, "FINAL_ASSET_NOT_FOUND");
  }

  const response = await getImageResponse(asset.r2_key);
  if (!response || response.status === 404) {
    console.warn("[final-asset]", {
      requestId,
      orderId: order.id,
      assetId,
      failureReason: "R2 object missing",
      hasAssetRow: true,
      hasR2Object: false,
    });
    return assetError("The wallpaper file is not available.", 404, "FINAL_ASSET_NOT_FOUND");
  }

  if (url.searchParams.get("download") === "1") {
    response.headers.set(
      "Content-Disposition",
      `attachment; filename="${filenameForAsset(asset.asset_type, order.id)}"`,
    );
  } else {
    response.headers.set("Content-Disposition", "inline");
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
  if (assetType === "tablet") return `dream-on-the-paper-tablet-${shortId}.png`;
  if (assetType === "desktop") return `dream-on-the-paper-desktop-${shortId}.png`;
  if (assetType === "custom") return `dream-on-the-paper-custom-${shortId}.png`;
  return `dream-on-the-paper-wallpaper-${shortId}.png`;
}

function assetError(message: string, status: number, code: string) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
    },
    { status },
  );
}
