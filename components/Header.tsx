import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HowItWorksPopover } from "@/components/HowItWorksPopover";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-[rgba(180,160,130,0.2)] bg-[rgba(245,240,232,0.92)] backdrop-blur-xl">
      <div className="mx-auto flex h-[52px] w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="focus-ring flex items-center gap-2 rounded-full"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-full border border-[rgba(180,160,130,0.22)] bg-white text-gold">
            <svg
              aria-hidden
              viewBox="0 0 32 20"
              className="h-4 w-5"
              fill="none"
            >
              <path
                d="M1.8 10C5.5 4.4 10.1 1.6 15.6 1.6c5.8 0 10.6 2.8 14.6 8.4-4 5.6-8.8 8.4-14.6 8.4C10.1 18.4 5.5 15.6 1.8 10Z"
                stroke="currentColor"
                strokeWidth="1.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M11.4 7.1h4.2v3.6h-4.2zM16.9 5.8h3.5v4.9h-3.5zM13.9 11.9h3.1v2.7h-3.1zM18.3 11.6h2.5v2.2h-2.5z"
                fill="currentColor"
                opacity="0.78"
              />
            </svg>
          </span>
          <span className="text-[13px] font-medium tracking-[-0.01em] text-ink">
            Dream On The Paper
          </span>
        </Link>
        <nav aria-label="Primary" className="flex items-center gap-2">
          <HowItWorksPopover />
          <Link
            href="/create"
            className="focus-ring inline-flex min-h-9 items-center justify-center rounded-full bg-ink px-4 text-[12.5px] font-medium text-pearl transition hover:-translate-y-px hover:bg-cocoa"
          >
            Create
            <ArrowRight aria-hidden className="ml-1 h-3.5 w-3.5" />
          </Link>
        </nav>
      </div>
    </header>
  );
}
