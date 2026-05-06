import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

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
