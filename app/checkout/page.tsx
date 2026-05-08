import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Pricing } from "@/components/Pricing";
import { StartOverButton } from "@/components/StartOverButton";
import { verifyCheckoutOrderToken } from "@/lib/order-state";

type CheckoutPageProps = {
  searchParams: Promise<{ orderId?: string; orderToken?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const orderId = params.orderId || "";
  const orderToken = params.orderToken || "";
  const initialOrder = orderToken ? await readCheckoutToken(orderToken) : null;
  const tokenExpired = Boolean(orderToken && !initialOrder);

  console.info(
    JSON.stringify({
      event: "checkout_load",
      hasOrderToken: Boolean(orderToken),
      tokenValid: Boolean(initialOrder),
      orderId: initialOrder?.orderId || orderId || undefined,
    }),
  );

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Link
            href="/create"
            className="focus-ring inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium text-taupe transition hover:text-ink"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Edit answers
          </Link>
          <StartOverButton />
        </div>
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Secure checkout
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl">
            Unlock your final wallpaper.
          </h1>
          <p className="mt-3 text-sm leading-6 text-taupe sm:text-base">
            Pay once to generate and download your high-resolution final PNG wallpaper.
          </p>
          <p className="mt-2 text-sm leading-6 text-cocoa">
            Your preview shows the visual direction, mood, and composition. After payment, we generate a clean high-resolution PNG without the preview watermark.
          </p>
        </div>
        <Pricing
          orderId={initialOrder?.orderId || orderId}
          orderToken={orderToken}
          initialOrder={initialOrder}
          tokenExpired={tokenExpired}
        />
      </div>
    </main>
  );
}

async function readCheckoutToken(orderToken: string) {
  try {
    return await verifyCheckoutOrderToken(orderToken);
  } catch (error) {
    console.error(
      JSON.stringify({
        event: "checkout_token_error",
        error: error instanceof Error ? error.message : "Unknown token error",
      }),
    );
    return null;
  }
}
