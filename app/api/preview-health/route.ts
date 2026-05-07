import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";

export function GET() {
  const env = getRuntimeEnv();
  const bindings = getOptionalCloudflareBindings();

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
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
