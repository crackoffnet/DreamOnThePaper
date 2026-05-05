import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Pricing } from "@/components/Pricing";

export default function CheckoutPage() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/create"
          className="focus-ring mb-12 inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium text-taupe transition hover:text-ink"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Edit answers
        </Link>
        <div className="mb-10 max-w-3xl">
          <p className="text-sm font-medium uppercase tracking-[0.22em] text-gold">
            Checkout
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-6xl">
            Choose your wallpaper format.
          </h1>
          <p className="mt-5 text-base leading-7 text-taupe sm:text-lg">
            Your generated preview is ready. Complete checkout to unlock the
            download experience.
          </p>
        </div>
        <Pricing />
      </div>
    </main>
  );
}
