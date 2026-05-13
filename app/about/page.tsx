import type { Metadata } from "next";
import { Footer } from "@/components/Footer";
import { Header } from "@/components/Header";

export const metadata: Metadata = {
  title: "About | Dream On The Paper",
  description:
    "Learn about Dream On The Paper, a privacy-minded cinematic wallpaper experience created by GAX Global.",
  alternates: {
    canonical: "/about",
  },
};

export default function AboutPage() {
  return (
    <main>
      <Header />
      <section className="px-4 py-10 sm:px-6">
        <div className="mx-auto max-w-3xl rounded-[1.6rem] border border-cocoa/10 bg-white/45 p-6 shadow-[0_18px_55px_rgba(59,49,38,0.08)] sm:p-8">
          <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold">
            About
          </p>
          <h1 className="mt-3 font-display text-[2.45rem] font-normal leading-none tracking-[-0.04em] text-ink sm:text-[3rem]">
            A quiet visual ritual for the life you are building.
          </h1>
          <div className="mt-5 space-y-4 text-sm font-light leading-7 text-taupe sm:text-base">
            <p>
              Dream On The Paper turns your goals, mood, and future-self vision
              into personalized cinematic wallpapers for phone, desktop,
              tablet, and custom sizes.
            </p>
            <p>
              The product is designed to feel calm and intentional: answer a
              few thoughtful prompts, preview the visual atmosphere, then unlock
              a final PNG wallpaper when it feels right.
            </p>
            <p>
              Privacy is part of the product. Paid wallpapers are treated as
              private customer assets, and the app avoids public permanent
              wallpaper links.
            </p>
            <p>
              Created by{" "}
              <a
                href="https://gax-global.com"
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-cocoa underline decoration-gold/40 underline-offset-4 transition hover:text-ink"
              >
                GAX Global
              </a>
              , focused on AI product design and cloud engineering.
            </p>
          </div>
        </div>
      </section>
      <Footer />
    </main>
  );
}
