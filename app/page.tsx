import { Header } from "@/components/Header";
import { HomepageStateReset } from "@/components/HomepageStateReset";
import { Hero } from "@/components/Hero";
import { BrandMark } from "@/components/BrandMark";

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
        "Create a personalized cinematic visualization wallpaper for the future you are building.",
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
      <section
        aria-labelledby="how-it-works"
        className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6 lg:grid-cols-3 lg:px-8"
      >
        <div className="lg:col-span-1">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold">
            How it works
          </p>
          <h2
            id="how-it-works"
            className="mt-3 font-display text-3xl font-normal leading-tight tracking-[-0.04em] text-ink sm:text-4xl"
          >
            Turn your future-life vision into a daily wallpaper.
          </h2>
        </div>
        <div className="grid gap-3 text-sm font-light leading-7 text-taupe sm:grid-cols-3 lg:col-span-2">
          <article className="rounded-[20px] border border-[rgba(180,160,130,0.2)] bg-white/45 p-4">
            <h3 className="text-sm font-medium text-ink">Create your vision</h3>
            <p className="mt-2">
              Answer guided prompts about the life you are building, the mood you
              want to feel, and the screen size you need.
            </p>
          </article>
          <article className="rounded-[20px] border border-[rgba(180,160,130,0.2)] bg-white/45 p-4">
            <h3 className="text-sm font-medium text-ink">Preview the concept</h3>
            <p className="mt-2">
              Review a low-resolution cinematic direction before paying, so you
              can decide whether the atmosphere feels right.
            </p>
          </article>
          <article className="rounded-[20px] border border-[rgba(180,160,130,0.2)] bg-white/45 p-4">
            <h3 className="text-sm font-medium text-ink">Download the final</h3>
            <p className="mt-2">
              Unlock a clean high-resolution PNG wallpaper for phone, desktop,
              tablet, laptop, or a custom format.
            </p>
          </article>
        </div>
      </section>
      <footer className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-2 px-4 pb-2 pt-1 text-[10.5px] font-light text-taupe sm:px-6 lg:px-8">
        <span className="flex items-center gap-2">
          <BrandMark className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-[rgba(180,160,130,0.22)] bg-white" imageClassName="h-4 w-4 object-contain" />
          <span>
            Dream On The Paper <span aria-hidden>&middot;</span> Created by GAX
            Global
          </span>
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
          <a href="/privacy" className="transition hover:text-ink">
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
