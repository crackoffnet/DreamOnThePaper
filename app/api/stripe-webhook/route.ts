import { NextResponse } from "next/server";
import Stripe from "stripe";
import { getStripeSecretKey } from "@/lib/payment";
import { jsonError, safeLog } from "@/lib/security";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
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
      // TODO: Persist minimal paid order state in Cloudflare D1/KV.
      // The success page also verifies the Checkout Session directly, so this
      // webhook is an additional reconciliation path rather than the only gate.
    }

    if (event.type === "payment_intent.payment_failed") {
      // TODO: Mark the related order as failed once PaymentIntent metadata is
      // persisted through D1/KV. Do not expose failure internals to customers.
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    safeLog("Stripe webhook verification failed", error);
    return jsonError("Invalid webhook signature.", 400);
  }
}
