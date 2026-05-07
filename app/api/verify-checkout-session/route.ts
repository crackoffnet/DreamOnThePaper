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
import { normalizePackageId } from "@/lib/packages";
import { wallpaperProductFromDevice } from "@/lib/wallpaperProducts";
import { assertSameOrigin } from "@/lib/security";
import { getDb } from "@/lib/cloudflare";
import {
  getOrCreateCustomerByEmail,
  normalizeEmail,
  patchOrderTracking,
  stripeModeFromSecret,
  trackOrderEvent,
} from "@/lib/orderEvents";
import { getRequestMetadata } from "@/lib/requestMetadata";

const verifyCheckoutSchema = z.object({
  sessionId: z.string().min(8).max(300),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const startedAt = Date.now();
  const requestMetadata = await getRequestMetadata(request);
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
    console.info("[final-generation-timing]", {
      requestId,
      sessionIdPrefix,
      step: "payment_verification",
      durationMs: Date.now() - startedAt,
      paymentStatus,
    });

    if (session.payment_status !== "paid") {
      logVerifyFailure({
        requestId,
        sessionIdPrefix,
        paymentStatus,
        failureReason: "Payment not paid",
      });
      void trackOrderEvent({
        eventType: "payment_failed",
        requestMetadata,
        metadata: {
          requestId,
          sessionIdPrefix,
          paymentStatus,
        },
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
    const customerEmail = session.customer_details?.email || undefined;
    const stripeCustomerId = stripeId(session.customer);
    const stripePaymentIntentId = stripeId(session.payment_intent);
    const amountCents = session.amount_total || paidOrder.amount_cents || 0;
    const customer = customerEmail
      ? await getOrCreateCustomerByEmail(
          getDb(),
          customerEmail,
          stripeCustomerId,
          orderId,
          amountCents,
          !existingOrder.paid_at,
        )
      : null;

    void patchOrderTracking(orderId, {
      customer_id: customer?.id || paidOrder.customer_id || null,
      customer_email: customerEmail || null,
      customer_email_normalized: customerEmail ? normalizeEmail(customerEmail) : null,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: stripePaymentIntentId || null,
      stripe_customer_id: stripeCustomerId || null,
      stripe_payment_status: session.payment_status,
      stripe_mode: stripeModeFromSecret(),
      package_type: packageId || paidOrder.package_type || "single",
      wallpaper_type: session.metadata?.wallpaperType || paidOrder.wallpaper_type || paidOrder.device,
      amount_cents: amountCents,
      currency: session.currency || "usd",
      paid_at: Date.now(),
    });
    void trackOrderEvent({
      orderId,
      customerId: customer?.id || null,
      eventType: "payment_verified",
      statusBefore: existingOrder.status,
      statusAfter: paidOrder.status,
      packageType: packageId || paidOrder.package_type || "single",
      requestMetadata,
      metadata: {
        requestId,
        sessionIdPrefix,
        paymentStatus,
        stripeMode: stripeModeFromSecret(),
        amountCents,
        currency: session.currency || "usd",
      },
    });

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
      wallpaperType: wallpaperProductFromDevice(
        session.metadata?.wallpaperType || paidOrder.wallpaper_type || paidOrder.device,
      ),
      customerEmail: customerEmail || null,
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

function stripeId(value: unknown) {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : "";
  }

  return "";
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
