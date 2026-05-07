import Image from "next/image";
import Link from "next/link";
import { exampleWallpapers } from "@/lib/exampleWallpapers";

export function ExampleGallery() {
  return (
    <section id="examples" className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              PREMIUM EXAMPLES
            </p>
            <h2 className="mt-1.5 max-w-2xl text-2xl font-semibold leading-tight tracking-[-0.035em] text-ink sm:text-3xl">
              Luxury-inspired wallpapers for the life you&apos;re building.
            </h2>
            <p className="mt-2 max-w-xl text-sm leading-6 text-taupe">
              Each concept blends intention, mood, and premium visual
              direction.
            </p>
          </div>
          <Link
            href="/create"
            className="focus-ring inline-flex w-fit rounded-full border border-cocoa/10 bg-white/55 px-4 py-2 text-sm font-medium text-ink shadow-sm transition hover:-translate-y-0.5 hover:bg-white"
          >
            Create your own
          </Link>
        </div>
        <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-3 sm:mx-0 sm:grid sm:grid-cols-2 sm:gap-3 sm:overflow-visible sm:px-0 lg:grid-cols-3">
          {exampleWallpapers.map((example) => (
            <article
              key={example.id}
              className="group min-w-[76vw] snap-center sm:min-w-0"
            >
              <div className="relative aspect-[4/5] overflow-hidden rounded-[1.3rem] bg-linen shadow-[0_18px_50px_rgba(59,49,38,0.10)] transition duration-300 group-hover:-translate-y-1 group-hover:shadow-[0_26px_70px_rgba(59,49,38,0.14)] sm:aspect-[6/5]">
                <Image
                  src={example.image}
                  alt={`${example.title} wallpaper example`}
                  fill
                  sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 76vw"
                  className="object-cover object-center transition duration-700 group-hover:scale-[1.035]"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-ink/8 via-transparent to-ink/76 transition duration-300 group-hover:to-ink/66" />
                <div className="absolute left-3 top-3 rounded-full border border-white/35 bg-pearl/70 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.18em] text-cocoa backdrop-blur-md">
                  {example.title}
                </div>
                <p className="absolute inset-x-4 bottom-4 max-w-[16rem] font-serif text-[1.25rem] leading-[1.08] text-white drop-shadow-md sm:text-[1.35rem]">
                  {example.quote}
                </p>
                <div className="absolute right-3 top-3 opacity-0 transition duration-300 group-hover:opacity-100">
                  <span className="rounded-full border border-white/35 bg-ink/35 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-md">
                    Start with this mood
                  </span>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
