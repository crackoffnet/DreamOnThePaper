import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder } from "@/lib/orders";
import { verifyCheckoutOrderToken } from "@/lib/order-state";

const validateOrderTokenSchema = z.object({
  orderToken: z.string().min(24).max(12000),
});

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = validateOrderTokenSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ valid: false }, { status: 400 });
  }

  const token = await verifyCheckoutOrderToken(parsed.data.orderToken);
  if (!token) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  const order = await getOrder(token.orderId);
  if (!order || order.prompt_hash !== token.promptHash) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    order: {
      orderId: order.id,
      previewImageId: order.preview_r2_key,
      previewImageUrl: token.previewImageUrl,
      device: order.device,
      ratio: order.ratio,
      width: String(order.width),
      height: String(order.height),
      theme: order.theme,
      style: order.style,
      quoteTone: order.quote_tone,
      promptHash: order.prompt_hash,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    },
  });
}
