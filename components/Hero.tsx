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

const cardTextures = [
  "radial-gradient(circle at 20% 18%, rgba(255,255,255,0.40), transparent 7rem), radial-gradient(circle at 82% 78%, rgba(255,250,240,0.24), transparent 8rem)",
  "radial-gradient(circle at 82% 16%, rgba(255,255,255,0.30), transparent 7rem), linear-gradient(105deg, transparent 0 46%, rgba(255,255,255,0.16) 46% 49%, transparent 49%)",
  "radial-gradient(circle at 18% 82%, rgba(255,255,255,0.30), transparent 8rem), radial-gradient(circle at 90% 10%, rgba(245,240,232,0.22), transparent 6rem)",
  "radial-gradient(circle at 16% 16%, rgba(255,255,255,0.26), transparent 6rem), linear-gradient(145deg, transparent 0 52%, rgba(30,26,22,0.11) 52% 55%, transparent 55%)",
  "radial-gradient(circle at 78% 18%, rgba(255,255,255,0.31), transparent 7rem), radial-gradient(circle at 16% 86%, rgba(255,250,240,0.24), transparent 8rem)",
  "radial-gradient(circle at 20% 22%, rgba(255,255,255,0.28), transparent 7rem), linear-gradient(155deg, transparent 0 50%, rgba(255,255,255,0.14) 50% 53%, transparent 53%)",
];

function CardScene({ id }: { id: string }) {
  if (id === "soft-luxury") {
    return (
      <>
        <div className="absolute -left-8 top-0 h-full w-24 rotate-6 rounded-full bg-white/18 blur-sm" />
        <div className="absolute right-5 top-12 h-32 w-10 rotate-12 rounded-full border border-white/20 bg-white/12" />
        <div className="absolute right-8 bottom-14 h-14 w-10 rounded-b-full rounded-t-[999px] border border-white/25 bg-pearl/18" />
        <div className="absolute right-6 bottom-11 h-3 w-16 rounded-full bg-white/20" />
      </>
    );
  }

  if (id === "wealth-business") {
    return (
      <>
        <div className="absolute left-6 top-16 h-16 w-24 rounded-lg border border-white/22 bg-white/12" />
        <div className="absolute left-8 top-[5.1rem] h-px w-20 bg-white/25" />
        <div className="absolute right-6 top-8 h-16 w-16 rounded-full bg-gold/12" />
        <div className="absolute bottom-14 right-5 h-10 w-20 rounded-xl border border-white/20 bg-ink/8" />
        <div className="absolute bottom-11 left-4 h-px w-[78%] bg-white/24" />
      </>
    );
  }

  if (id === "nature-reset") {
    return (
      <>
        <div className="absolute bottom-16 left-0 h-24 w-[55%] rounded-tr-[90px] bg-white/13" />
        <div className="absolute bottom-12 right-0 h-28 w-[62%] rounded-tl-[110px] bg-ink/8" />
        <div className="absolute left-8 top-12 h-20 w-20 rounded-full border border-white/20 bg-white/10" />
        <div className="absolute left-5 top-6 h-20 w-px rotate-[-24deg] bg-white/25" />
        <div className="absolute left-8 top-10 h-8 w-12 rotate-[-24deg] rounded-full border border-white/20" />
      </>
    );
  }

  if (id === "fitness-health") {
    return (
      <>
        <div className="absolute bottom-16 left-5 h-16 w-[70%] rotate-[-8deg] rounded-2xl border border-white/18 bg-white/12" />
        <div className="absolute right-7 top-14 h-20 w-7 rounded-full border border-white/24 bg-pearl/16" />
        <div className="absolute right-16 bottom-14 h-11 w-11 rounded-full border border-white/22 bg-ink/8" />
        <div className="absolute right-8 bottom-11 h-7 w-7 rounded-full border border-white/22 bg-white/13" />
      </>
    );
  }

  if (id === "family-home") {
    return (
      <>
        <div className="absolute right-5 top-8 h-28 w-20 rounded-t-full border border-white/18 bg-white/11" />
        <div className="absolute left-5 bottom-16 h-12 w-[70%] rounded-2xl bg-ink/8" />
        <div className="absolute left-8 bottom-12 h-5 w-16 rounded-full bg-white/18" />
        <div className="absolute right-10 bottom-12 h-12 w-8 rounded-t-full border border-white/20 bg-pearl/15" />
      </>
    );
  }

  return (
    <>
      <div className="absolute left-0 top-24 h-px w-full bg-white/25" />
      <div className="absolute bottom-14 left-4 h-20 w-[78%] rounded-[999px] border border-white/18 bg-white/10" />
      <div className="absolute right-7 top-10 h-14 w-14 rounded-full bg-white/18" />
      <div className="absolute left-6 bottom-20 h-px w-[72%] rotate-[-8deg] bg-white/25" />
    </>
  );
}

export function Hero() {
  return (
    <section className="px-4 pb-2 pt-3 sm:px-6 lg:px-8 lg:pb-2 lg:pt-4">
      <div className="mx-auto grid max-w-7xl items-center gap-5 lg:grid-cols-[0.94fr_1.06fr] xl:gap-9">
        <div className="max-w-xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-[rgba(180,150,100,0.25)] bg-white/65 px-3 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-gold">
            <Sparkles aria-hidden className="h-3 w-3" />
            AI vision board wallpapers
          </div>

          <h1 className="max-w-[9.5ch] font-display text-[3.15rem] font-normal leading-[0.92] tracking-[-0.04em] text-ink sm:text-[4rem] lg:text-[4.95rem]">
            Create a wallpaper for the life you&apos;re{" "}
            <em className="font-display italic text-cocoa">becoming.</em>
          </h1>

          <p className="mt-3 max-w-sm text-[13px] font-light leading-6 text-taupe sm:text-[14px]">
            Answer a few thoughtful prompts and generate a personalized phone,
            desktop, or custom wallpaper around your goals and future self.
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
            {exampleWallpapers.map((example, index) => (
              <Link
                key={example.id}
                href={`/create?mood=${encodeURIComponent(example.id)}`}
                className="focus-ring group block min-w-[78vw] snap-start rounded-[22px] sm:min-w-0"
                aria-label={`Start with ${example.title} mood`}
              >
                <article
                  className="relative aspect-[0.68/1] overflow-hidden rounded-[20px] border border-[rgba(180,160,130,0.22)] transition duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-gold/45 sm:aspect-auto sm:h-[clamp(190px,25svh,232px)]"
                  style={{ background: example.gradient }}
                >
                  <div
                    className="absolute inset-0 opacity-95"
                    style={{ background: cardTextures[index] }}
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.18),transparent_38%),linear-gradient(to_top,rgba(30,26,22,0.45),rgba(30,26,22,0.05)_48%,transparent)]" />
                  <CardScene id={example.id} />
                  <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-pearl/78 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.13em] text-cocoa backdrop-blur-md">
                    {example.title}
                  </span>
                  <p className="absolute inset-x-3 bottom-3 max-w-[86%] font-display text-[1.38rem] font-normal italic leading-[1.03] tracking-[-0.035em] text-[#fffaf0] drop-shadow-[0_1px_10px_rgba(30,26,22,0.36)] sm:text-[1.42rem] lg:text-[1.5rem]">
                    {example.quote}
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
