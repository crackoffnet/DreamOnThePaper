import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";

export async function GET() {
  const env = getRuntimeEnv();
  const bindings = getOptionalCloudflareBindings();
  const supportsWallpaperTypeColumn = await hasOrdersColumn(
    bindings.DB,
    "wallpaper_type",
  );
  const hasPreviewEntitlementsTable = await hasTable(
    bindings.DB,
    "preview_entitlements",
  );
  const hasBrowserSessionsTable = await hasTable(bindings.DB, "browser_sessions");

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
      previewModelConfigured: Boolean(
        env.OPENAI_PREVIEW_IMAGE_MODEL || "gpt-image-1-mini",
      ),
      supportsWallpaperTypeColumn,
      hasPreviewEntitlementsTable,
      hasBrowserSessionsTable,
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

async function hasOrdersColumn(
  db: D1Database | undefined,
  columnName: string,
) {
  if (!db) {
    return false;
  }

  try {
    const statement = db.prepare("PRAGMA table_info(orders);");
    const result = await (
      statement as unknown as { all<T>(): Promise<{ results?: T[] }> }
    ).all<{ name?: string }>();

    return (
      result.results?.some((row) => row.name?.toLowerCase() === columnName.toLowerCase()) ||
      false
    );
  } catch (error) {
    console.warn("[preview-health]", {
      failureReason: "Unable to inspect orders schema",
      errorMessage: error instanceof Error ? error.message : "Unknown schema error",
    });
    return false;
  }
}
