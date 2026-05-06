import Image from "next/image";
import {
  BriefcaseBusiness,
  Dumbbell,
  Heart,
  Home,
  Leaf,
  Plane,
} from "lucide-react";
import { exampleWallpapers } from "@/lib/exampleWallpapers";

const exampleIcons = {
  "soft-luxury": Heart,
  "wealth-business": BriefcaseBusiness,
  "nature-reset": Leaf,
  "fitness-health": Dumbbell,
  "family-home": Home,
  "freedom-travel": Plane,
} as const;

export function ExampleGallery() {
  return (
    <section id="examples" className="px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-3">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
            Premium examples
          </p>
          <h2 className="mt-1.5 max-w-2xl text-xl font-semibold tracking-[-0.02em] text-ink sm:text-2xl">
            Wallpapers that feel like a daily visual ritual.
          </h2>
        </div>
        <div className="-mx-4 flex snap-x gap-2.5 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {exampleWallpapers.map((example) => {
            const Icon = exampleIcons[example.id];

            return (
              <article
                key={example.id}
                className="group min-w-[72vw] snap-center sm:min-w-0"
              >
              <div
                className="relative aspect-[1.18/1] overflow-hidden rounded-2xl bg-linen shadow-sm transition duration-300 group-hover:-translate-y-0.5 group-hover:shadow-soft"
              >
                <Image
                  src={example.image}
                  alt={`${example.title} wallpaper example`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 72vw"
                  className="object-cover object-center transition duration-500 group-hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-cream/10 via-ink/4 to-ink/62 transition duration-300 group-hover:to-ink/52" />
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/48 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cocoa backdrop-blur-md">
                  <Icon aria-hidden className="h-3 w-3 text-gold" />
                  {example.title}
                </div>
                <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/35 bg-white/32 p-3 backdrop-blur-md">
                  <p className="font-serif text-lg leading-tight text-white drop-shadow-sm">
                    {example.quote}
                  </p>
                </div>
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
