import { NextResponse } from "next/server";
import { getOptionalCloudflareBindings } from "@/lib/cloudflare";
import { rateLimitConfig } from "@/lib/rateLimit";

export function GET() {
  const bindings = getOptionalCloudflareBindings();

  return NextResponse.json(
    {
      ok: true,
      hasKvBinding: Boolean(bindings.DREAM_RATE_LIMITS),
      previewAttemptLimitPerHour: rateLimitConfig.previewAttemptLimitPerHour,
      previewSuccessLimitPerIpPerDay:
        rateLimitConfig.previewSuccessLimitPerIpPerDay,
      checkoutLimitPerHour: rateLimitConfig.checkoutLimitPerHour,
      emailIpLimitPerHour: rateLimitConfig.emailIpLimitPerHour,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
