import { BriefcaseBusiness, Heart, Leaf, Dumbbell } from "lucide-react";

const examples = [
  {
    title: "Soft Luxury",
    quote: "I move with ease toward what is mine.",
    icon: Heart,
    palette: "from-[#fffaf2] via-[#efe3d0] to-[#c7ad7c]",
  },
  {
    title: "Wealth / Business",
    quote: "Clear work. Calm money. Better rooms.",
    icon: BriefcaseBusiness,
    palette: "from-[#f7f2e8] via-[#d9d2c3] to-[#a89165]",
  },
  {
    title: "Nature Reset",
    quote: "I grow where I place my attention.",
    icon: Leaf,
    palette: "from-[#f9f4e9] via-[#d9dccf] to-[#8f967c]",
  },
  {
    title: "Fitness / Health",
    quote: "Strong body, soft mind, steady energy.",
    icon: Dumbbell,
    palette: "from-[#fbf8f2] via-[#ddd8cf] to-[#b59662]",
  },
];

export function ExampleGallery() {
  return (
    <section id="examples" className="px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl">
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold">
              Examples
            </p>
            <h2 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
              Phone and desktop wallpapers with quiet ambition.
            </h2>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {examples.map((example) => (
            <article
              key={example.title}
              className={`rounded-2xl bg-gradient-to-br ${example.palette} p-3 shadow-sm`}
            >
              <div className="flex aspect-[4/5] flex-col justify-between rounded-xl border border-white/60 bg-white/35 p-4 backdrop-blur-sm">
                <example.icon aria-hidden className="h-5 w-5 text-cocoa/70" />
                <div>
                  <p className="font-serif text-xl leading-tight text-ink">
                    {example.quote}
                  </p>
                  <p className="mt-3 text-xs font-semibold uppercase tracking-[0.14em] text-cocoa">
                    {example.title}
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
