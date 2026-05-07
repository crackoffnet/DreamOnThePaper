import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";

export function GET() {
  const env = getRuntimeEnv();
  const bindings = getOptionalCloudflareBindings();
  const stripeMode = env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ? "live"
    : env.STRIPE_SECRET_KEY?.startsWith("sk_test_")
      ? "test"
      : "unknown";
  const singlePriceId = env.STRIPE_SINGLE_PRICE_ID;
  const response = {
    ok: Boolean(
      env.STRIPE_SECRET_KEY &&
        env.NEXT_PUBLIC_SITE_URL &&
        singlePriceId &&
        env.ORDER_TOKEN_SECRET &&
        bindings.DB &&
        bindings.DREAM_RATE_LIMITS &&
        bindings.WALLPAPER_BUCKET,
    ),
    env: {
      hasStripeSecretKey: Boolean(env.STRIPE_SECRET_KEY),
      hasSiteUrl: Boolean(env.NEXT_PUBLIC_SITE_URL),
      hasSinglePriceId: Boolean(singlePriceId),
      hasOrderTokenSecret: Boolean(env.ORDER_TOKEN_SECRET),
      stripeMode,
    },
    bindings: {
      hasDb: Boolean(bindings.DB),
      hasRateLimitKv: Boolean(bindings.DREAM_RATE_LIMITS),
      hasWallpaperBucket: Boolean(bindings.WALLPAPER_BUCKET),
    },
    priceIdFormat: {
      singleStartsWithPrice: singlePriceId?.startsWith("price_") || false,
    },
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
