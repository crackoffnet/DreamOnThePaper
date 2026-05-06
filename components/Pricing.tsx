"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles } from "lucide-react";
import { CheckoutCTA } from "@/components/CheckoutCTA";
import { PricingCard } from "@/components/PricingCard";
import { TrustBadges } from "@/components/TrustBadges";
import type { PackageId } from "@/lib/plans";
import { packageIds } from "@/lib/plans";
import type { WallpaperInput, WallpaperMeta } from "@/lib/types";
import { getCurrentDraft } from "@/lib/wallpaperDraft";
import { getAspectRatioLabel, labels } from "@/lib/wallpaper";

type PricingState = {
  imageUrl: string;
  input: WallpaperInput | null;
  meta: WallpaperMeta | null;
  orderId: string | null;
  orderSnapshotToken: string | null;
};

export function Pricing({ orderId }: { orderId?: string }) {
  const [selectedPackage, setSelectedPackage] = useState<PackageId>("single");
  const [state, setState] = useState<PricingState>({
    imageUrl: "",
    input: null,
    meta: null,
    orderId: null,
    orderSnapshotToken: null,
  });

  useEffect(() => {
    try {
      const draft = getCurrentDraft();
      const activeOrderId = orderId || sessionStorage.getItem("dreamOrderId");

      if (!activeOrderId || draft.orderId !== activeOrderId) {
        setState((current) => ({ ...current, orderId: activeOrderId || null }));
        return;
      }

      setState({
        imageUrl: draft.previewImageUrl || sessionStorage.getItem("previewImageUrl") || "",
        input: draft.input,
        meta: draft.previewMeta || null,
        orderId: draft.orderId || activeOrderId,
        orderSnapshotToken:
          draft.orderSnapshotToken ||
          sessionStorage.getItem("dreamOrderSnapshotToken"),
      });
    } catch {
      setState({
        imageUrl: "",
        input: null,
        meta: null,
        orderId: orderId || null,
        orderSnapshotToken: null,
      });
    }
  }, [orderId]);

  if (!state.orderId || !state.imageUrl || !state.input || !state.meta) {
    return (
      <div className="rounded-[1.75rem] border border-white/70 bg-white/60 p-6 shadow-soft">
        <Sparkles aria-hidden className="mb-4 h-6 w-6 text-gold" />
        <h2 className="text-3xl font-semibold text-ink">
          Create your preview first.
        </h2>
        <p className="mt-3 text-sm leading-6 text-taupe">
          Generate a low-quality preview before choosing a package and starting
          secure checkout.
        </p>
        <Link
          href="/create"
          className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-pearl"
        >
          Back to Create
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[0.48fr_0.52fr]">
      <section className="rounded-[1.75rem] border border-white/70 bg-white/50 p-4 shadow-soft backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Low-quality preview
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">
          Your wallpaper concept is ready.
        </h2>
        <p className="mt-2 text-sm leading-6 text-taupe">
          Unlock the full wallpaper to download, email, and share.
        </p>
        <div className="mt-4 flex justify-center rounded-[1.5rem] border border-white/70 bg-white/45 p-4">
          <div
            className={`relative w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-linen shadow-soft ${
              state.meta.device === "custom" ? "max-w-md" : "max-w-sm"
            }`}
            style={{ aspectRatio: state.meta.aspectRatio }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={state.imageUrl}
              alt="Low quality preview wallpaper"
              className="h-full w-full scale-105 object-cover blur-[1.5px] saturate-75"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-ink/5 via-transparent to-ink/35" />
          </div>
        </div>
        <div className="mt-4 grid gap-2 text-sm text-taupe sm:grid-cols-2">
          <p>Device: {labels.devices[state.meta.device]}</p>
          <p>Ratio: {getAspectRatioLabel(state.input)}</p>
          <p>Style: {labels.styles[state.meta.style]}</p>
          <p>Theme: {labels.themes[state.meta.theme]}</p>
        </div>
      </section>

      <aside className="space-y-3">
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
        <TrustBadges />
        <CheckoutCTA
          packageId={selectedPackage}
          orderId={state.orderId}
          orderSnapshotToken={state.orderSnapshotToken}
        />
      </aside>
    </div>
  );
}
