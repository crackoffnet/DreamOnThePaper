import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Footer } from "@/components/Footer";
import { StartOverButton } from "@/components/StartOverButton";
import { SuccessExperience } from "@/components/SuccessExperience";

export const metadata: Metadata = {
  title: "Success | Dream On The Paper",
  robots: {
    index: false,
    follow: false,
  },
};

type SuccessPageProps = {
  searchParams: Promise<{ session_id?: string }>;
};

export default async function SuccessPage({ searchParams }: SuccessPageProps) {
  const params = await searchParams;
  const sessionId = params.session_id || "";

  return (
    <main className="min-h-screen px-0 py-4">
      <div className="mx-auto mb-2 max-w-6xl px-4 sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <Link
            href="/checkout"
            className="focus-ring inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium text-taupe transition hover:text-ink"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Checkout
          </Link>
          <StartOverButton />
        </div>
      </div>
      <SuccessExperience sessionId={sessionId} />
      <Footer />
    </main>
  );
}
