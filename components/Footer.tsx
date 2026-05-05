import Link from "next/link";

export function Footer() {
  return (
    <footer className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-8 text-xs text-taupe sm:flex-row sm:items-center sm:justify-between sm:px-6">
      <p>Dream On The Paper</p>
      <div className="flex gap-4">
        <Link href="/create" className="transition hover:text-ink">
          Create
        </Link>
        <a href="#examples" className="transition hover:text-ink">
          Examples
        </a>
      </div>
    </footer>
  );
}
