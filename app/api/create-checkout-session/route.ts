import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/schemas";
import {
  assertSameOrigin,
} from "@/lib/security";
import { createCheckoutSession, getMissingCheckoutEnv } from "@/lib/payment";
import { checkIpRateLimit } from "@/lib/rateLimit";
import {
  getOrderById,
  markOrderPendingPayment,
  signOrderSnapshot,
  storeOrder,
  verifyOrderSnapshotToken,
} from "@/lib/order-state";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!assertSameOrigin(request)) {
      return checkoutError("Request origin is not allowed.", 403);
    }

    if (!checkIpRateLimit(request, "checkout", 5, 60 * 60 * 1000)) {
      return checkoutError("Too many checkout attempts. Please wait a moment.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      return checkoutError("Please check your order details and try again.");
    }

    const missing = getMissingCheckoutEnv(parsed.data.packageType);
    if (missing.length > 0) {
      missing.forEach((name) =>
        logCheckoutDiagnostic("missing_env", {
          requestId,
          orderId: parsed.data.orderId,
          missing: name,
        }),
      );
      return checkoutError(
        "Checkout is temporarily unavailable. Please try again soon.",
        503,
      );
    }

    const tokenOrder = parsed.data.orderSnapshotToken
      ? await verifyOrderSnapshotToken(parsed.data.orderSnapshotToken)
      : null;
    const storedOrder = getOrderById(parsed.data.orderId);
    const orderSource =
      storedOrder ||
      (tokenOrder?.orderId === parsed.data.orderId ? tokenOrder : null);

    if (!orderSource || orderSource.status === "final_generated") {
      logCheckoutDiagnostic("order_missing_or_invalid", {
        requestId,
        orderId: parsed.data.orderId,
      });
      return checkoutError("Create your preview first.", 404);
    }

    const order = markOrderPendingPayment(orderSource, parsed.data.packageType);
    const orderSnapshotToken = await signOrderSnapshot(order);

    const result = await createCheckoutSession(parsed.data.packageType, {
      orderId: order.orderId,
      packageType: parsed.data.packageType,
      device: order.device || order.input.device,
      ratio: order.ratio || order.input.ratio,
      width: order.width || "",
      height: order.height || "",
      theme: order.theme || order.input.theme,
      style: order.style || order.input.style,
      quoteTone: order.quoteTone || order.input.quoteTone,
      promptHash: order.promptHash,
    });

    if (result.mock) {
      storeOrder({ ...order, sessionId: result.sessionId, status: "paid" });
    }

    return NextResponse.json({ success: true, orderSnapshotToken, ...result });
  } catch (error) {
    logCheckoutDiagnostic("stripe_checkout_failed", {
      requestId,
      error: error instanceof Error ? error.message : "Unknown checkout error",
    });
    return checkoutError(
      "Checkout is temporarily unavailable. Please try again soon.",
      503,
    );
  }
}

function logCheckoutDiagnostic(
  event: string,
  details: Record<string, string | undefined>,
) {
  console.error(
    JSON.stringify({
      event,
      ...details,
    }),
  );
}

function checkoutError(message: string, status = 400, missing?: string[]) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
      ...(missing ? { missing } : {}),
    },
    { status },
  );
}
