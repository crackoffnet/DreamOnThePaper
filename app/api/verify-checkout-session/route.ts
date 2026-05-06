import { NextResponse } from "next/server";
import Stripe from "stripe";
import { z } from "zod";
import { getRuntimeEnv, getRuntimeEnvPresence } from "@/lib/env";
import {
  attachStripeSessionIfMissing,
  getOrder,
  markOrderPaid,
} from "@/lib/orders";
import { signFinalGenerationToken } from "@/lib/payment";
import type { PackageId } from "@/lib/plans";
import { packageIds } from "@/lib/plans";
import { assertSameOrigin } from "@/lib/security";

const verifyCheckoutSchema = z.object({
  sessionId: z.string().min(8).max(300),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let sessionIdPrefix = "";
  let orderId: string | undefined;
  let paymentStatus: string | undefined;

  try {
    if (!assertSameOrigin(request)) {
      logVerifyFailure({ requestId, failureReason: "Origin not allowed" });
      return verifyError("Request origin is not allowed.", 403);
    }

    const body = await request.json().catch(() => null);
    const parsed = verifyCheckoutSchema.safeParse(body);

    if (!parsed.success) {
      logVerifyFailure({
        requestId,
        hasSessionId: false,
        failureReason: "Missing sessionId",
      });
      return verifyError("We could not find your checkout session.", 400);
    }

    const sessionId = parsed.data.sessionId;
    sessionIdPrefix = sessionId.slice(0, 8);
    console.info("[verify-checkout]", {
      requestId,
      hasSessionId: true,
      sessionIdPrefix,
      event: "verification_started",
    });

    if (!sessionId.startsWith("cs_")) {
      logVerifyFailure({
        requestId,
        sessionIdPrefix,
        failureReason: "Invalid Stripe session id format",
      });
      return verifyError("We could not find your checkout session.", 400);
    }

    const env = getRuntimeEnv();
    if (!env.STRIPE_SECRET_KEY) {
      logVerifyFailure({
        requestId,
        sessionIdPrefix,
        failureReason: "Missing STRIPE_SECRET_KEY",
        envPresence: getRuntimeEnvPresence(),
      });
      return verifyError("Payment verification is temporarily unavailable.", 503);
    }

    const stripe = new Stripe(env.STRIPE_SECRET_KEY, {
      httpClient: Stripe.createFetchHttpClient(),
    });
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    paymentStatus = session.payment_status || "unknown";

    if (session.payment_status !== "paid") {
      logVerifyFailure({
        requestId,
        sessionIdPrefix,
        paymentStatus,
        failureReason: "Payment not paid",
      });
      return verifyError(
        "Payment is not verified yet. Please wait a moment and retry.",
        402,
      );
    }

    orderId = session.metadata?.orderId || undefined;
    if (!orderId) {
      logVerifyFailure({
        requestId,
        sessionIdPrefix,
        paymentStatus,
        failureReason: "Missing orderId metadata",
      });
      return verifyError(
        "We found your payment session, but could not restore your wallpaper order. Please contact support.",
        404,
      );
    }

    const packageId = normalizePackageId(session.metadata?.packageType);
    const existingOrder = await getOrder(orderId);

    if (!existingOrder) {
      logVerifyFailure({
        requestId,
        sessionIdPrefix,
        orderId,
        paymentStatus,
        failureReason: "Order missing in D1",
      });
      return verifyError(
        "We found your payment session, but could not restore your wallpaper order. Please contact support.",
        404,
      );
    }

    if (
      existingOrder.stripe_session_id &&
      existingOrder.stripe_session_id !== session.id
    ) {
      logVerifyFailure({
        requestId,
        sessionIdPrefix,
        orderId,
        paymentStatus,
        failureReason: "Order stripe session mismatch",
      });
      return verifyError(
        "We found your payment session, but could not restore your wallpaper order. Please contact support.",
        409,
      );
    }

    if (!existingOrder.stripe_session_id) {
      await attachStripeSessionIfMissing(orderId, session.id, packageId);
    }

    const paidOrder = await markOrderPaid(orderId, session.id);
    if (!paidOrder) {
      logVerifyFailure({
        requestId,
        sessionIdPrefix,
        orderId,
        paymentStatus,
        failureReason: "Unable to mark D1 order paid",
      });
      return verifyError(
        "Payment is verified, but your order could not be updated. Please retry.",
        503,
      );
    }

    const finalGenerationToken = await signFinalGenerationToken({
      sessionId: session.id,
      orderId,
      packageId: packageId || paidOrder.package_type || "single",
      promptHash: paidOrder.prompt_hash,
    });

    console.info("[verify-checkout]", {
      requestId,
      hasSessionId: true,
      sessionIdPrefix,
      orderId,
      paymentStatus,
      event: "payment_verified",
    });

    return NextResponse.json({
      success: true,
      paid: true,
      orderId,
      packageId: packageId || paidOrder.package_type || "single",
      customerEmail: session.customer_details?.email || null,
      finalGenerationToken,
    });
  } catch (error) {
    logVerifyFailure({
      requestId,
      sessionIdPrefix,
      orderId,
      paymentStatus,
      failureReason: "Stripe verification failed",
      stripeCode: stripeErrorValue(error, "code"),
      stripeType: stripeErrorValue(error, "type"),
      stripeMessage: error instanceof Error ? error.message : "Unknown verification error",
      envPresence: getRuntimeEnvPresence(),
    });
    return verifyError("Unable to verify payment. Please contact support.", 500);
  }
}

function normalizePackageId(value: string | null | undefined): PackageId | null {
  return packageIds.includes(value as PackageId) ? (value as PackageId) : null;
}

function logVerifyFailure(details: {
  requestId: string;
  hasSessionId?: boolean;
  sessionIdPrefix?: string;
  orderId?: string;
  paymentStatus?: string;
  failureReason: string;
  stripeCode?: string;
  stripeType?: string;
  stripeMessage?: string;
  envPresence?: ReturnType<typeof getRuntimeEnvPresence>;
}) {
  console.error("[verify-checkout]", details);
}

function stripeErrorValue(error: unknown, key: "code" | "type") {
  if (!error || typeof error !== "object" || !(key in error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function verifyError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
    },
    { status },
  );
}
