import Image from "next/image";
import {
  BriefcaseBusiness,
  Dumbbell,
  Heart,
  Home,
  Leaf,
  Plane,
} from "lucide-react";

const examples = [
  {
    title: "Soft Luxury",
    quote: "I move with ease toward what is mine.",
    icon: Heart,
    image: "/examples/soft-luxury.jpg",
  },
  {
    title: "Wealth / Business",
    quote: "Clear work. Calm money. Better rooms.",
    icon: BriefcaseBusiness,
    image: "/examples/wealth.jpg",
  },
  {
    title: "Nature Reset",
    quote: "I grow where I place my attention.",
    icon: Leaf,
    image: "/examples/nature.jpg",
  },
  {
    title: "Fitness / Health",
    quote: "Strong body, soft mind, steady energy.",
    icon: Dumbbell,
    image: "/examples/fitness.jpg",
  },
  {
    title: "Family / Home",
    quote: "We are building something that lasts.",
    icon: Home,
    image: "/examples/family.jpg",
  },
  {
    title: "Freedom / Travel",
    quote: "My life moves freely across the world.",
    icon: Plane,
    image: "/examples/travel.jpg",
  },
];

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
        <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:grid sm:grid-cols-2 sm:overflow-visible sm:px-0 lg:grid-cols-4">
          {examples.map((example) => (
            <article
              key={example.title}
              className="group min-w-[72vw] snap-center sm:min-w-0"
            >
              <div
                className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-linen shadow-sm transition duration-300 group-hover:scale-[1.012]"
              >
                <Image
                  src={example.image}
                  alt={`${example.title} wallpaper example`}
                  fill
                  sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 72vw"
                  className="object-cover transition duration-500 group-hover:scale-105 group-hover:blur-0"
                />
                <div className="absolute inset-0 bg-gradient-to-b from-ink/5 via-ink/5 to-ink/55 transition duration-300 group-hover:from-transparent" />
                <div className="absolute inset-0 bg-white/10 backdrop-blur-[1px] transition duration-300 group-hover:bg-transparent group-hover:backdrop-blur-0" />
                <div className="absolute left-3 top-3 flex items-center gap-1.5 rounded-full border border-white/40 bg-white/42 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.12em] text-cocoa backdrop-blur-md">
                  <example.icon aria-hidden className="h-3 w-3 text-gold" />
                  {example.title}
                </div>
                <div className="absolute inset-x-3 bottom-3 rounded-xl border border-white/40 bg-white/36 p-3 backdrop-blur-md">
                  <p className="font-serif text-xl leading-tight text-ink">
                    {example.quote}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
