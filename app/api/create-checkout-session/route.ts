import { NextResponse } from "next/server";
import { checkoutSchema, containsAbusiveInput, hasMeaningfulInput } from "@/lib/schemas";
import {
  assertSameOrigin,
  safeLog,
} from "@/lib/security";
import { createCheckoutSession, getMissingCheckoutEnv } from "@/lib/payment";
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

    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      return checkoutError("Please check your order details and try again.");
    }

    const missing = getMissingCheckoutEnv(parsed.data.packageId);
    if (missing.length > 0) {
      safeLog(`Checkout configuration missing: ${missing.join(", ")}`);
      return checkoutError("Checkout is not configured", 503, missing);
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
      packageType: parsed.data.packageId,
      device: parsed.data.wallpaperInput.device,
      ratio: parsed.data.wallpaperInput.ratio,
      width,
      height,
      theme: parsed.data.wallpaperInput.theme,
      style: parsed.data.wallpaperInput.style,
      quoteTone: parsed.data.wallpaperInput.quoteTone,
      promptHash: order.promptHash,
      createdAt: new Date().toISOString(),
    });

    if (result.mock) {
      storeOrder({ ...order, sessionId: result.sessionId, status: "paid" });
    }

    return NextResponse.json({ success: true, orderSnapshotToken, ...result });
  } catch (error) {
    safeLog("Checkout session creation failed", error);
    return checkoutError(
      "Checkout is temporarily unavailable. Please try again soon.",
      503,
    );
  }
}

function checkoutError(message: string, status = 400, missing?: string[]) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
      ...(missing ? { missing } : {}),
    },
    { status },
  );
}
