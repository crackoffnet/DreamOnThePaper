import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder } from "@/lib/orders";

const orderHealthSchema = z.object({
  orderId: z.string().min(8).max(120),
});

export async function GET(request: Request) {
  const url = new URL(request.url);
  const parsed = orderHealthSchema.safeParse({
    orderId: url.searchParams.get("orderId"),
  });

  if (!parsed.success) {
    return NextResponse.json({ exists: false }, { status: 400 });
  }

  const order = await getOrder(parsed.data.orderId);

  if (!order) {
    return NextResponse.json({ exists: false });
  }

  return NextResponse.json({
    exists: true,
    status: order.status,
    hasPreviewR2Key: Boolean(order.preview_r2_key),
    hasFinalR2Key: Boolean(order.final_r2_key),
    hasStripeSessionId: Boolean(order.stripe_session_id),
    stripePaymentStatus: order.stripe_payment_status || null,
    finalGenerationAttempts: order.final_generation_attempts,
  });
}
