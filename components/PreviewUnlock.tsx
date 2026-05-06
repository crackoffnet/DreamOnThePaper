"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Check, Lock, Sparkles } from "lucide-react";
import { CheckoutCTA } from "@/components/CheckoutCTA";
import { PricingCard } from "@/components/PricingCard";
import { getEphemeralImage } from "@/lib/client-images";
import type { PackageId } from "@/lib/plans";
import { packageIds, packages } from "@/lib/plans";
import type { WallpaperInput, WallpaperMeta } from "@/lib/types";
import { getAspectRatioLabel, getResolutionLabel, labels } from "@/lib/wallpaper";

type PreviewState = {
  imageUrl: string;
  input: WallpaperInput | null;
  meta: WallpaperMeta | null;
};

const unlockFeatures = [
  "High resolution",
  "No watermark",
  "Download + Email",
  "Original selected size",
];

export function PreviewUnlock() {
  const [preview, setPreview] = useState<PreviewState>({
    imageUrl: "",
    input: null,
    meta: null,
  });
  const [selectedPackage, setSelectedPackage] = useState<PackageId>("single");

  useEffect(() => {
    setPreview({
      imageUrl: getEphemeralImage("previewImageUrl"),
      input: parseJson<WallpaperInput>(sessionStorage.getItem("dreamWallpaperInput")),
      meta: parseJson<WallpaperMeta>(sessionStorage.getItem("dreamPreviewMeta")),
    });
  }, []);

  if (!preview.imageUrl || !preview.input || !preview.meta) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/60 p-6 shadow-soft">
          <Sparkles aria-hidden className="mb-4 h-6 w-6 text-gold" />
          <h1 className="text-3xl font-semibold text-ink">No preview found.</h1>
          <p className="mt-3 text-sm leading-6 text-taupe">
            Generate a preview first, then unlock the final wallpaper.
          </p>
          <Link
            href="/create"
            className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-pearl"
          >
            Create Preview
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto grid max-w-6xl gap-5 px-4 py-5 sm:px-6 lg:grid-cols-[0.48fr_0.52fr]">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/50 p-4 shadow-soft backdrop-blur-xl">
        <div className="mb-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
            Low-quality preview
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">
            Your wallpaper concept is ready.
          </h1>
          <p className="mt-2 text-sm leading-6 text-taupe">
            This is a preview. Unlock the full version to download, email, and share.
          </p>
        </div>

        <div className="flex justify-center rounded-[1.5rem] border border-white/70 bg-white/45 p-4">
          <div
            className={`relative w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-linen shadow-soft ${
              preview.meta.device === "custom" ? "max-w-md" : "max-w-sm"
            }`}
            style={{ aspectRatio: preview.meta.aspectRatio }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={preview.imageUrl}
              alt="Low quality preview wallpaper"
              className="h-full w-full scale-105 object-cover blur-[1.5px] saturate-75"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/5 via-transparent to-ink/35" />
            <div className="absolute inset-x-4 bottom-4 rounded-2xl border border-white/50 bg-white/70 p-3 text-center shadow-sm backdrop-blur-md">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
                Preview
              </p>
              <p className="mt-1 text-sm font-medium text-ink">
                Unlock full version to download.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-4 grid gap-2 text-sm text-taupe sm:grid-cols-2">
          <p>Device: {labels.devices[preview.meta.device]}</p>
          <p>Ratio: {preview.input ? getAspectRatioLabel(preview.input) : labels.ratios[preview.meta.ratio]}</p>
          <p>Style: {labels.styles[preview.meta.style]}</p>
          <p>Theme: {labels.themes[preview.meta.theme]}</p>
          {preview.input?.device === "custom" ? (
            <p>Resolution: {getResolutionLabel(preview.input)}</p>
          ) : null}
        </div>
      </div>

      <aside className="space-y-3">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/55 p-4 shadow-soft backdrop-blur-xl">
          <div className="mb-3 flex items-center gap-2">
            <Lock aria-hidden className="h-4 w-4 text-gold" />
            <h2 className="text-xl font-semibold text-ink">
              Unlock Full Wallpaper
            </h2>
          </div>
          <p className="text-sm leading-6 text-taupe">
            {packages[selectedPackage].price} unlocks the high-quality final image.
          </p>
          <div className="mt-4 grid gap-2">
            {unlockFeatures.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-cocoa">
                <Check aria-hidden className="h-4 w-4 text-gold" />
                {feature}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3">
          {packageIds.map((packageId) => (
            <PricingCard
              key={packageId}
              packageId={packageId}
              selected={selectedPackage === packageId}
              onSelect={setSelectedPackage}
            />
          ))}
        </div>

        <CheckoutCTA
          packageId={selectedPackage}
          wallpaperInput={preview.input}
          label="Unlock Full Wallpaper"
        />
      </aside>
    </section>
  );
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
