import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder } from "@/lib/orders";
import { verifyCheckoutOrderToken } from "@/lib/order-state";
import { getRequestMetadata } from "@/lib/requestMetadata";
import {
  trackOrderEvent,
  updateOrderStatus as updateTrackedOrderStatus,
} from "@/lib/orderEvents";
import { assertSameOrigin } from "@/lib/security";
import { getDb } from "@/lib/cloudflare";
import {
  appendBrowserCookie,
  resolveBrowserIdentity,
} from "@/lib/browserIdentity";
import { clearActiveBrowserOrder } from "@/lib/previewEntitlements";

const abandonSchema = z.object({
  orderId: z.string().min(8).max(120).optional(),
  orderToken: z.string().min(24).max(12000).optional(),
});

const abandonableStatuses = new Set(["preview_created", "pending_payment", "draft"]);

export async function POST(request: Request) {
  const browserIdentity = resolveBrowserIdentity(request);
  if (!assertSameOrigin(request)) {
    return NextResponse.json({ success: false }, { status: 403 });
  }

  const requestMetadata = await getRequestMetadata(request);
  const body = await request.json().catch(() => null);
  const parsed = abandonSchema.safeParse(body);
  const token = parsed.success && parsed.data.orderToken
    ? await verifyCheckoutOrderToken(parsed.data.orderToken)
    : null;
  const requestedOrderId = parsed.success ? parsed.data.orderId : undefined;

  if (!token && !requestedOrderId) {
    const response = NextResponse.json({ success: true, abandoned: false });
    appendBrowserCookie(response, browserIdentity.setCookie);
    return response;
  }

  const order = await getOrder(token?.orderId || requestedOrderId || "");
  if (!order || (token && order.prompt_hash !== token.promptHash)) {
    const response = NextResponse.json({ success: true, abandoned: false });
    appendBrowserCookie(response, browserIdentity.setCookie);
    return response;
  }

  if (!abandonableStatuses.has(order.status)) {
    const response = NextResponse.json({ success: true, abandoned: false });
    appendBrowserCookie(response, browserIdentity.setCookie);
    return response;
  }

  await updateTrackedOrderStatus(getDb(), order.id, "abandoned", {
    abandoned_at: new Date().toISOString(),
  });
  await clearActiveBrowserOrder(browserIdentity.browserId, order.id);
  void trackOrderEvent({
    orderId: order.id,
    customerId: order.customer_id || null,
    eventType: "order_abandoned",
    statusBefore: order.status,
    statusAfter: "abandoned",
    packageType: order.package_type || undefined,
    requestMetadata,
  });

  const response = NextResponse.json({ success: true, abandoned: true });
  appendBrowserCookie(response, browserIdentity.setCookie);
  return response;
}
