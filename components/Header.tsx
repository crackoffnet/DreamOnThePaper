import Link from "next/link";
import { Sparkles } from "lucide-react";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(180,160,130,0.2)] bg-[rgba(245,240,232,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex h-12 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 rounded-full"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(180,160,130,0.22)] bg-white text-gold">
            <Sparkles aria-hidden className="h-3.5 w-3.5" />
          </span>
          <span className="text-[13px] font-medium tracking-[-0.01em] text-ink">
            Dream On The Paper
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <Link
            href="/#examples"
            className="focus-ring hidden rounded-full px-3 py-2 text-[12.5px] font-medium text-taupe transition hover:text-ink sm:inline-flex"
          >
            Examples
          </Link>
          <Link
            href="/create"
            className="focus-ring inline-flex min-h-9 items-center justify-center rounded-full bg-ink px-4 text-[12.5px] font-medium text-pearl transition hover:-translate-y-px hover:bg-cocoa"
          >
            Create
          </Link>
        </nav>
      </div>
    </header>
  );
}
