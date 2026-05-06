import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";

export function GET() {
  const env = getRuntimeEnv();
  const bindings = getOptionalCloudflareBindings();
  const hasBrevoApiKey = Boolean(env.BREVO_API_KEY);
  const hasFromEmail = Boolean(env.FROM_EMAIL);
  const hasFromName = Boolean(env.FROM_NAME);
  const hasDb = Boolean(bindings.DB);
  const hasWallpaperBucket = Boolean(bindings.WALLPAPER_BUCKET);

  return NextResponse.json(
    {
      ok: hasBrevoApiKey && hasFromEmail && hasFromName && hasDb && hasWallpaperBucket,
      hasBrevoApiKey,
      hasFromEmail,
      hasFromName,
      hasDb,
      hasWallpaperBucket,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
