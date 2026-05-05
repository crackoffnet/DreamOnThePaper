import { NextResponse } from "next/server";
import { verifyPaymentSchema } from "@/lib/schemas";
import {
  assertSameOrigin,
  checkRateLimit,
  jsonError,
  safeLog,
} from "@/lib/security";
import { signOrderToken, verifyStripePayment } from "@/lib/payment";

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return jsonError("Request origin is not allowed.", 403);
    }

    if (!checkRateLimit(request, "verify-payment", 20)) {
      return jsonError("Too many verification attempts. Please wait a moment.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = verifyPaymentSchema.safeParse(body);

    if (!parsed.success) {
      return jsonError("Missing payment session.");
    }

    const status = await verifyStripePayment(parsed.data.sessionId);
    if (!status.paid) {
      return jsonError("Payment is not complete yet.", 402);
    }

    const orderToken = await signOrderToken(status);

    return NextResponse.json({
      paid: true,
      packageId: status.packageId,
      customerEmail: status.customerEmail || null,
      orderToken,
    });
  } catch (error) {
    safeLog("Payment verification failed", error);
    return jsonError("Unable to verify payment. Please contact support.", 500);
  }
}
