import { NextResponse } from "next/server";
import { z } from "zod";
import { getFinalAssets, getOrder } from "@/lib/orders";

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
    return NextResponse.json(
      { exists: false },
      {
        headers: {
          "Cache-Control": "no-store",
          "X-Content-Type-Options": "nosniff",
        },
      },
    );
  }

  const finalAssets = await getFinalAssets(order.id);

  return NextResponse.json(
    {
      exists: true,
      status: order.status,
      hasPreviewImage: Boolean(order.preview_r2_key),
      hasFinalImage: Boolean(order.final_r2_key || finalAssets.length),
      finalAssetCount: finalAssets.length,
      finalGenerationAttempts: order.final_generation_attempts,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
