import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { PreviewUnlock } from "@/components/PreviewUnlock";

export default function PreviewPage() {
  return (
    <main className="min-h-screen px-0 py-4">
      <div className="mx-auto mb-2 max-w-6xl px-4 sm:px-6">
        <Link
          href="/create"
          className="focus-ring inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium text-taupe transition hover:text-ink"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Edit answers
        </Link>
      </div>
      <PreviewUnlock />
      <Footer />
    </main>
  );
}
