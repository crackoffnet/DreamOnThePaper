import { Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";

export function CompactCTA() {
  return (
    <section className="px-4 py-7 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 overflow-hidden rounded-[1.5rem] border border-ink/10 bg-[linear-gradient(135deg,#292621,#3a332c)] p-5 text-pearl shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-gold">
            <Sparkles aria-hidden className="h-4 w-4" />
          </span>
          <div>
            <h2 className="max-w-xl text-2xl font-semibold leading-tight tracking-[-0.03em] sm:text-3xl">
              Make the wallpaper your future self keeps seeing.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pearl/70">
              Choose your device, answer a few thoughtful prompts, and generate
              a polished visual reminder.
            </p>
          </div>
        </div>
        <div className="shrink-0">
          <ButtonLink href="/create" variant="secondary">
            Create My Wallpaper
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
