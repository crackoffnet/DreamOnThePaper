import { NextResponse } from "next/server";
import Stripe from "stripe";

const plans = {
  single: {
    name: "Dream On The Paper - Single Wallpaper",
    amount: 799,
    envPriceId: "STRIPE_SINGLE_PRICE_ID",
  },
  bundle: {
    name: "Dream On The Paper - Wallpaper Bundle",
    amount: 1299,
    envPriceId: "STRIPE_BUNDLE_PRICE_ID",
  },
} as const;

export async function POST(request: Request) {
  try {
    const { plan } = (await request.json()) as { plan?: keyof typeof plans };
    const selectedPlan = plan && plans[plan] ? plans[plan] : plans.single;
    const baseUrl =
      process.env.NEXT_PUBLIC_BASE_URL ||
      request.headers.get("origin") ||
      "http://localhost:3000";

    if (!process.env.STRIPE_SECRET_KEY) {
      return NextResponse.json({
        url: `${baseUrl}/thank-you?mock_payment=true`,
        mock: true,
      });
    }

    const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
      httpClient: Stripe.createFetchHttpClient(),
    });
    const priceId = process.env[selectedPlan.envPriceId];

    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      success_url: `${baseUrl}/thank-you?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/checkout`,
      line_items: [
        priceId
          ? {
              price: priceId,
              quantity: 1,
            }
          : {
              price_data: {
                currency: "usd",
                product_data: {
                  name: selectedPlan.name,
                },
                unit_amount: selectedPlan.amount,
              },
              quantity: 1,
            },
      ],
    });

    if (!session.url) {
      throw new Error("Stripe did not return a checkout URL.");
    }

    return NextResponse.json({ url: session.url, mock: false });
  } catch (error) {
    console.error("Checkout error", error);
    return NextResponse.json(
      { error: "Unable to start checkout. Please try again." },
      { status: 500 },
    );
  }
}
