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
          ? "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[12.5px] font-medium text-pearl transition hover:-translate-y-px hover:bg-cocoa"
          : "focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cocoa/10 bg-white/70 px-5 text-[12.5px] font-medium text-ink transition hover:-translate-y-px hover:bg-white"
      }
    >
      {children}
      <ArrowRight aria-hidden className="h-4 w-4" />
    </Link>
  );
}
