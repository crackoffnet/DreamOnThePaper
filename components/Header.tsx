import Link from "next/link";
import { Sparkles } from "lucide-react";
import { ButtonLink } from "@/components/ButtonLink";

export function Header() {
  return (
    <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
      <Link href="/" className="focus-ring flex items-center gap-2 rounded-full">
        <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/70 bg-white/70 text-gold shadow-sm">
          <Sparkles aria-hidden className="h-4 w-4" />
        </span>
        <span className="text-sm font-semibold tracking-wide text-ink">
          Dream On The Paper
        </span>
      </Link>
      <ButtonLink href="/create" variant="secondary">
        Create
      </ButtonLink>
    </header>
  );
}
