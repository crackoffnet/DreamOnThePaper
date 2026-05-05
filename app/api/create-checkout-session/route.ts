import { NextResponse } from "next/server";
import { checkoutSchema, containsAbusiveInput, hasMeaningfulInput } from "@/lib/schemas";
import {
  assertSameOrigin,
  checkRateLimit,
  jsonError,
  safeLog,
} from "@/lib/security";
import { createCheckoutSession } from "@/lib/payment";

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return jsonError("Request origin is not allowed.", 403);
    }

    if (!checkRateLimit(request, "checkout", 10)) {
      return jsonError("Too many checkout attempts. Please wait a moment.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      return jsonError("Please check your order details and try again.");
    }

    if (!hasMeaningfulInput(parsed.data.wallpaperInput)) {
      return jsonError("Please add a little more detail before checkout.");
    }

    const personalText = Object.values(parsed.data.wallpaperInput).join(" ");
    if (containsAbusiveInput(personalText)) {
      return jsonError("Please keep the wallpaper request safe and respectful.");
    }

    const result = await createCheckoutSession(parsed.data.packageId, {
      device: parsed.data.wallpaperInput.device,
      ratio: parsed.data.wallpaperInput.ratio,
      style: parsed.data.wallpaperInput.style,
    });

    return NextResponse.json(result);
  } catch (error) {
    safeLog("Checkout session creation failed", error);
    return jsonError("Unable to start checkout. Please try again.", 500);
  }
}
