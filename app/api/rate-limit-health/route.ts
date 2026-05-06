import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { rateLimitConfig } from "@/lib/rateLimit";

export function GET() {
  const bindings = getOptionalCloudflareBindings();

  return NextResponse.json(
    {
      checkoutLimitPerHour: rateLimitConfig.checkoutLimitPerHour,
      previewLimitPerDay: rateLimitConfig.previewLimitPerDay,
      hasKvBinding: Boolean(bindings.DREAM_RATE_LIMITS),
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
