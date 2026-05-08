import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import {
  getFinalAssetsSchemaSupport,
  getOrdersSchemaSupport,
  hasTable,
} from "@/lib/dbSchema";
import { getRuntimeEnv } from "@/lib/env";

export async function GET() {
  const env = getRuntimeEnv();
  const bindings = getOptionalCloudflareBindings();
  const hasPreviewEntitlementsTable = bindings.DB
    ? await hasTable(bindings.DB, "preview_entitlements")
    : false;
  const hasBrowserSessionsTable = bindings.DB
    ? await hasTable(bindings.DB, "browser_sessions")
    : false;
  const hasPreviewAttemptsTable = bindings.DB
    ? await hasTable(bindings.DB, "preview_attempts")
    : false;
  const ordersSchema = bindings.DB
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
  const finalAssetsSchema = bindings.DB
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
      ok: Boolean(
        env.OPENAI_API_KEY &&
          bindings.DB &&
          bindings.WALLPAPER_BUCKET &&
          bindings.DREAM_RATE_LIMITS,
      ),
      hasOpenAiKey: Boolean(env.OPENAI_API_KEY),
      hasDb: Boolean(bindings.DB),
      hasWallpaperBucket: Boolean(bindings.WALLPAPER_BUCKET),
      hasRateLimitKv: Boolean(bindings.DREAM_RATE_LIMITS),
      previewTrackingEnabled: Boolean(
        bindings.DB && hasPreviewEntitlementsTable && hasBrowserSessionsTable && hasPreviewAttemptsTable,
      ),
      abuseRateLimitEnabled: Boolean(bindings.DREAM_RATE_LIMITS),
      ordersColumns: {
        hasPresetId: ordersSchema.hasPresetId,
        hasPreviewAssetKey: ordersSchema.hasPreviewAssetKey,
        hasPreviewInputHash: ordersSchema.hasPreviewInputHash,
      },
      finalAssets: {
        exists: finalAssetsSchema.exists,
        hasGenerationStatus: finalAssetsSchema.hasGenerationStatus,
        hasR2Key: finalAssetsSchema.hasR2Key,
      },
      supportedImageSizes: ["1024x1024", "1024x1536", "1536x1024", "auto"],
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
