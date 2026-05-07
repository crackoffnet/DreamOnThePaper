import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/50 bg-pearl/80 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-3 sm:px-6">
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 rounded-full"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-full border border-white/80 bg-white/70 text-gold shadow-sm">
            <Sparkles aria-hidden className="h-4 w-4" />
          </span>
          <span className="text-sm font-semibold tracking-[-0.01em] text-ink">
            Dream On The Paper
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link
            href="/#examples"
            className="focus-ring hidden rounded-full px-3 py-2 text-sm font-medium text-taupe transition hover:text-ink sm:inline-flex"
          >
            Examples
          </Link>
          <Link
            href="/create"
            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-medium text-pearl shadow-sm transition hover:-translate-y-0.5 hover:bg-cocoa"
          >
            Create
          </Link>
        </nav>
      </div>
    </header>
  );
}
