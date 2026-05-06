import { NextResponse } from "next/server";
import Stripe from "stripe";
import { jsonError, safeLog } from "@/lib/security";

export async function POST(request: Request) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const stripeSecret = process.env.STRIPE_SECRET_KEY;

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
      // TODO: Persist minimal paid order state in Cloudflare KV/D1.
      // Current flow verifies the Checkout Session directly on /api/verify-payment.
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    safeLog("Stripe webhook verification failed", error);
    return jsonError("Invalid webhook signature.", 400);
  }
}
