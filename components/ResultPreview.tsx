"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, SlidersHorizontal, Sparkles } from "lucide-react";
import { EmailDeliveryForm } from "@/components/EmailDeliveryForm";
import { LoadingGeneration } from "@/components/LoadingGeneration";
import { SharePanel } from "@/components/SharePanel";
import { getEphemeralImage } from "@/lib/client-images";
import type { WallpaperInput, WallpaperMeta } from "@/lib/types";
import { getAspectRatioLabel, getResolutionLabel, labels } from "@/lib/wallpaper";

type StoredResult = {
  imageUrl: string;
  input: WallpaperInput | null;
  meta: WallpaperMeta | null;
};

export function ResultPreview() {
  const [result, setResult] = useState<StoredResult>({
    imageUrl: "",
    input: null,
    meta: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [orderToken, setOrderToken] = useState("");
  const [orderId, setOrderId] = useState("");

  useEffect(() => {
    const imageUrl = getEphemeralImage("finalImageUrl");
    const input = parseJson<WallpaperInput>(
      sessionStorage.getItem("dreamWallpaperInput"),
    );
    const meta = parseJson<WallpaperMeta>(sessionStorage.getItem("dreamWallpaperMeta"));

    setResult({ imageUrl, input, meta });
    setOrderToken(sessionStorage.getItem("dreamOrderToken") || "");
    setOrderId(sessionStorage.getItem("dreamOrderId") || "");
    const timer = window.setTimeout(() => setIsLoading(false), 500);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <LoadingGeneration label="Creating your wallpaper..." />
      </div>
    );
  }

  if (!result.imageUrl || !result.meta) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/60 p-6 shadow-soft">
          <Sparkles aria-hidden className="mb-4 h-6 w-6 text-gold" />
          <h1 className="text-3xl font-semibold text-ink">No wallpaper found.</h1>
          <p className="mt-3 text-sm leading-6 text-taupe">
            Your browser session does not have a generated wallpaper yet.
          </p>
          <Link
            href="/create"
            className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-pearl"
          >
            Create a Wallpaper
          </Link>
        </div>
      </section>
    );
  }

  const meta = result.meta;
  const orderIdShort = orderId ? orderId.slice(0, 8) : "final";
  const protectedImageUrl = withDownloadToken(result.imageUrl, orderToken);
  const filename = `dream-on-the-paper-wallpaper-${orderIdShort}.png`;

  return (
    <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[0.42fr_0.58fr]">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/55 p-5 shadow-soft backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Your wallpaper
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
          Ready to download.
        </h1>
        <div className="mt-4 grid gap-2 text-sm text-taupe">
          <p>Device: {labels.devices[meta.device]}</p>
          <p>
            Ratio:{" "}
            {result.input ? getAspectRatioLabel(result.input) : labels.ratios[meta.ratio]}
          </p>
          <p>Style: {labels.styles[meta.style]}</p>
          <p>Theme: {labels.themes[meta.theme]}</p>
          {result.input?.device === "custom" ? (
            <p>Resolution: {getResolutionLabel(result.input)}</p>
          ) : null}
        </div>

        <div className="mt-6 grid gap-3">
          <a
            href={protectedImageUrl}
            download={filename}
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-pearl shadow-sm transition hover:bg-cocoa"
          >
            <Download aria-hidden className="h-4 w-4" />
            Download Wallpaper
          </a>
          <Link
            href="/create"
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cocoa/10 bg-white/65 px-5 text-sm font-medium text-ink transition hover:bg-white"
          >
            <SlidersHorizontal aria-hidden className="h-4 w-4" />
            Try Different Style
          </Link>
        </div>
        <p className="mt-3 text-xs leading-5 text-taupe">
          Your private wallpaper is only available through this paid session.
        </p>
        <div className="mt-4 grid gap-3">
          <SharePanel />
          <EmailDeliveryForm finalGenerationToken={orderToken} />
        </div>
      </div>

      <div className="flex justify-center rounded-[1.75rem] border border-white/70 bg-white/45 p-4 shadow-soft backdrop-blur-xl">
        <div
          className={`relative max-h-[72vh] w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-linen shadow-soft ${
            meta.device === "custom" ? "max-w-lg" : "max-w-md"
          }`}
          style={{ aspectRatio: meta.aspectRatio }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={protectedImageUrl}
            alt="Generated Dream On The Paper wallpaper"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function withDownloadToken(imageUrl: string, token: string) {
  if (!imageUrl || !token || !imageUrl.includes("/api/wallpaper-image/finals")) {
    return imageUrl;
  }

  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${separator}token=${encodeURIComponent(token)}`;
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
