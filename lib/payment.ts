import Stripe from "stripe";
import type { PackageId } from "@/lib/plans";
import { packages } from "@/lib/plans";
import { fromBase64Url, getSiteUrl, toBase64Url } from "@/lib/security";
import type { OrderSnapshot } from "@/lib/order-state";

export type PaymentStatus = {
  paid: boolean;
  sessionId: string;
  packageId: PackageId;
  customerEmail?: string | null;
  metadata?: Stripe.Metadata | null;
};

type OrderTokenPayload = {
  sessionId: string;
  packageId: PackageId;
  orderId: string;
  promptHash: string;
  input: OrderSnapshot["input"];
  exp: number;
};

const TOKEN_TTL_SECONDS = 60 * 60 * 6;

export function getStripe() {
  if (!process.env.STRIPE_SECRET_KEY) {
    return null;
  }

  return new Stripe(process.env.STRIPE_SECRET_KEY, {
    httpClient: Stripe.createFetchHttpClient(),
  });
}

export function isPaymentConfigured() {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.NEXT_PUBLIC_SITE_URL);
}

export async function createCheckoutSession(
  packageId: PackageId,
  metadata: Record<string, string>,
) {
  const stripe = getStripe();
  const plan = packages[packageId];
  const siteUrl = getSiteUrl();

  if (!stripe || !process.env.NEXT_PUBLIC_SITE_URL) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Stripe is not configured.");
    }

    return {
      sessionId: `dev_mock_${Date.now()}`,
      url: `${siteUrl}/success?session_id=dev_mock_${Date.now()}`,
      mock: true,
    };
  }

  const session = await stripe.checkout.sessions.create(
    {
      mode: "payment",
      payment_method_types: ["card"],
      success_url: `${siteUrl}/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/create`,
      metadata: {
        packageId,
        ...metadata,
      },
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: `Dream On The Paper - ${plan.name}`,
              description: plan.description,
            },
            unit_amount: plan.amount,
          },
          quantity: 1,
        },
      ],
    },
    {
      idempotencyKey: `checkout:${metadata.orderId}`,
    },
  );

  if (!session.url) {
    throw new Error("Stripe did not return a Checkout URL.");
  }

  return { sessionId: session.id, url: session.url, mock: false };
}

export async function verifyStripePayment(sessionId: string): Promise<PaymentStatus> {
  if (sessionId.startsWith("dev_mock_") && process.env.NODE_ENV !== "production") {
    return {
      paid: true,
      sessionId,
      packageId: "single",
      customerEmail: null,
    };
  }

  const stripe = getStripe();
  if (!stripe) {
    throw new Error("Stripe is not configured.");
  }

  const session = await stripe.checkout.sessions.retrieve(sessionId);
  const packageId = session.metadata?.packageId as PackageId | undefined;

  if (!packageId || !(packageId in packages)) {
    throw new Error("Invalid package metadata.");
  }

  return {
    paid: session.payment_status === "paid",
    sessionId: session.id,
    packageId,
    customerEmail: session.customer_details?.email,
    metadata: session.metadata,
  };
}

export async function signOrderToken(status: PaymentStatus, order: OrderSnapshot) {
  const payload: OrderTokenPayload = {
    sessionId: status.sessionId,
    packageId: status.packageId,
    orderId: order.orderId,
    promptHash: order.promptHash,
    input: order.input,
    exp: Math.floor(Date.now() / 1000) + TOKEN_TTL_SECONDS,
  };
  const encodedPayload = toBase64Url(
    new TextEncoder().encode(JSON.stringify(payload)),
  );
  const signature = await signValue(encodedPayload);

  return `${encodedPayload}.${signature}`;
}

export async function verifyOrderToken(token: string) {
  const [encodedPayload, signature] = token.split(".");

  if (!encodedPayload || !signature) {
    return null;
  }

  const expected = await signValue(encodedPayload);
  if (expected !== signature) {
    return null;
  }

  try {
    const payload = JSON.parse(
      new TextDecoder().decode(fromBase64Url(encodedPayload)),
    ) as OrderTokenPayload;

    if (payload.exp <= Math.floor(Date.now() / 1000)) {
      return null;
    }

    if (!(payload.packageId in packages)) {
      return null;
    }

    return payload;
  } catch {
    return null;
  }
}

async function signValue(value: string) {
  const secret =
    process.env.ORDER_TOKEN_SECRET ||
    (process.env.NODE_ENV !== "production" ? "dev-order-token-secret" : "");

  if (!secret) {
    throw new Error("ORDER_TOKEN_SECRET is not configured.");
  }

  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(value),
  );

  return toBase64Url(signature);
}
