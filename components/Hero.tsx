import { Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";

export function Hero() {
  return (
    <section className="mx-auto flex min-h-[88vh] w-full max-w-7xl flex-col justify-center px-5 pb-16 pt-6 sm:px-8 lg:px-10">
      <nav className="mb-16 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/70 text-gold shadow-sm">
            <Sparkles aria-hidden className="h-5 w-5" />
          </div>
          <span className="text-sm font-semibold tracking-wide text-ink">
            Dream On The Paper
          </span>
        </div>
        <ButtonLink href="/create" variant="secondary">
          Create
        </ButtonLink>
      </nav>

      <div className="grid items-center gap-12 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="max-w-3xl">
          <p className="mb-5 text-sm font-medium uppercase tracking-[0.22em] text-gold">
            AI vision board wallpaper
          </p>
          <h1 className="text-5xl font-semibold leading-[0.98] tracking-[-0.02em] text-ink sm:text-6xl lg:text-7xl">
            Turn your dream life into a wallpaper you see every day.
          </h1>
          <p className="mt-7 max-w-2xl text-lg leading-8 text-taupe sm:text-xl">
            Answer a few questions. Let AI design a personalized vision board
            you’ll see every day.
          </p>
          <div className="mt-10 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/create">Create My Wallpaper</ButtonLink>
            <ButtonLink href="#examples" variant="secondary">
              View Examples
            </ButtonLink>
          </div>
        </div>

        <div className="relative mx-auto aspect-[9/16] w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/80 bg-[#f8f1e6] p-5 shadow-soft">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_18%,rgba(181,150,98,0.25),transparent_16rem)]" />
          <div className="relative flex h-full flex-col justify-between rounded-[1.5rem] border border-white/70 bg-white/55 p-7 backdrop-blur">
            <div>
              <div className="h-32 rounded-3xl bg-linen" />
              <div className="mt-4 grid grid-cols-2 gap-4">
                <div className="h-24 rounded-3xl bg-mist" />
                <div className="h-24 rounded-3xl bg-[#dfd3bd]" />
              </div>
            </div>
            <div>
              <p className="font-serif text-3xl leading-tight text-ink">
                Become the life you keep imagining.
              </p>
              <div className="mt-5 h-px bg-gold/40" />
              <p className="mt-5 text-sm leading-6 text-taupe">
                clarity - softness - wealth - health - love
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
