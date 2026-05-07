import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/payment";
import { jsonError, safeLog } from "@/lib/security";
import { getRuntimeEnv } from "@/lib/env";
import {
  patchOrderTracking,
  stripeModeFromSecret,
  trackOrderEvent,
} from "@/lib/orderEvents";

export async function POST(request: Request) {
  const secret = getRuntimeEnv().STRIPE_WEBHOOK_SECRET;
  const stripeSecret = getStripeSecretKey();

  if (!secret || !stripeSecret) {
    return jsonError("Webhook is not configured.", 503);
  }

  const stripe = new Stripe(stripeSecret, {
    httpClient: Stripe.createFetchHttpClient(),
  });
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return jsonError("Missing Stripe signature.", 400);
  }

  try {
    // Stripe signature verification needs the exact raw request body.
    // In App Router/OpenNext on Cloudflare, request.text() reads that raw body
    // as long as no JSON/body parser touches it first.
    const payload = await request.text();
    const event = stripe.webhooks.constructEvent(payload, signature, secret);

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId || "";
      if (orderId) {
        void patchOrderTracking(orderId, {
          stripe_checkout_session_id: session.id,
          stripe_payment_status: session.payment_status || null,
          stripe_payment_intent_id: stripeId(session.payment_intent),
          stripe_customer_id: stripeId(session.customer),
          stripe_mode: stripeModeFromSecret(),
        });
        void trackOrderEvent({
          orderId,
          eventType: "checkout_session_completed_webhook",
          packageType: session.metadata?.packageType || null,
          metadata: {
            eventId: event.id,
            paymentStatus: session.payment_status,
          },
        });
      }
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object as Stripe.PaymentIntent;
      void trackOrderEvent({
        eventType: "payment_failed",
        metadata: {
          eventId: event.id,
          paymentIntentPrefix: paymentIntent.id.slice(0, 8),
          status: paymentIntent.status,
        },
      });
    }

    if (event.type === "charge.refunded") {
      const charge = event.data.object as Stripe.Charge;
      void trackOrderEvent({
        eventType: "refund_created",
        metadata: {
          eventId: event.id,
          chargePrefix: charge.id.slice(0, 8),
          amountRefunded: charge.amount_refunded,
        },
      });
    }

    if (event.type === "charge.dispute.created") {
      const dispute = event.data.object as Stripe.Dispute;
      void trackOrderEvent({
        eventType: "dispute_created",
        metadata: {
          eventId: event.id,
          disputePrefix: dispute.id.slice(0, 8),
          amount: dispute.amount,
          currency: dispute.currency,
        },
      });
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    safeLog("Stripe webhook verification failed", error);
    return jsonError("Invalid webhook signature.", 400);
  }
}

function stripeId(value: unknown) {
  if (!value) return null;
  if (typeof value === "string") return value;
  if (typeof value === "object" && "id" in value) {
    const id = (value as { id?: unknown }).id;
    return typeof id === "string" ? id : null;
  }
  return null;
}
