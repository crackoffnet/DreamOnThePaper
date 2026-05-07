import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";

export async function GET() {
  const env = getRuntimeEnv();
  const bindings = getOptionalCloudflareBindings();
  const hasPreviewEntitlementsTable = await hasTable(
    bindings.DB,
    "preview_entitlements",
  );
  const hasBrowserSessionsTable = await hasTable(bindings.DB, "browser_sessions");
  const hasPreviewAttemptsTable = await hasTable(bindings.DB, "preview_attempts");

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

async function hasTable(
  db: D1Database | undefined,
  tableName: string,
) {
  if (!db) {
    return false;
  }

  try {
    const statement = db
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?")
      .bind(tableName);
    const result = await statement.first<{ name?: string }>();
    return result?.name === tableName;
  } catch (error) {
    console.warn("[preview-health]", {
      failureReason: "Unable to inspect table",
      tableName,
      errorMessage: error instanceof Error ? error.message : "Unknown schema error",
    });
    return false;
  }
}
