import { Monitor, Smartphone, Tablet, WandSparkles } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";

export function Hero() {
  return (
    <section className="px-4 pb-8 pt-2 sm:px-6">
      <div className="mx-auto grid max-w-6xl items-center gap-6 rounded-[1.75rem] border border-white/70 bg-white/45 p-4 shadow-soft backdrop-blur-xl md:grid-cols-[1fr_0.82fr] md:p-6 lg:p-8">
        <div className="max-w-2xl">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-gold/20 bg-white/70 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            <WandSparkles aria-hidden className="h-3.5 w-3.5" />
            AI vision wallpaper
          </div>
          <h1 className="text-4xl font-semibold leading-[1.02] tracking-[-0.03em] text-ink sm:text-5xl lg:text-6xl">
            Create a wallpaper for the life you&apos;re becoming.
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-taupe sm:text-base">
            Answer a few questions and AI turns your dreams, goals, and vision
            into a personalized phone or desktop wallpaper.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/create">Create My Wallpaper</ButtonLink>
            <ButtonLink href="#examples" variant="secondary">
              See Examples
            </ButtonLink>
          </div>
          <div className="mt-6 grid grid-cols-3 gap-2 text-xs text-cocoa">
            {[
              { icon: Smartphone, label: "Mobile" },
              { icon: Monitor, label: "Desktop" },
              { icon: Tablet, label: "Tablet" },
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

        <div className="grid grid-cols-[0.72fr_1fr] items-center gap-3 md:grid-cols-1 lg:grid-cols-[0.7fr_1fr]">
          <div className="mx-auto aspect-[9/16] w-full max-w-[150px] rounded-[1.6rem] border border-white/80 bg-[#f7efe3] p-2 shadow-soft sm:max-w-[190px]">
            <div className="flex h-full flex-col justify-between rounded-[1.15rem] border border-white/70 bg-white/45 p-4">
              <div className="space-y-2">
                <div className="h-16 rounded-2xl bg-linen" />
                <div className="grid grid-cols-2 gap-2">
                  <div className="h-12 rounded-xl bg-mist" />
                  <div className="h-12 rounded-xl bg-[#d4c1a4]" />
                </div>
              </div>
              <p className="font-serif text-lg leading-tight text-ink">
                Softly, steadily, I return to my vision.
              </p>
            </div>
          </div>
          <div className="rounded-[1.4rem] border border-white/70 bg-[#eee5d8] p-3 shadow-sm">
            <div className="aspect-video rounded-2xl border border-white/70 bg-white/45 p-4">
              <div className="mb-10 h-16 rounded-2xl bg-[#d8c7ad]" />
              <p className="font-serif text-xl leading-tight text-ink">
                Clear work. Calm money. Beautiful home.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
