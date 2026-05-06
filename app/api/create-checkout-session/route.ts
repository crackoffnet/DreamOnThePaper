import { NextResponse } from "next/server";
import { checkoutSchema } from "@/lib/schemas";
import {
  assertSameOrigin,
} from "@/lib/security";
import { createCheckoutSession, getMissingCheckoutEnv } from "@/lib/payment";
import { checkIpRateLimit } from "@/lib/rateLimit";
import {
  checkoutPayloadToMeta,
  getOrderById,
  markOrderPendingPayment,
  signOrderSnapshot,
  storeOrder,
  verifyCheckoutOrderToken,
  verifyOrderSnapshotToken,
} from "@/lib/order-state";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  try {
    if (!assertSameOrigin(request)) {
      return checkoutError("Request origin is not allowed.", 403);
    }

    if (!(await checkIpRateLimit(request, "checkout", 5, 60 * 60 * 1000))) {
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

    const checkoutToken = parsed.data.orderToken
      ? await verifyCheckoutOrderToken(parsed.data.orderToken)
      : null;
    const tokenOrder = parsed.data.orderSnapshotToken
      ? await verifyOrderSnapshotToken(parsed.data.orderSnapshotToken)
      : null;
    const requestedOrderId =
      parsed.data.orderId || checkoutToken?.orderId || tokenOrder?.orderId || "";
    const storedOrder = requestedOrderId ? getOrderById(requestedOrderId) : null;
    const orderSource =
      storedOrder ||
      (tokenOrder?.orderId === requestedOrderId ? tokenOrder : null);
    const checkoutMeta =
      checkoutToken && checkoutToken.orderId === requestedOrderId
        ? checkoutPayloadToMeta(checkoutToken)
        : null;

    if (!orderSource && !checkoutMeta) {
      logCheckoutDiagnostic("order_missing_or_invalid", {
        requestId,
        orderId: requestedOrderId,
        reason: parsed.data.orderToken ? "invalid_or_expired_token" : "missing_order",
      });
      return checkoutError(
        parsed.data.orderToken
          ? "Your preview expired. Please create a new preview."
          : "Create your preview first.",
        404,
      );
    }

    if (orderSource?.status === "final_generated") {
      logCheckoutDiagnostic("order_missing_or_invalid", {
        requestId,
        orderId: requestedOrderId,
        reason: "final_already_generated",
      });
      return checkoutError("This order has already been completed.", 409);
    }

    const order = orderSource
      ? markOrderPendingPayment(orderSource, parsed.data.packageType)
      : null;
    const orderSnapshotToken = order ? await signOrderSnapshot(order) : null;
    const metadata = order
      ? {
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
        }
      : {
          ...checkoutMeta!,
          packageType: parsed.data.packageType,
        };

    const result = await createCheckoutSession(parsed.data.packageType, metadata);

    if (result.mock && order) {
      storeOrder({ ...order, sessionId: result.sessionId, status: "paid" });
    }

    return NextResponse.json({
      success: true,
      ...(orderSnapshotToken ? { orderSnapshotToken } : {}),
      ...result,
    });
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
