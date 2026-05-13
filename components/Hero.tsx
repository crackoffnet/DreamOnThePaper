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

        <div id="examples" className="scroll-mt-20 overflow-hidden">
          <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-3 sm:gap-3 sm:overflow-visible sm:px-0 sm:pb-0">
            {exampleWallpapers.map((example) => (
              <Link
                key={example.id}
                href={`/create?mood=${encodeURIComponent(example.id)}`}
                className="focus-ring group block min-w-[78vw] snap-start rounded-[22px] sm:min-w-0"
                aria-label={`Start with ${example.title} mood`}
              >
                <article
                  className="relative aspect-[0.68/1] overflow-hidden rounded-[20px] border border-[rgba(180,160,130,0.22)] bg-[#ddd3c2] transition duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-gold/45 sm:aspect-auto sm:h-[clamp(190px,25svh,232px)]"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={example.image}
                    alt={`${example.title} wallpaper example`}
                    width={768}
                    height={1152}
                    className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.015]"
                    loading="lazy"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_38%),linear-gradient(to_top,rgba(30,26,22,0.45),rgba(30,26,22,0.05)_48%,transparent)]" />
                  <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-pearl/78 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.13em] text-cocoa backdrop-blur-md">
                    {example.title}
                  </span>
                  <p className="absolute inset-x-3 bottom-3 max-w-[86%] text-[12px] font-medium uppercase tracking-[0.13em] text-[#fffaf0] drop-shadow-[0_1px_10px_rgba(30,26,22,0.36)]">
                    {example.mood}
                  </p>
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
