"use client";

import { useEffect, useState } from "react";
import { CheckoutCTA } from "@/components/CheckoutCTA";
import { PricingCard } from "@/components/PricingCard";
import { TrustBadges } from "@/components/TrustBadges";
import type { PackageId } from "@/lib/plans";
import { packageIds } from "@/lib/plans";
import type { WallpaperInput } from "@/lib/types";
import { getCurrentDraft } from "@/lib/wallpaperDraft";

export function Pricing() {
  const [selectedPackage, setSelectedPackage] = useState<PackageId>("single");
  const [wallpaperInput, setWallpaperInput] = useState<WallpaperInput | null>(null);

  useEffect(() => {
    try {
      setWallpaperInput(getCurrentDraft().input);
    } catch {
      setWallpaperInput(null);
    }
  }, []);

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[0.68fr_0.32fr]">
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
      <aside className="space-y-3">
        <div className="rounded-2xl border border-white/70 bg-white/55 p-4 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-gold">
            Secure order
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-ink">
            Pay once. Generate after payment.
          </h2>
          <p className="mt-2 text-sm leading-6 text-taupe">
            We verify the Stripe session server-side before unlocking final
            generation and download.
          </p>
        </div>
        <TrustBadges />
        <CheckoutCTA
          packageId={selectedPackage}
          wallpaperInput={wallpaperInput}
        />
      </aside>
    </div>
  );
}
