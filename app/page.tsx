import { Header } from "@/components/Header";
import { HomepageStateReset } from "@/components/HomepageStateReset";
import { Hero } from "@/components/Hero";

const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebApplication",
      name: "Dream On The Paper",
      applicationCategory: "DesignApplication",
      operatingSystem: "Web",
      url: "https://www.dreamonthepaper.com",
      description:
        "Create personalized AI-generated phone, desktop, and tablet wallpapers based on your goals, dreams, and vision.",
      offers: [
        {
          "@type": "Offer",
          name: "Mobile wallpaper",
          price: "4.99",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Tablet wallpaper",
          price: "4.99",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Desktop wallpaper",
          price: "4.99",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Custom size wallpaper",
          price: "4.99",
          priceCurrency: "USD",
        },
      ],
      creator: {
        "@id": "https://gax-global.com/#organization",
      },
    },
    {
      "@type": "Organization",
      "@id": "https://gax-global.com/#organization",
      name: "GAX Global",
      url: "https://gax-global.com",
    },
  ],
};

export default function Home() {
  return (
    <main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <Header />
      <HomepageStateReset />
      <Hero />
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-1 text-[10.5px] font-light text-taupe sm:px-6 lg:px-8">
        <span>
          Dream On The Paper <span aria-hidden>&middot;</span> Created by GAX
          Global
        </span>
        <nav className="flex flex-wrap gap-x-3 gap-y-1" aria-label="Footer">
          <a
            href="https://gax-global.com"
            target="_blank"
            rel="noopener noreferrer"
            className="transition hover:text-ink"
          >
            GAX Global
          </a>
          <a href="/privacy-policy" className="transition hover:text-ink">
            Privacy
          </a>
          <a href="/terms" className="transition hover:text-ink">
            Terms
          </a>
          <a href="/contact" className="transition hover:text-ink">
            Contact
          </a>
        </nav>
      </footer>
    </main>
  );
}
