import Link from "next/link";
import { exampleWallpapers } from "@/lib/exampleWallpapers";

export function ExampleGallery() {
  return (
    <section id="examples" className="px-4 py-5 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold">
              Premium examples
            </p>
            <h2 className="mt-1 max-w-2xl font-display text-[2rem] font-normal leading-none tracking-[-0.04em] text-ink sm:text-[2.6rem]">
              Wallpapers designed like daily visual rituals.
            </h2>
            <p className="mt-2 max-w-md text-[13px] font-light leading-6 text-taupe">
              Each concept blends intention, mood, and premium visual
              direction.
            </p>
          </div>
          <Link
            href="/create"
            className="focus-ring inline-flex w-fit rounded-full border border-[rgba(180,160,130,0.22)] bg-white/35 px-4 py-2 text-[12.5px] font-medium text-ink transition hover:-translate-y-px hover:bg-white/70"
          >
            Create your own
          </Link>
        </div>

        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {exampleWallpapers.map((example) => (
            <article
              key={example.id}
              className="group min-w-[78vw] snap-center sm:min-w-0"
            >
              <Link
                href={`/create?mood=${encodeURIComponent(example.id)}`}
                className="focus-ring block rounded-2xl"
                aria-label={`Start creating with the ${example.title} mood`}
              >
                <div
                  className="relative aspect-[4/4.7] overflow-hidden rounded-2xl border border-[rgba(180,160,130,0.20)] transition duration-300 hover:-translate-y-0.5 sm:aspect-[6/4.25]"
                  style={{ background: example.gradient }}
                >
                  <div className="absolute inset-0 bg-[linear-gradient(115deg,rgba(255,255,255,0.24),transparent_42%),linear-gradient(180deg,transparent_40%,rgba(30,26,22,0.48))]" />
                  <div className="absolute left-3 top-3 rounded-full border border-white/35 bg-pearl/70 px-2.5 py-1 text-[9px] font-medium uppercase tracking-[0.16em] text-cocoa backdrop-blur-sm">
                    {example.title}
                  </div>

                  <div className="absolute inset-x-3 bottom-3">
                    <p className="max-w-[16rem] font-display text-[1.45rem] font-normal italic leading-[0.98] tracking-[-0.035em] text-white drop-shadow-sm sm:text-[1.55rem]">
                      {example.quote}
                    </p>
                    <span className="mt-3 inline-flex rounded-full border border-white/35 bg-pearl/82 px-3 py-1.5 text-[9px] font-medium uppercase tracking-[0.15em] text-cocoa backdrop-blur-sm transition group-hover:bg-white">
                      Start with this mood
                    </span>
                  </div>
                </div>
              </Link>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
