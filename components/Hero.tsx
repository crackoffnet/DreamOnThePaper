import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  MonitorSmartphone,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { exampleWallpapers } from "@/lib/exampleWallpapers";

const trustItems = [
  { icon: BadgeCheck, label: "Free preview" },
  { icon: CreditCard, label: "Secure checkout" },
  { icon: MonitorSmartphone, label: "Phone & desktop" },
  { icon: ShieldCheck, label: "Private by design" },
];

export function Hero() {
  return (
    <section className="px-4 pb-2 pt-3 sm:px-6 lg:px-8 lg:pb-2 lg:pt-4">
      <div className="mx-auto grid max-w-7xl items-center gap-5 lg:grid-cols-[0.94fr_1.06fr] xl:gap-9">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(180,150,100,0.25)] bg-white/65 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
            <Sparkles aria-hidden className="h-3 w-3" />
            Cinematic visualization wallpaper
          </div>

          <h1 className="max-w-[11ch] font-display text-[3.15rem] font-normal leading-[0.92] tracking-[-0.04em] text-ink sm:text-[4rem] lg:text-[4.95rem]">
            Create a wallpaper for the future you&apos;re{" "}
            <em className="font-display italic text-cocoa">creating.</em>
          </h1>

          <p className="mt-3 max-w-sm text-[13px] font-light leading-6 text-taupe sm:text-[14px]">
            A cinematic daily reminder of why you&apos;re working so hard.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/create"
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-[12.5px] font-medium text-pearl transition hover:-translate-y-px hover:bg-cocoa sm:w-auto"
            >
              Create My Wallpaper
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
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
            {exampleWallpapers.map((example) => (
              <Link
                key={example.id}
                href={`/create?mood=${encodeURIComponent(example.id)}`}
                className="focus-ring group block rounded-[18px]"
                aria-label={`Start with ${example.phrase}`}
              >
                <article
                  className="relative aspect-[1.08/1] overflow-hidden rounded-[18px] border border-white/60 bg-[#ddd3c2] shadow-[0_18px_48px_rgba(75,62,48,0.12)] transition duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-gold/35 group-hover:shadow-[0_22px_58px_rgba(75,62,48,0.16)] sm:aspect-[1.05/1] lg:h-[clamp(142px,20svh,188px)] lg:aspect-auto"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={example.image}
                    alt={example.alt}
                    width={768}
                    height={1152}
                    className="h-full w-full object-cover transition duration-500 ease-out group-hover:scale-[1.018]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.22),transparent_42%),linear-gradient(to_top,rgba(38,31,25,0.38),rgba(38,31,25,0.08)_46%,transparent_72%)]" />
                  <div className="absolute inset-x-4 bottom-4">
                    <p className="font-display text-[1.28rem] font-normal leading-none tracking-[0] text-[#fffaf0]/90 drop-shadow-[0_1px_12px_rgba(30,24,18,0.28)] sm:text-[1.18rem] lg:text-[clamp(1rem,1.28vw,1.22rem)]">
                      {example.phrase}
                    </p>
                    <span className="mt-2 block h-px w-12 bg-[#fffaf0]/60" />
                  </div>
                </article>
              </Link>
            ))}
          </div>
          <p className="mt-3 text-center text-[12px] font-light text-taupe">
            From $4.99 <span aria-hidden>&middot;</span> preview free, pay to
            download
          </p>
        </div>
      </div>
    </section>
  );
}
