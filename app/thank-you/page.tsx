"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Download, Sparkles } from "lucide-react";
import { Loader } from "@/components/Loader";

export default function ThankYouPage() {
  const [imageUrl, setImageUrl] = useState("");
  const [isPreparing, setIsPreparing] = useState(true);

  useEffect(() => {
    const storedImage = localStorage.getItem("dreamWallpaper");
    if (storedImage) {
      setImageUrl(storedImage);
    }

    const timer = window.setTimeout(() => {
      setIsPreparing(false);
    }, 1500);

    return () => window.clearTimeout(timer);
  }, []);

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-10 sm:px-8 lg:px-10">
      <section className="glass w-full max-w-5xl rounded-[2rem] p-5 sm:p-8 lg:p-10">
        <div className="grid items-center gap-10 lg:grid-cols-[0.85fr_1.15fr]">
          <div>
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-full bg-gold/15 text-gold">
              <Sparkles aria-hidden className="h-5 w-5" />
            </div>
            <p className="text-sm font-medium uppercase tracking-[0.22em] text-gold">
              Thank you
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.02em] text-ink sm:text-5xl">
              Your wallpaper is being created.
            </h1>
            <div className="mt-7">
              {isPreparing ? (
                <Loader label="Preparing your download" />
              ) : imageUrl ? (
                <a
                  href={imageUrl}
                  download={
                    imageUrl.startsWith("data:image/svg")
                      ? "dream-on-the-paper-wallpaper.svg"
                      : "dream-on-the-paper-wallpaper.png"
                  }
                  className="focus-ring inline-flex min-h-12 items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-pearl shadow-soft transition hover:-translate-y-0.5 hover:bg-cocoa"
                >
                  <Download aria-hidden className="h-4 w-4" />
                  Download
                </a>
              ) : (
                <div>
                  <p className="text-sm leading-6 text-taupe">
                    No generated wallpaper was found in this browser session.
                  </p>
                  <Link
                    href="/create"
                    className="focus-ring mt-5 inline-flex min-h-12 items-center justify-center rounded-full bg-ink px-6 text-sm font-medium text-pearl"
                  >
                    Create a Wallpaper
                  </Link>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-center">
            <div className="relative aspect-[9/16] w-full max-w-sm overflow-hidden rounded-[2rem] border border-white/80 bg-linen shadow-soft">
              {imageUrl && !isPreparing ? (
                imageUrl.startsWith("data:") ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={imageUrl}
                    alt="Generated vision board wallpaper"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <Image
                    src={imageUrl}
                    alt="Generated vision board wallpaper"
                    fill
                    sizes="(max-width: 768px) 90vw, 384px"
                    className="object-cover"
                    priority
                  />
                )
              ) : (
                <div className="flex h-full items-center justify-center">
                  <Loader label="Rendering preview" />
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
