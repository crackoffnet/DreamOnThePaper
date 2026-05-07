import {
  ArrowRight,
  BadgeCheck,
  CreditCard,
  MonitorSmartphone,
  Sparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const trustItems = [
  { icon: BadgeCheck, label: "Free preview" },
  { icon: CreditCard, label: "Secure checkout" },
  { icon: MonitorSmartphone, label: "Phone, desktop, tablet" },
  { icon: Sparkles, label: "Personalized final PNG" },
];

export function Hero() {
  return (
    <section className="px-4 pb-3 pt-4 sm:px-6 lg:pb-4">
      <div className="mx-auto grid max-w-6xl items-center gap-5 md:min-h-[calc(100vh-19rem)] md:grid-cols-[1.05fr_0.95fr] lg:gap-8">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(180,150,100,0.25)] bg-white/65 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
            <Sparkles aria-hidden className="h-3 w-3" />
            AI vision board wallpapers
          </div>

          <h1 className="max-w-[9.5ch] font-display text-[2.9rem] font-normal leading-[0.96] tracking-[-0.04em] text-ink sm:text-[3.55rem] lg:text-[4.2rem]">
            Create a wallpaper for the life you&apos;re{" "}
            <em className="font-display italic">becoming.</em>
          </h1>

          <p className="mt-3 max-w-[18rem] text-[13px] font-light leading-6 text-taupe sm:max-w-sm sm:text-[14px]">
            Answer a few thoughtful prompts and generate a personalized phone,
            desktop, or custom wallpaper designed around your goals, mood, and
            future self.
          </p>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
            <Link
              href="/create"
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-full bg-ink px-5 text-[12.5px] font-medium text-pearl transition hover:-translate-y-px hover:bg-cocoa sm:w-auto"
            >
              Create My Wallpaper
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
            <Link
              href="/#examples"
              className="focus-ring inline-flex min-h-11 w-full items-center justify-center rounded-full border border-[rgba(180,160,130,0.22)] bg-white/35 px-5 text-[12.5px] font-medium text-cocoa transition hover:-translate-y-px hover:bg-white/70 hover:text-ink sm:w-auto"
            >
              View Examples
            </Link>
          </div>

          <p className="mt-2 text-[10.5px] font-light tracking-[0.02em] text-taupe">
            From $4.99 · Preview free, pay to download
          </p>

          <div className="mt-4 grid max-w-md grid-cols-2 gap-2">
            {trustItems.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-full border border-[rgba(184,144,42,0.18)] bg-white/42 px-2.5 py-1.5 text-[11px] font-normal text-taupe"
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full border border-gold/30 bg-white text-gold">
                  <item.icon aria-hidden className="h-2.5 w-2.5" />
                </span>
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[286px] overflow-hidden rounded-2xl border border-[rgba(180,160,130,0.22)] bg-[linear-gradient(145deg,rgba(255,255,255,.58),rgba(232,219,198,.42))] p-3 sm:min-h-[330px] lg:min-h-[360px]">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_24%,rgba(184,144,42,0.18),transparent_15rem)]" />

          <div className="absolute right-4 top-5 w-[73%] rounded-2xl border border-white/70 bg-white/45 p-1.5">
            <div className="relative aspect-[16/9] overflow-hidden rounded-xl bg-linen">
              <Image
                src="/examples/wealth-business.jpg"
                alt="Desktop wallpaper concept preview"
                fill
                priority
                sizes="(min-width: 768px) 430px, 78vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/24 via-transparent to-transparent" />
            </div>
          </div>

          <div className="absolute bottom-5 left-5 w-[34%] min-w-[112px] rounded-2xl border border-white/80 bg-[#f7efe3]/82 p-1.5 backdrop-blur">
            <div className="relative aspect-[9/16] overflow-hidden rounded-xl bg-linen">
              <Image
                src="/examples/soft-luxury.jpg"
                alt="Phone wallpaper concept preview"
                fill
                priority
                sizes="180px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/24 via-transparent to-white/5" />
            </div>
          </div>

          <div className="absolute bottom-5 right-5 max-w-[9.5rem] rounded-2xl border border-[rgba(180,160,130,0.24)] bg-pearl/82 p-3 backdrop-blur">
            <p className="text-[9px] font-medium uppercase tracking-[0.16em] text-gold">
              Custom
            </p>
            <p className="mt-1 font-display text-xl font-normal leading-none tracking-[-0.03em] text-ink">
              made for your screen
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
