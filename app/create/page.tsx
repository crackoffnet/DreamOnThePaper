import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { WallpaperWizard } from "@/components/WallpaperWizard";

export const metadata: Metadata = {
  title: "Create a Wallpaper | Dream On The Paper",
  description:
    "Create a personalized cinematic visualization wallpaper for your phone, desktop, tablet, or custom screen size.",
  alternates: {
    canonical: "/create",
  },
};

type CreatePageProps = {
  searchParams: Promise<{ mood?: string }>;
};

export default async function CreatePage({ searchParams }: CreatePageProps) {
  const params = await searchParams;

  return (
    <main className="min-h-screen px-4 py-4 sm:px-6">
      <div className="mx-auto mb-4 max-w-6xl">
        <Link
          href="/"
          className="focus-ring inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium text-taupe transition hover:text-ink"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back
        </Link>
      </div>
      <section className="mx-auto mb-6 max-w-6xl rounded-[1.5rem] border border-[rgba(180,160,130,0.2)] bg-white/45 p-5 shadow-[0_18px_55px_rgba(59,49,38,0.06)] sm:p-6">
        <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-gold">
          Create your wallpaper
        </p>
        <h2 className="mt-3 font-display text-[2.35rem] font-normal leading-none tracking-[-0.04em] text-ink sm:text-[3rem]">
          Design a cinematic visual reminder of what you are building.
        </h2>
        <div className="mt-4 grid gap-3 text-sm font-light leading-7 text-taupe md:grid-cols-3">
          <p>
            Choose the device format, visual direction, and emotional tone for a
            personalized visualization wallpaper.
          </p>
          <p>
            The flow creates a low-resolution preview first, so you can review
            the concept before unlocking a final high-resolution PNG.
          </p>
          <p>
            Checkout is handled securely, and your final wallpaper link is
            treated as private order content.
          </p>
        </div>
      </section>
      <WallpaperWizard initialMood={params.mood || ""} />
      <Footer />
    </main>
  );
}
