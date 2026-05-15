import { BadgeCheck, CreditCard, MonitorSmartphone, ShieldCheck } from "lucide-react";
import Link from "next/link";

const trustItems = [
  { icon: BadgeCheck, label: "Free preview" },
  { icon: CreditCard, label: "Secure checkout" },
  { icon: MonitorSmartphone, label: "Phone & desktop" },
  { icon: ShieldCheck, label: "Private by design" },
];

// TODO: Replace these temporary no-text hero images with final editorial photo assets before launch.
const HERO_LIFESTYLE_CARDS = [
  {
    id: "wealth-business",
    label: "Create your future",
    imageSrc: "/examples/hero-wealth-business.jpg",
    alt: "Sunlit luxury home workspace with laptop, notebook, and calm city view",
  },
  {
    id: "family-home",
    label: "What truly matters",
    imageSrc: "/examples/hero-family-home.jpg",
    alt: "Couple sitting together from behind in a warm luxury living room",
  },
  {
    id: "nature",
    label: "Feel the peace",
    imageSrc: "/examples/hero-nature.jpg",
    alt: "Peaceful bedroom with soft linen bedding and a view of nature",
  },
  {
    id: "fitness-health",
    label: "Step into strength",
    imageSrc: "/examples/hero-fitness-health.jpg",
    alt: "Minimal wellness space with yoga mat, towel, and morning sunlight",
  },
  {
    id: "freedom-travel",
    label: "See more of the world",
    imageSrc: "/examples/hero-freedom-travel.jpg",
    alt: "Luxury ocean terrace with suitcase and open coastline view",
  },
  {
    id: "soft-luxury",
    label: "Make it real",
    imageSrc: "/examples/hero-soft-luxury.jpg",
    alt: "Modern luxury home entryway with keys on a stone surface",
  },
];

export function Hero() {
  return (
    <section className="px-4 pb-3 pt-4 sm:px-6 lg:px-8 lg:pb-4 lg:pt-6">
      <div className="mx-auto grid max-w-7xl items-center gap-7 lg:min-h-[calc(100svh-88px)] lg:grid-cols-[0.78fr_1.22fr] xl:gap-10">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(180,150,100,0.25)] bg-white/65 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
            &#10022; CINEMATIC VISUALIZATION WALLPAPER
          </div>

          <h1 className="font-display text-[3.15rem] font-normal leading-[0.92] tracking-[-0.04em] text-ink sm:text-[4rem] lg:text-[5rem]">
            <span className="block">Create a</span>
            <span className="block">wallpaper for</span>
            <span className="block">the future</span>
            <span className="block">
              you&rsquo;re <em className="font-display italic text-cocoa">creating.</em>
            </span>
          </h1>

          <p className="mt-3 max-w-sm text-[13px] font-light leading-6 text-taupe sm:text-[14px]">
            A cinematic daily reminder of why you&rsquo;re working so hard.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/create"
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-[12.5px] font-medium text-pearl transition hover:-translate-y-px hover:bg-cocoa sm:w-auto"
            >
              Create My Wallpaper &rarr;
            </Link>
          </div>

          <div className="mt-3 grid max-w-md grid-cols-2 gap-x-3 gap-y-2">
            {trustItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 text-[11px] font-light text-taupe"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-white/70 text-gold">
                  <item.icon aria-hidden className="h-2.5 w-2.5" />
                </span>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div id="examples" className="scroll-mt-20">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:gap-3.5">
            {HERO_LIFESTYLE_CARDS.map((card) => (
              <article
                key={card.id}
                className="relative aspect-[1.55/1] overflow-hidden rounded-[20px] border border-[rgba(180,160,130,0.18)] bg-[#ddd3c2] shadow-[0_18px_45px_rgba(75,62,48,0.12)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.imageSrc}
                  alt={card.alt}
                  width={1200}
                  height={780}
                  className="h-full w-full object-cover object-center"
                  loading={card.id === "wealth-business" ? "eager" : "lazy"}
                />
                <div className="absolute inset-0 bg-[linear-gradient(to_top,rgba(31,25,18,0.42),rgba(31,25,18,0.10)_40%,transparent_68%)]" />
                <div className="absolute inset-x-3.5 bottom-3.5">
                  <p className="text-[12px] font-medium leading-none tracking-[-0.01em] text-[#fffaf0] drop-shadow-[0_1px_10px_rgba(30,24,18,0.46)] sm:text-[13px]">
                    {card.label}
                  </p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
