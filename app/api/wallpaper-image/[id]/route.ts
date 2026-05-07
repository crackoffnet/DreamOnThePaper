import { getFinalAsset, getOrder } from "@/lib/orders";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { getImageResponse } from "@/lib/storage";
import { getRequestMetadata } from "@/lib/requestMetadata";
import {
  createDownloadEvent,
  patchOrderTracking,
  trackOrderEvent,
} from "@/lib/orderEvents";

type WallpaperImageRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: WallpaperImageRouteProps) {
  const { id } = await params;
  const r2Key = decodeURIComponent(id);
  const requestId = crypto.randomUUID();
  const requestMetadata = await getRequestMetadata(request);

  if (!r2Key.startsWith("finals/")) {
    return getImageResponse(r2Key);
  }

  const tokenValue = new URL(request.url).searchParams.get("token") || "";
  if (!tokenValue) {
    return new Response("Download token is required.", {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const token = await verifyFinalGenerationToken(tokenValue);
  if (!token) {
    return new Response("This download link has expired.", {
      status: 410,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const order = await getOrder(token.orderId);
  const finalAsset = order ? await getFinalAsset(order.id, r2Key) : null;
  if (
    !order ||
    order.status !== "final_generated" ||
    order.prompt_hash !== token.promptHash ||
    (!finalAsset && order.final_r2_key !== r2Key)
  ) {
    return new Response("Wallpaper not found.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const response = await getImageResponse(r2Key);
  if (!response || response.status === 404) {
    console.warn("[final-asset]", {
      requestId,
      orderId: order.id,
      failureReason: "Legacy wallpaper-image route missing R2 object",
      hasAssetRow: Boolean(finalAsset),
      hasR2Object: false,
    });
    return new Response("Wallpaper not found.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }
  void createDownloadEvent({
    orderId: order.id,
    customerId: order.customer_id || null,
    assetId: finalAsset?.id || null,
    assetType: finalAsset?.asset_type || "single",
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
      legacyRoute: true,
      assetType: finalAsset?.asset_type || "single",
    },
  });
  return response;
}
