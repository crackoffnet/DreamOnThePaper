import { BadgeCheck, CreditCard, MonitorSmartphone, ShieldCheck } from "lucide-react";
import Link from "next/link";

const trustItems = [
  { icon: BadgeCheck, label: "Free preview" },
  { icon: CreditCard, label: "Secure checkout" },
  { icon: MonitorSmartphone, label: "Phone & desktop" },
  { icon: ShieldCheck, label: "Private by design" },
];

const heroLifestyleCards = [
  {
    id: "wealth-business",
    overlayLabel: "Create your future",
    imageSrc: "/examples/wealth-business.jpg",
    alt: "Sunlit luxury home workspace with laptop and notebook",
    // TODO: Replace with /examples/hero-wealth-business.jpg when final hero-specific asset is generated.
    visualPrompt:
      "Bright luxury home workspace with laptop, notebook, pen, elegant lamp, refined books, and a simple handleless ceramic coffee cup or cup on saucer. No leafy green vase.",
  },
  {
    id: "family-home",
    overlayLabel: "What truly matters",
    imageSrc: "/examples/family-home.jpg",
    alt: "Couple sitting together from behind in a warm living room",
    // TODO: Replace with /examples/hero-family-home.jpg when final hero-specific asset is generated.
    visualPrompt:
      "A couple together from behind in a beautiful warm home, close and emotionally safe, no visible faces.",
  },
  {
    id: "nature",
    overlayLabel: "Feel the peace",
    imageSrc: "/examples/nature-reset.jpg",
    alt: "Peaceful bedroom overlooking mountains and water",
    // TODO: Replace with /examples/hero-nature.jpg when final hero-specific asset is generated.
    visualPrompt:
      "Bright peaceful bedroom or calm retreat with soft linen bedding, open window, trees, mountains, lake, or morning sky.",
  },
  {
    id: "fitness-health",
    overlayLabel: "Step into strength",
    imageSrc: "/examples/fitness-health.jpg",
    alt: "Minimal wellness space with yoga mat and morning light",
    // TODO: Replace with /examples/hero-fitness-health.jpg when final hero-specific asset is generated.
    visualPrompt:
      "Bright luxury wellness scene with yoga mat, folded towel, water bottle, sunlight on stone or linen textures, no visible face.",
  },
  {
    id: "freedom-travel",
    overlayLabel: "See more of the world",
    imageSrc: "/examples/freedom-travel.jpg",
    alt: "Ocean terrace with suitcase and open coastline",
    // TODO: Replace with /examples/hero-freedom-travel.jpg when final hero-specific asset is generated.
    visualPrompt:
      "Bright aspirational travel scene with ocean terrace, coastal balcony, mountain-sea horizon, or luxury outdoor lounge.",
  },
  {
    id: "soft-luxury",
    overlayLabel: "Make it real",
    imageSrc: "/examples/soft-luxury.jpg",
    alt: "Modern luxury home entryway with keys on stone counter",
    // TODO: Replace with /examples/hero-soft-luxury.jpg when final hero-specific asset is generated.
    visualPrompt:
      "Bright soft-luxury dream home scene with sunlit entryway, warm architecture, stone counter with house keys, terrace, or refined interior detail.",
  },
];

export function Hero() {
  return (
    <section className="px-4 pb-3 pt-4 sm:px-6 lg:px-8 lg:pb-4 lg:pt-6">
      <div className="mx-auto grid max-w-7xl items-center gap-7 lg:min-h-[calc(100svh-88px)] lg:grid-cols-[0.82fr_1.18fr] xl:gap-10">
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
            {heroLifestyleCards.map((card) => (
              <article
                key={card.id}
                className="relative aspect-[1.48/1] overflow-hidden rounded-[22px] border border-white/70 bg-[#ddd3c2] shadow-[0_22px_60px_rgba(75,62,48,0.14)]"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={card.imageSrc}
                  alt={card.alt}
                  width={768}
                  height={520}
                  className="h-full w-full object-cover"
                  loading={card.id === "wealth-business" ? "eager" : "lazy"}
                />
                <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_42%),linear-gradient(to_top,rgba(31,25,18,0.46),rgba(31,25,18,0.12)_44%,transparent_70%)]" />
                <div className="absolute inset-x-4 bottom-4">
                  <p className="text-[12px] font-medium leading-none tracking-[-0.01em] text-[#fffaf0] drop-shadow-[0_1px_10px_rgba(30,24,18,0.42)]">
                    {card.overlayLabel}
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
