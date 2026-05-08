import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getOrdersColumns, hasTable } from "@/lib/dbSchema";
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
  const ordersColumns = bindings.DB ? await getOrdersColumns(bindings.DB) : new Set<string>();

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
        hasPresetId: ordersColumns.has("preset_id"),
        hasPreviewAssetKey: ordersColumns.has("preview_asset_key"),
        hasPreviewInputHash: ordersColumns.has("preview_input_hash"),
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
