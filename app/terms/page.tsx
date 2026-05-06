import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function TermsPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Terms
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-ink">
          Terms of Use
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-taupe">
          <p>
            Dream On The Paper creates personalized AI-generated wallpapers from
            the information you provide. You agree not to submit abusive,
            unlawful, or infringing requests.
          </p>
          <p>
            The service is provided as a digital creative product. We may reject
            requests that violate safety, payment, or platform requirements.
          </p>
          <p>
            You are responsible for keeping your download link and order details
            private. Do not share another person&apos;s private generated wallpaper
            without permission.
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
