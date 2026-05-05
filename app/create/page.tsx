import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Form } from "@/components/Form";

export default function CreatePage() {
  return (
    <main className="min-h-screen px-5 py-6 sm:px-8 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <Link
          href="/"
          className="focus-ring mb-8 inline-flex items-center gap-2 rounded-full px-2 py-2 text-sm font-medium text-taupe transition hover:text-ink"
        >
          <ArrowLeft aria-hidden className="h-4 w-4" />
          Back
        </Link>
        <Form />
      </div>
    </main>
  );
}
