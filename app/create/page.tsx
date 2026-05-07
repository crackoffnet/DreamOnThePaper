import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { WallpaperWizard } from "@/components/WallpaperWizard";

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
      <WallpaperWizard initialMood={params.mood || ""} />
      <Footer />
    </main>
  );
}
