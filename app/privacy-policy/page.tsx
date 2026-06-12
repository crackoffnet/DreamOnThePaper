import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { SITE_URL } from "@/lib/site";

export const metadata: Metadata = {
  title: "Privacy Policy | Dream On The Paper",
  description:
    "Read the Dream On The Paper privacy policy covering order handling, checkout, and private wallpaper delivery.",
  alternates: {
    canonical: `${SITE_URL}/privacy`,
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function PrivacyPolicyPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Privacy
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-ink">
          Privacy Policy
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-taupe">
          <p>
            Dream On The Paper collects only the information needed to create and
            deliver your personalized wallpaper, process checkout, and respond to
            support requests.
          </p>
          <p>
            Payment is handled by Stripe Checkout. We do not receive or store your
            full card details. Image generation is handled server-side and secret
            API keys are never exposed to the browser.
          </p>
          <div>
            <h2 className="text-base font-medium tracking-[-0.02em] text-ink">
              Analytics and session insights
            </h2>
            <p className="mt-2">
              We use Microsoft Clarity to understand how visitors interact with
              our website, improve usability, identify errors, and make the
              product experience better. Clarity may collect usage data such as
              clicks, scrolls, page interactions, browser/device information,
              and approximate location based on IP address. We do not use
              Clarity to intentionally collect sensitive personal information or
              payment details.
            </p>
            <p className="mt-2">
              Payment information is processed by Stripe and is not collected by
              Dream On The Paper through Clarity.
            </p>
          </div>
          <p>
            Generated images and temporary order data are currently stored only as
            needed for delivery. Future durable storage should use Cloudflare R2
            for files and D1/KV for order metadata.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
