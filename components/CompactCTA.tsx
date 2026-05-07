import { Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";

export function CompactCTA() {
  return (
    <section className="px-4 py-5 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 overflow-hidden rounded-2xl border border-ink/10 bg-[linear-gradient(135deg,#1e1a16,#352d24)] p-4 text-pearl sm:flex-row sm:items-center sm:justify-between sm:p-5">
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-white/10 bg-white/10 text-gold">
            <Sparkles aria-hidden className="h-3.5 w-3.5" />
          </span>
          <div>
            <h2 className="max-w-xl font-display text-[2rem] font-normal leading-none tracking-[-0.04em] sm:text-[2.45rem]">
              Make the wallpaper your future self keeps seeing.
            </h2>
            <p className="mt-2 max-w-2xl text-[13px] font-light leading-6 text-pearl/72">
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
