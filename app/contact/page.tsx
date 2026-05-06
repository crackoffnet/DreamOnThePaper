import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export default function ContactPage() {
  return (
    <main>
      <Header />
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Contact
        </p>
        <h1 className="mt-3 text-4xl font-semibold tracking-[-0.03em] text-ink">
          Contact
        </h1>
        <div className="mt-6 space-y-4 text-sm leading-7 text-taupe">
          <p>
            For support, email{" "}
            <a className="font-medium text-cocoa" href="mailto:support@dreamonthepaper.com">
              support@dreamonthepaper.com
            </a>
            .
          </p>
          <p>
            Created by{" "}
            <a
              className="font-medium text-cocoa"
              href="https://gax-global.com"
              target="_blank"
              rel="noopener noreferrer"
            >
              GAX Global
            </a>
            .
          </p>
        </div>
      </section>
      <Footer />
    </main>
  );
}
