import { CompactCTA } from "@/components/CompactCTA";
import { ExampleGallery } from "@/components/ExampleGallery";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";
import { Hero } from "@/components/Hero";

const steps = [
  "Pick phone, desktop, or tablet.",
  "Choose ratio, theme, and visual style.",
  "Answer compact dream-life prompts.",
  "Generate and download your wallpaper.",
];

export default function Home() {
  return (
    <main>
      <Header />
      <Hero />
      <section className="px-4 py-6 sm:px-6">
        <div className="mx-auto grid max-w-6xl gap-3 sm:grid-cols-4">
          {steps.map((step, index) => (
            <div
              key={step}
              className="rounded-2xl border border-white/70 bg-white/50 p-4 shadow-sm"
            >
              <span className="mb-3 flex h-8 w-8 items-center justify-center rounded-full bg-ink text-xs font-semibold text-pearl">
                {index + 1}
              </span>
              <p className="text-sm leading-6 text-cocoa">{step}</p>
            </div>
          ))}
        </div>
      </section>
      <ExampleGallery />
      <CompactCTA />
      <Footer />
    </main>
  );
}
