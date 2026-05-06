import { NextResponse } from "next/server";
import { checkoutSchema, containsAbusiveInput, hasMeaningfulInput } from "@/lib/schemas";
import {
  assertSameOrigin,
  checkRateLimit,
  safeLog,
} from "@/lib/security";
import { createCheckoutSession, isPaymentConfigured } from "@/lib/payment";

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return checkoutError("Request origin is not allowed.", 403);
    }

    if (!checkRateLimit(request, "checkout", 10)) {
      return checkoutError("Too many checkout attempts. Please wait a moment.", 429);
    }

    if (process.env.NODE_ENV === "production" && !isPaymentConfigured()) {
      safeLog("Payment configuration missing");
      return checkoutError("Payment is not configured yet.", 503);
    }

    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      return checkoutError("Please check your order details and try again.");
    }

    if (!hasMeaningfulInput(parsed.data.wallpaperInput)) {
      return checkoutError("Please add a little more detail before checkout.");
    }

    const personalText = Object.values(parsed.data.wallpaperInput).join(" ");
    if (containsAbusiveInput(personalText)) {
      return checkoutError("Please keep the wallpaper request safe and respectful.");
    }

    const result = await createCheckoutSession(parsed.data.packageId, {
      device: parsed.data.wallpaperInput.device,
      ratio: parsed.data.wallpaperInput.ratio,
      style: parsed.data.wallpaperInput.style,
      customWidth: parsed.data.wallpaperInput.customWidth
        ? String(parsed.data.wallpaperInput.customWidth)
        : "",
      customHeight: parsed.data.wallpaperInput.customHeight
        ? String(parsed.data.wallpaperInput.customHeight)
        : "",
    });

    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    safeLog("Checkout session creation failed", error);
    return checkoutError("Payment is not configured yet.", 503);
  }
}

function checkoutError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
    },
    { status },
  );
}
