import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { getRuntimeEnv } from "@/lib/env";

export function GET() {
  const env = getRuntimeEnv();
  const bindings = getOptionalCloudflareBindings();
  const response = {
    ok: Boolean(
      env.STRIPE_SECRET_KEY &&
        env.NEXT_PUBLIC_SITE_URL &&
        env.STRIPE_SINGLE_PRICE_ID &&
        env.STRIPE_BUNDLE_PRICE_ID &&
        env.STRIPE_PREMIUM_PRICE_ID &&
        env.ORDER_TOKEN_SECRET &&
        bindings.DB &&
        bindings.DREAM_RATE_LIMITS &&
        bindings.WALLPAPER_BUCKET,
    ),
    env: {
      hasStripeSecretKey: Boolean(env.STRIPE_SECRET_KEY),
      hasSiteUrl: Boolean(env.NEXT_PUBLIC_SITE_URL),
      hasSinglePriceId: Boolean(env.STRIPE_SINGLE_PRICE_ID),
      hasBundlePriceId: Boolean(env.STRIPE_BUNDLE_PRICE_ID),
      hasPremiumPriceId: Boolean(env.STRIPE_PREMIUM_PRICE_ID),
      hasOrderTokenSecret: Boolean(env.ORDER_TOKEN_SECRET),
    },
    bindings: {
      hasDb: Boolean(bindings.DB),
      hasRateLimitKv: Boolean(bindings.DREAM_RATE_LIMITS),
      hasWallpaperBucket: Boolean(bindings.WALLPAPER_BUCKET),
    },
    priceIdFormat: {
      singleStartsWithPrice: env.STRIPE_SINGLE_PRICE_ID?.startsWith("price_") || false,
      bundleStartsWithPrice: env.STRIPE_BUNDLE_PRICE_ID?.startsWith("price_") || false,
      premiumStartsWithPrice: env.STRIPE_PREMIUM_PRICE_ID?.startsWith("price_") || false,
    },
  };

  return NextResponse.json(response, {
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
