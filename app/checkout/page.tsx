import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Pricing } from "@/components/Pricing";

type CheckoutPageProps = {
  searchParams: Promise<{ orderId?: string }>;
};

export default async function CheckoutPage({ searchParams }: CheckoutPageProps) {
  const params = await searchParams;
  const orderId = params.orderId || "";

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/create"
          className="focus-ring mb-6 inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium text-taupe transition hover:text-ink"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Edit answers
        </Link>
        <div className="mb-6 max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Secure checkout
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink sm:text-5xl">
            Choose your package.
          </h1>
          <p className="mt-3 text-sm leading-6 text-taupe sm:text-base">
            Payment is verified server-side before final generation and download.
          </p>
        </div>
        <Pricing orderId={orderId} />
      </div>
    </main>
  );
}
