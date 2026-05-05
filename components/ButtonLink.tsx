import Link from "next/link";
import { ArrowRight } from "lucide-react";

type ButtonLinkProps = {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
};

export function ButtonLink({
  href,
  children,
  variant = "primary",
}: ButtonLinkProps) {
  return (
    <Link
      href={href}
      className={
        variant === "primary"
          ? "focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-pearl shadow-soft transition hover:-translate-y-0.5 hover:bg-cocoa"
          : "focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full border border-cocoa/10 bg-white/60 px-6 text-sm font-medium text-ink transition hover:-translate-y-0.5 hover:bg-white"
      }
    >
      {children}
      <ArrowRight aria-hidden className="h-4 w-4" />
    </Link>
  );
}
