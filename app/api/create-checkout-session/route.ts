import { NextResponse } from "next/server";
import Stripe from "stripe";
import { checkoutSchema } from "@/lib/schemas";
import { assertSameOrigin, getClientIp } from "@/lib/security";
import { getRuntimeEnv, getRuntimeEnvPresence } from "@/lib/env";
import { checkCheckoutRateLimitDetailed } from "@/lib/rateLimit";
import {
  expireOrderIfNeeded,
  getOrder,
  isUnpaidOrderExpired,
  markOrderPendingPayment,
} from "@/lib/orders";
import { verifyCheckoutOrderToken } from "@/lib/order-state";
import {
  packages,
  type PackageId,
  type RuntimeStripePriceEnv,
} from "@/lib/packages";
import {
  isWallpaperProductId,
  wallpaperProductFromDevice,
  wallpaperProducts,
  type WallpaperProductId,
} from "@/lib/wallpaperProducts";
import { getRequestMetadata } from "@/lib/requestMetadata";
import {
  patchOrderTracking,
  stripeModeFromSecret,
  trackOrderEvent,
} from "@/lib/orderEvents";

const safeCheckoutMessage = "Checkout is temporarily unavailable. Please try again soon.";

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const requestMetadata = await getRequestMetadata(request);
  let orderId: string | undefined;
  const packageType: PackageId = "single";
  let wallpaperType: WallpaperProductId | undefined;
  let selectedPriceEnvName: RuntimeStripePriceEnv | undefined;

  try {
    if (!assertSameOrigin(request)) {
      logCheckoutFailure({
        requestId,
        failureReason: "Origin not allowed",
      });
      void trackOrderEvent({
        eventType: "checkout_failed",
        requestMetadata,
        metadata: { requestId, reason: "origin_not_allowed" },
      });
      return checkoutError("Request origin is not allowed.", 403);
    }

    const env = getRuntimeEnv();
    const bypassToken = request.headers.get("x-admin-bypass-token");
    const hasRateLimitBypass =
      Boolean(env.CHECKOUT_RATE_LIMIT_BYPASS_TOKEN) &&
      bypassToken === env.CHECKOUT_RATE_LIMIT_BYPASS_TOKEN;

    if (!hasRateLimitBypass) {
      const rateLimit = await checkCheckoutRateLimitDetailed(getClientIp(request));
      if (!rateLimit.allowed) {
        logCheckoutFailure({
          requestId,
          failureReason: "Checkout rate limit exceeded",
        });
        return checkoutRateLimitError(rateLimit.retryAfterSeconds);
      }
    }

    if (hasRateLimitBypass) {
      console.info("[checkout]", {
        requestId,
        failureReason: "Checkout rate limit bypass used",
      });
    }

    const body = await request.json().catch(() => null);
    const parsed = checkoutSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      logCheckoutFailure({
        requestId,
        failureReason: "Invalid checkout request body",
      });
      return checkoutError("Please check your order details and try again.", 400);
    }

    if (!parsed.data.orderToken) {
      logCheckoutFailure({
        requestId,
        packageType,
        failureReason: "Missing orderToken",
      });
      void trackOrderEvent({
        eventType: "checkout_failed",
        packageType,
        requestMetadata,
        metadata: { requestId, reason: "missing_order_token" },
      });
      return checkoutError("Create your preview first.", 400);
    }

    const missingEnv = getMissingCheckoutEnv(env);
    if (missingEnv.length > 0) {
      logCheckoutFailure({
        requestId,
        packageType,
        failureReason: `Missing ${missingEnv.join(", ")}`,
        envPresence: getRuntimeEnvPresence(),
      });
      return checkoutError(safeCheckoutMessage, 503);
    }

    selectedPriceEnvName = packages.single.stripePriceEnv;
    const priceId = env[selectedPriceEnvName];
    const invalidPriceReason = validatePriceId(priceId);
    if (invalidPriceReason) {
      logCheckoutFailure({
        requestId,
        packageType,
        selectedPriceEnvName,
        failureReason: invalidPriceReason,
        envPresence: getRuntimeEnvPresence(),
      });
      return checkoutError(safeCheckoutMessage, 503);
    }

    const checkoutToken = await verifyCheckoutOrderToken(parsed.data.orderToken);
    if (!checkoutToken) {
      logCheckoutFailure({
        requestId,
        packageType,
        failureReason: "Invalid or expired orderToken",
      });
      return checkoutError("Your preview expired. Please create a new preview.", 404);
    }

    orderId = checkoutToken.orderId;
    void trackOrderEvent({
      orderId,
      eventType: "checkout_started",
      packageType,
      requestMetadata,
      metadata: { requestId },
    });
    const order = await getOrder(orderId);
    if (!order) {
      logCheckoutFailure({
        requestId,
        orderId,
        packageType,
        failureReason: "D1 order missing",
      });
      return checkoutError(safeCheckoutMessage, 503);
    }

    const activeOrder = await expireOrderIfNeeded(order);
    if (!activeOrder || isUnpaidOrderExpired(activeOrder)) {
      logCheckoutFailure({
        requestId,
        orderId,
        packageType,
        failureReason: "Unpaid order expired",
      });
      return checkoutError("Your preview expired. Please create a new preview.", 404);
    }

    if (activeOrder.prompt_hash !== checkoutToken.promptHash) {
      logCheckoutFailure({
        requestId,
        orderId,
        packageType,
        failureReason: "Order token prompt hash mismatch",
      });
      return checkoutError("Your preview expired. Please create a new preview.", 404);
    }

    wallpaperType = wallpaperProductFromDevice(
      activeOrder.wallpaper_type ||
        (isWallpaperProductId(parsed.data.wallpaperType)
          ? parsed.data.wallpaperType
          : activeOrder.device),
    );
    const product = wallpaperProducts[wallpaperType];
    const stripe = new Stripe(env.STRIPE_SECRET_KEY!, {
      httpClient: Stripe.createFetchHttpClient(),
    });
    const siteUrl = env.NEXT_PUBLIC_SITE_URL!.replace(/\/+$/, "");
    const metadata = {
      orderId,
      packageType,
      wallpaperType,
      device: activeOrder.device,
      ratio: activeOrder.ratio,
      width: String(activeOrder.width),
      height: String(activeOrder.height),
      customWidth: String(activeOrder.device === "custom" ? activeOrder.width : ""),
      customHeight: String(activeOrder.device === "custom" ? activeOrder.height : ""),
      theme: activeOrder.theme,
      style: activeOrder.style,
      mood: activeOrder.mood || activeOrder.style,
      quoteTone: activeOrder.quote_tone,
      promptHash: activeOrder.prompt_hash,
    };
    const sessionParams: Stripe.Checkout.SessionCreateParams = {
      mode: "payment",
      payment_method_types: ["card"],
      automatic_tax: { enabled: true },
      billing_address_collection: "auto",
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/checkout?orderToken=${encodeURIComponent(
        parsed.data.orderToken,
      )}`,
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      metadata,
    };

    const session = await stripe.checkout.sessions.create(sessionParams, {
      idempotencyKey: `checkout:${orderId}:single:${wallpaperType}`,
    });

    if (!session.url) {
      logCheckoutFailure({
        requestId,
        orderId,
        packageType,
        failureReason: "Stripe did not return session URL",
      });
      return checkoutError(safeCheckoutMessage, 503);
    }

    await markOrderPendingPayment(orderId, session.id, packageType);
    void patchOrderTracking(orderId, {
      package_type: packageType,
      wallpaper_type: wallpaperType,
      package_name: product.label,
      amount_cents: product.amount,
      currency: "usd",
      stripe_checkout_session_id: session.id,
      stripe_payment_status: session.payment_status || "unpaid",
      stripe_mode: stripeModeFromSecret(),
      client_ip: requestMetadata.ip,
      client_ip_hash: requestMetadata.ipHash,
      country: requestMetadata.country,
      user_agent: requestMetadata.userAgent,
      referer: requestMetadata.referer,
      utm_source: requestMetadata.utmSource,
      utm_medium: requestMetadata.utmMedium,
      utm_campaign: requestMetadata.utmCampaign,
      landing_path: requestMetadata.landingPath,
    });
    void trackOrderEvent({
      orderId,
      eventType: "checkout_session_created",
      statusBefore: activeOrder.status,
      statusAfter: "pending_payment",
      packageType,
      requestMetadata,
      metadata: {
        requestId,
        selectedPriceEnvName,
        wallpaperType,
        stripeMode: stripeModeFromSecret(),
      },
    });

    return NextResponse.json({
      success: true,
      url: session.url,
    });
  } catch (error) {
    logCheckoutFailure({
      requestId,
      orderId,
      packageType,
      selectedPriceEnvName,
      failureReason: "Stripe session create failed",
      stripeCode: stripeErrorValue(error, "code"),
      stripeType: stripeErrorValue(error, "type"),
      stripeMessage: error instanceof Error ? error.message : "Unknown checkout error",
      envPresence: getRuntimeEnvPresence(),
    });
    void trackOrderEvent({
      orderId,
      eventType: "checkout_failed",
      packageType,
      requestMetadata,
      metadata: {
        requestId,
        reason: "stripe_session_create_failed",
        stripeCode: stripeErrorValue(error, "code"),
        stripeType: stripeErrorValue(error, "type"),
      },
    });
    return checkoutError(safeCheckoutMessage, 503);
  }
}

function getMissingCheckoutEnv(env: ReturnType<typeof getRuntimeEnv>) {
  return [
    ["STRIPE_SECRET_KEY", env.STRIPE_SECRET_KEY],
    ["NEXT_PUBLIC_SITE_URL", env.NEXT_PUBLIC_SITE_URL],
    ["STRIPE_SINGLE_PRICE_ID", env.STRIPE_SINGLE_PRICE_ID],
    ["ORDER_TOKEN_SECRET", env.ORDER_TOKEN_SECRET],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

function validatePriceId(priceId: string | undefined) {
  if (!priceId) {
    return "Missing Stripe price ID";
  }

  if (priceId.startsWith("prod_")) {
    return "Invalid Stripe price ID. Expected price_, got prod_";
  }

  if (!priceId.startsWith("price_")) {
    return "Invalid Stripe price ID. Expected price_";
  }

  return "";
}

function logCheckoutFailure(details: {
  requestId: string;
  orderId?: string;
  packageType?: string;
  wallpaperType?: string;
  selectedPriceEnvName?: string;
  failureReason: string;
  stripeCode?: string;
  stripeType?: string;
  stripeMessage?: string;
  envPresence?: ReturnType<typeof getRuntimeEnvPresence>;
}) {
  console.error("[checkout]", details);
}

function stripeErrorValue(error: unknown, key: "code" | "type") {
  if (!error || typeof error !== "object" || !(key in error)) {
    return undefined;
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : undefined;
}

function checkoutError(message: string, status = 400) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
    },
    { status },
  );
}

function checkoutRateLimitError(retryAfterSeconds: number) {
  return NextResponse.json(
    {
      success: false,
      message: "Too many checkout attempts. Please wait a moment.",
      error: "Too many checkout attempts. Please wait a moment.",
      retryAfterSeconds,
    },
    {
      status: 429,
      headers: {
        "Retry-After": String(retryAfterSeconds),
      },
    },
  );
}
