import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 border-t border-[rgba(180,160,130,0.2)] px-4 py-5 text-[11.5px] font-light text-taupe sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <div className="max-w-sm">
        <p className="text-[13px] font-medium text-ink">Dream On The Paper</p>
        <p className="mt-1">
          Created by{" "}
          <a
            href="https://gax-global.com"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-cocoa transition hover:text-ink"
          >
            GAX Global
          </a>
        </p>
        <p className="mt-1">
          AI product design and cloud engineering by GAX Global.
        </p>
      </div>
      <div className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end">
        <Link href="/create" className="transition hover:text-ink">
          Create
        </Link>
        <Link href="/#examples" className="transition hover:text-ink">
          Examples
        </Link>
        <Link href="/about" className="transition hover:text-ink">
          About
        </Link>
        <Link href="/privacy-policy" className="transition hover:text-ink">
          Privacy
        </Link>
        <Link href="/terms" className="transition hover:text-ink">
          Terms
        </Link>
        <Link href="/refund-policy" className="transition hover:text-ink">
          Refund Policy
        </Link>
        <Link href="/contact" className="transition hover:text-ink">
          Contact
        </Link>
      </div>
    </footer>
  );
}
