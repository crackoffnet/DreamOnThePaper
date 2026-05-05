import { Brain, Compass, Eye, Heart, Sparkles, SunMedium } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";
import { Hero } from "@/components/Hero";

const examples = [
  {
    title: "Soft Luxury",
    quote: "I move with ease toward what is mine.",
    palette: "from-[#fffaf2] via-[#eadfce] to-[#c8b18a]",
  },
  {
    title: "Dreamy Focus",
    quote: "My vision gets clearer every day.",
    palette: "from-[#f8f6ef] via-[#dedbd2] to-[#b59662]",
  },
  {
    title: "Nature Reset",
    quote: "I grow where I place my attention.",
    palette: "from-[#f7f3e8] via-[#d9d7c8] to-[#9c9b80]",
  },
];

const steps = [
  "Answer guided questions about your goals, lifestyle, and desired feeling.",
  "AI turns your answers into a refined vision board wallpaper prompt.",
  "Download a daily visual reminder for your phone or desktop.",
];

const benefits = [
  {
    icon: Eye,
    title: "Focus",
    body: "Keep your priorities visible without another productivity system.",
  },
  {
    icon: Compass,
    title: "Clarity",
    body: "Translate vague dreams into a calm visual direction.",
  },
  {
    icon: Heart,
    title: "Motivation",
    body: "Meet your future self in a small moment, every day.",
  },
];

export default function Home() {
  return (
    <main>
      <Hero />

      <section id="examples" className="px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 max-w-2xl">
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-gold">
              Examples
            </p>
            <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
              Wallpapers that feel personal, polished, and quietly powerful.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {examples.map((example) => (
              <article
                key={example.title}
                className={`aspect-[4/5] rounded-[1.75rem] bg-gradient-to-br ${example.palette} p-6 shadow-soft`}
              >
                <div className="flex h-full flex-col justify-between rounded-[1.25rem] border border-white/60 bg-white/35 p-6 backdrop-blur-sm">
                  <SunMedium aria-hidden className="h-8 w-8 text-cocoa/70" />
                  <div>
                    <p className="font-serif text-3xl leading-tight text-ink">
                      {example.quote}
                    </p>
                    <p className="mt-5 text-sm font-medium text-cocoa">
                      {example.title}
                    </p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-white/35 px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <p className="text-sm font-medium uppercase tracking-[0.22em] text-gold">
                How it works
              </p>
              <h2 className="mt-3 text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
                Three quiet steps from intention to image.
              </h2>
            </div>
            <div className="grid gap-4">
              {steps.map((step, index) => (
                <div
                  key={step}
                  className="flex gap-5 rounded-3xl border border-white/70 bg-white/55 p-5"
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-ink text-sm font-medium text-pearl">
                    {index + 1}
                  </span>
                  <p className="self-center text-base leading-7 text-cocoa">
                    {step}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="px-5 py-20 sm:px-8 lg:px-10">
        <div className="mx-auto max-w-7xl">
          <div className="mb-10 flex max-w-2xl items-center gap-3">
            <Brain aria-hidden className="h-6 w-6 text-gold" />
            <h2 className="text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
              Designed for the mind you’re training.
            </h2>
          </div>
          <div className="grid gap-5 md:grid-cols-3">
            {benefits.map((benefit) => (
              <article
                key={benefit.title}
                className="rounded-[1.75rem] border border-white/70 bg-white/55 p-6 shadow-sm"
              >
                <benefit.icon aria-hidden className="h-6 w-6 text-gold" />
                <h3 className="mt-8 text-2xl font-semibold text-ink">
                  {benefit.title}
                </h3>
                <p className="mt-3 text-sm leading-6 text-taupe">
                  {benefit.body}
                </p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 lg:px-10">
        <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-8 rounded-[2rem] bg-ink p-8 text-pearl shadow-soft sm:p-12 lg:flex-row lg:items-center">
          <div>
            <Sparkles aria-hidden className="mb-5 h-7 w-7 text-gold" />
            <h2 className="max-w-2xl text-3xl font-semibold tracking-[-0.02em] sm:text-5xl">
              Start with the life you keep picturing.
            </h2>
          </div>
          <ButtonLink href="/create" variant="secondary">
            Create My Wallpaper
          </ButtonLink>
        </div>
      </section>
    </main>
  );
}
