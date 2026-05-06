import { NextResponse } from "next/server";
import { checkoutSchema, containsAbusiveInput, hasMeaningfulInput } from "@/lib/schemas";
import {
  assertSameOrigin,
  safeLog,
} from "@/lib/security";
import { createCheckoutSession } from "@/lib/payment";
import { checkIpRateLimit } from "@/lib/rateLimit";
import {
  createOrderSnapshot,
  signOrderSnapshot,
  storeOrder,
} from "@/lib/order-state";
import { getWallpaperMeta } from "@/lib/wallpaper";

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return checkoutError("Request origin is not allowed.", 403);
    }

    if (!checkIpRateLimit(request, "checkout", 5, 60 * 60 * 1000)) {
      return checkoutError("Too many checkout attempts. Please wait a moment.", 429);
    }

    if (!process.env.STRIPE_SECRET_KEY || !process.env.NEXT_PUBLIC_SITE_URL) {
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

    const order = await createOrderSnapshot(
      parsed.data.packageId,
      parsed.data.wallpaperInput,
    );
    const orderSnapshotToken = await signOrderSnapshot(order);
    const meta = getWallpaperMeta(parsed.data.wallpaperInput);
    const [width, height] = meta.imageSize.split("x");

    const result = await createCheckoutSession(parsed.data.packageId, {
      orderId: order.orderId,
      device: parsed.data.wallpaperInput.device,
      ratio: parsed.data.wallpaperInput.ratio,
      width,
      height,
      theme: parsed.data.wallpaperInput.theme,
      style: parsed.data.wallpaperInput.style,
      quoteTone: parsed.data.wallpaperInput.quoteTone,
      promptHash: order.promptHash,
    });

    if (result.mock) {
      storeOrder({ ...order, sessionId: result.sessionId, status: "paid" });
    }

    return NextResponse.json({ success: true, orderSnapshotToken, ...result });
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
