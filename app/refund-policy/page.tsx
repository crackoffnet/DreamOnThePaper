import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function RefundPolicyPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Refunds
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-ink">
          Refund Policy
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-taupe">
          <p>
            Because wallpapers are personalized digital products, all sales are
            final once the final image is generated.
          </p>
          <p>
            If there is a technical issue that prevents delivery or produces a
            broken file, we will provide a replacement or correction.
          </p>
          <p>
            Contact support with your checkout session details so we can review
            the issue safely without asking for payment card information.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
