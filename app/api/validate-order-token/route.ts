import { NextResponse } from "next/server";
import { z } from "zod";
import { expireOrderIfNeeded, getOrder, isUnpaidOrderExpired } from "@/lib/orders";
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
  const activeOrder = order ? await expireOrderIfNeeded(order) : null;
  if (
    !activeOrder ||
    activeOrder.prompt_hash !== token.promptHash ||
    isUnpaidOrderExpired(activeOrder)
  ) {
    return NextResponse.json({ valid: false }, { status: 404 });
  }

  return NextResponse.json({
    valid: true,
    order: {
      orderId: activeOrder.id,
      previewImageId: activeOrder.preview_r2_key,
      previewImageUrl: token.previewImageUrl,
      device: activeOrder.device,
      ratio: activeOrder.ratio,
      width: String(activeOrder.width),
      height: String(activeOrder.height),
      theme: activeOrder.theme,
      style: activeOrder.style,
      quoteTone: activeOrder.quote_tone,
      promptHash: activeOrder.prompt_hash,
      createdAt: token.createdAt,
      expiresAt: token.expiresAt,
    },
  });
}
