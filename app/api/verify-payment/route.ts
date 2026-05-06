import { NextResponse } from "next/server";
import { verifyPaymentSchema } from "@/lib/schemas";
import {
  assertSameOrigin,
  jsonError,
  safeLog,
} from "@/lib/security";
import { signOrderToken, verifyStripePayment } from "@/lib/payment";
import { checkIpRateLimit } from "@/lib/rateLimit";
import {
  getOrderById,
  markOrderPaid,
  verifyOrderSnapshotToken,
} from "@/lib/order-state";
import { getWallpaperMeta } from "@/lib/wallpaper";

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return jsonError("Request origin is not allowed.", 403);
    }

    if (!checkIpRateLimit(request, "verify-payment", 20, 60 * 60 * 1000)) {
      return jsonError("Too many verification attempts. Please wait a moment.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = verifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Missing payment session.");
    }

    const snapshot = parsed.data.orderSnapshotToken
      ? await verifyOrderSnapshotToken(parsed.data.orderSnapshotToken)
      : null;

    if (!snapshot) {
      return jsonError("Unable to verify payment. Please contact support.", 400);
    }

    const status = await verifyStripePayment(parsed.data.sessionId);
    if (!status.paid) {
      return jsonError("Payment is not complete yet.", 402);
    }

    const isDevMock =
      status.sessionId.startsWith("dev_mock_") &&
      process.env.NODE_ENV !== "production";
    const stripeMetadata = status.metadata || {};

    if (!isDevMock) {
      const meta = getWallpaperMeta(snapshot.input);
      const [width, height] = meta.imageSize.split("x");

      if (
        status.packageId !== snapshot.packageId ||
        stripeMetadata.orderId !== snapshot.orderId ||
        stripeMetadata.packageType !== snapshot.packageId ||
        stripeMetadata.device !== snapshot.input.device ||
        stripeMetadata.ratio !== snapshot.input.ratio ||
        stripeMetadata.width !== width ||
        stripeMetadata.height !== height ||
        stripeMetadata.theme !== snapshot.input.theme ||
        stripeMetadata.style !== snapshot.input.style ||
        stripeMetadata.quoteTone !== snapshot.input.quoteTone ||
        stripeMetadata.promptHash !== snapshot.promptHash
      ) {
        return jsonError("Unable to verify payment. Please contact support.", 400);
      }
    }

    const storedOrder = getOrderById(snapshot.orderId) || snapshot;
    const effectiveStatus = isDevMock
      ? { ...status, packageId: snapshot.packageId }
      : status;
    const paidOrder = markOrderPaid(storedOrder, status.sessionId);
    const orderToken = await signOrderToken(effectiveStatus, paidOrder);

    return NextResponse.json({
      paid: true,
      packageId: effectiveStatus.packageId,
      customerEmail: status.customerEmail || null,
      orderId: paidOrder.orderId,
      orderToken,
    });
  } catch (error) {
    safeLog("Payment verification failed", error);
    return jsonError("Unable to verify payment. Please contact support.", 500);
  }
}
