import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getFinalAssetsSchemaSupport, getOrdersSchemaSupport } from "@/lib/dbSchema";

export async function GET() {
  const bindings = getOptionalCloudflareBindings();
  const orders = bindings.DB
    ? await getOrdersSchemaSupport(bindings.DB)
    : {
        hasPresetId: false,
        hasRatioLabel: false,
        hasSourceWidth: false,
        hasSourceHeight: false,
        hasFinalWidth: false,
        hasFinalHeight: false,
        hasOutputFormat: false,
        hasGenerationStatus: false,
        hasFinalAssetKey: false,
        hasPreviewAssetKey: false,
        hasPreviewInputHash: false,
        hasPreviewStale: false,
      };
  const finalAssets = bindings.DB
    ? await getFinalAssetsSchemaSupport(bindings.DB)
    : {
        exists: false,
        hasR2Key: false,
        hasGenerationStatus: false,
        hasFileSizeBytes: false,
        hasGenerationAttempt: false,
        hasPromptHash: false,
        hasUpdatedAt: false,
        hasSourceWidth: false,
        hasSourceHeight: false,
        hasFinalWidth: false,
        hasFinalHeight: false,
      };

  return NextResponse.json(
    {
      ok: Boolean(bindings.DB),
      orders: {
        hasPresetId: orders.hasPresetId,
        hasGenerationStatus: orders.hasGenerationStatus,
        hasFinalAssetKey: orders.hasFinalAssetKey,
        hasPreviewAssetKey: orders.hasPreviewAssetKey,
      },
      finalAssets: {
        exists: finalAssets.exists,
        hasGenerationStatus: finalAssets.hasGenerationStatus,
        hasR2Key: finalAssets.hasR2Key,
      },
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
