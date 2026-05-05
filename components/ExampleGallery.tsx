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
    art: "bg-[radial-gradient(circle_at_28%_18%,rgba(255,255,255,0.92),transparent_9rem),radial-gradient(circle_at_72%_30%,rgba(181,150,98,0.42),transparent_10rem),linear-gradient(145deg,#fff8ed_0%,#eadcc8_50%,#bfa16c_100%)]",
  },
  {
    title: "Wealth / Business",
    quote: "Clear work. Calm money. Better rooms.",
    icon: BriefcaseBusiness,
    art: "bg-[radial-gradient(circle_at_70%_18%,rgba(255,255,255,0.78),transparent_8rem),linear-gradient(135deg,#f5efe4_0%,#d8c8aa_48%,#6f675d_100%)]",
  },
  {
    title: "Nature Reset",
    quote: "I grow where I place my attention.",
    icon: Leaf,
    art: "bg-[radial-gradient(circle_at_34%_20%,rgba(250,248,239,0.85),transparent_9rem),linear-gradient(145deg,#f8f1e2_0%,#cdd5bf_52%,#71836e_100%)]",
  },
  {
    title: "Fitness / Health",
    quote: "Strong body, soft mind, steady energy.",
    icon: Dumbbell,
    art: "bg-[radial-gradient(circle_at_72%_24%,rgba(255,255,255,0.72),transparent_8rem),linear-gradient(145deg,#fbf8f2_0%,#ded8cc_46%,#a98f63_100%)]",
  },
  {
    title: "Family / Home",
    quote: "We are building something that lasts.",
    icon: Home,
    art: "bg-[radial-gradient(circle_at_35%_22%,rgba(255,255,255,0.8),transparent_9rem),linear-gradient(145deg,#fff6e8_0%,#e1c7a3_48%,#8c765b_100%)]",
  },
  {
    title: "Freedom / Travel",
    quote: "My life moves freely across the world.",
    icon: Plane,
    art: "bg-[radial-gradient(circle_at_78%_18%,rgba(255,255,255,0.78),transparent_8rem),linear-gradient(145deg,#f9f3e8_0%,#c9d1cf_46%,#8d9a9a_100%)]",
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
                className={`relative aspect-[5/4] overflow-hidden rounded-2xl ${example.art} shadow-sm transition duration-300 group-hover:scale-[1.012]`}
              >
                <div className="absolute inset-0 bg-gradient-to-b from-white/12 via-transparent to-ink/44" />
                <div className="absolute inset-0 opacity-45 [background-image:linear-gradient(rgba(255,255,255,.22)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,.16)_1px,transparent_1px)] [background-size:42px_42px]" />
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
