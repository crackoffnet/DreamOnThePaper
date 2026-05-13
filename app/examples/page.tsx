import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { exampleWallpapers } from "@/lib/exampleWallpapers";

export const metadata: Metadata = {
  title: "Examples | Dream On The Paper",
  description:
    "Browse cinematic wallpaper examples for premium future-self moods and visual atmospheres.",
  alternates: {
    canonical: "/examples",
  },
};

export default function ExamplesPage() {
  return (
    <main>
      <Header />
      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-6xl">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold">
            Examples
          </p>
          <h1 className="mt-3 max-w-3xl font-display text-[2.45rem] font-normal leading-none tracking-[-0.04em] text-ink sm:text-[3rem]">
            Explore cinematic directions for your future-life wallpaper.
          </h1>
          <p className="mt-4 max-w-2xl text-sm font-light leading-7 text-taupe sm:text-base">
            These public examples show the mood, light, and cinematic composition of
            Dream On The Paper. Every paid wallpaper is generated privately for the
            customer and delivered as a clean high-resolution PNG.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {exampleWallpapers.map((example) => (
              <Link
                key={example.id}
                href={`/create?mood=${encodeURIComponent(example.id)}`}
                className="focus-ring group block rounded-[22px]"
              >
                <article className="relative aspect-[0.68/1] overflow-hidden rounded-[20px] border border-[rgba(180,160,130,0.22)] bg-[#ddd3c2] transition duration-300 ease-out group-hover:-translate-y-0.5 group-hover:border-gold/45">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={example.image}
                    alt={`${example.title} dream wallpaper example`}
                    width={768}
                    height={1152}
                    className="h-full w-full object-cover transition duration-300 ease-out group-hover:scale-[1.015]"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(255,255,255,0.16),transparent_38%),linear-gradient(to_top,rgba(30,26,22,0.45),rgba(30,26,22,0.05)_48%,transparent)]" />
                  <span className="absolute left-3 top-3 rounded-full border border-white/40 bg-pearl/78 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.13em] text-cocoa backdrop-blur-md">
                    {example.title}
                  </span>
                  <p className="absolute inset-x-3 bottom-3 max-w-[86%] font-display text-[1.38rem] font-normal italic leading-[1.03] tracking-[-0.035em] text-[#fffaf0] drop-shadow-[0_1px_10px_rgba(30,26,22,0.36)] sm:text-[1.42rem]">
                    {example.mood}
                  </p>
                </article>
              </Link>
            ))}
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
            <Link
              href="/create"
              className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-[12.5px] font-medium text-pearl transition hover:-translate-y-px hover:bg-cocoa"
            >
              Create My Wallpaper
              <ArrowRight aria-hidden className="h-3.5 w-3.5" />
            </Link>
            <p className="text-sm font-light text-taupe">
              Free low-resolution preview, then pay once to unlock your final PNG.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
