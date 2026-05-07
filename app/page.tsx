import { CompactCTA } from "@/components/CompactCTA";
import { ExampleGallery } from "@/components/ExampleGallery";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { HomepageStateReset } from "@/components/HomepageStateReset";
import { Hero } from "@/components/Hero";
import { ValueStrip } from "@/components/ValueStrip";

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
          name: "Single wallpaper",
          price: "4.99",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Mobile + desktop bundle",
          price: "6.99",
          priceCurrency: "USD",
        },
        {
          "@type": "Offer",
          name: "Premium 3-version pack",
          price: "11.99",
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
      <ValueStrip />
      <ExampleGallery />
      <CompactCTA />
      <Footer />
    </main>
  );
}
