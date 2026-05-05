import { Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";

export function CompactCTA() {
  return (
    <section className="px-4 py-8 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-5 rounded-2xl border border-white/70 bg-ink p-5 text-pearl shadow-soft sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-3">
          <Sparkles aria-hidden className="mt-1 h-5 w-5 shrink-0 text-gold" />
          <div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em]">
              Make the wallpaper your future self keeps seeing.
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-pearl/70">
              Choose a device, answer a few compact prompts, and generate a
              polished visual reminder.
            </p>
          </div>
        </div>
        <ButtonLink href="/create" variant="secondary">
          Create My Wallpaper
        </ButtonLink>
      </div>
    </section>
  );
}
