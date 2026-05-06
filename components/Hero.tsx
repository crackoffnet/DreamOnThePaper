import {
  Monitor,
  Ruler,
  Smartphone,
  Sparkles,
  WandSparkles,
} from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";

export function Hero() {
  return (
    <section className="px-4 pb-7 pt-2 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-5 overflow-hidden rounded-[1.75rem] border border-white/70 bg-[linear-gradient(135deg,rgba(255,250,240,.82),rgba(232,220,202,.58),rgba(255,255,255,.36))] p-4 shadow-soft backdrop-blur-xl md:grid-cols-[1fr_0.82fr] md:p-6 lg:p-7">
        <div className="max-w-2xl">
          <p className="mb-2 text-sm font-semibold tracking-wide text-ink">
            Dream On The Paper
          </p>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            <WandSparkles aria-hidden className="h-3.5 w-3.5" />
            AI vision board wallpapers
          </div>
          <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.55rem]">
            Create a wallpaper for the life you&apos;re becoming.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-taupe sm:text-base">
            Answer a few questions and turn your dreams, goals, and vision into
            a personalized phone or desktop wallpaper.
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/create">Create My Wallpaper</ButtonLink>
            <ButtonLink href="#examples" variant="secondary">
              View examples
            </ButtonLink>
          </div>
          <div className="mt-5 grid grid-cols-3 gap-2 text-xs text-cocoa">
            {[
              { icon: Smartphone, label: "Mobile" },
              { icon: Monitor, label: "Desktop" },
              { icon: Ruler, label: "Custom size" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-2 rounded-2xl border border-cocoa/10 bg-white/55 px-3 py-2"
              >
                <item.icon aria-hidden className="h-4 w-4 text-gold" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[255px]">
          <div className="absolute inset-0 rounded-[2rem] bg-[radial-gradient(circle_at_30%_20%,rgba(255,255,255,.82),transparent_9rem),linear-gradient(145deg,rgba(183,150,92,.24),rgba(236,229,216,.52))]" />
          <div className="relative mx-auto grid max-w-md grid-cols-[0.65fr_1fr] items-center gap-3 p-3">
            <div className="aspect-[9/16] rounded-[1.6rem] border border-white/80 bg-[#f7efe3] p-2 shadow-soft">
              <div className="flex h-full flex-col justify-between overflow-hidden rounded-[1.15rem] border border-white/70 bg-[linear-gradient(160deg,#fff8ee,#ddc9a7,#a58f66)] p-4">
                <div className="space-y-2">
                  <div className="h-16 rounded-2xl bg-white/50" />
                  <div className="grid grid-cols-2 gap-2">
                    <div className="h-12 rounded-xl bg-white/40" />
                    <div className="h-12 rounded-xl bg-ink/10" />
                  </div>
                </div>
                <p className="font-serif text-lg leading-tight text-ink">
                  I move with ease toward what is mine.
                </p>
              </div>
            </div>
            <div className="rounded-[1.4rem] border border-white/70 bg-[#eee5d8] p-3 shadow-soft">
              <div className="aspect-video rounded-2xl border border-white/70 bg-[linear-gradient(135deg,#f8f1e5,#d3c0a0,#766e64)] p-4">
                <div className="mb-8 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-white/65" />
                  <span className="h-2 w-10 rounded-full bg-white/45" />
                </div>
                <p className="max-w-[11rem] font-serif text-xl leading-tight text-white">
                  Clear work. Calm money. Better rooms.
                </p>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-cocoa">
                {["Mobile", "Desktop", "Custom"].map((label) => (
                  <span
                    key={label}
                    className="rounded-full border border-white/70 bg-white/55 px-2 py-1 text-center"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
            <div className="absolute right-2 top-2 rounded-full border border-white/70 bg-white/70 p-2 text-gold shadow-sm">
              <Sparkles aria-hidden className="h-4 w-4" />
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
