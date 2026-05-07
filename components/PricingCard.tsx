"use client";

import { Check } from "lucide-react";
import type { PackageId } from "@/lib/plans";
import { packages } from "@/lib/plans";

type PricingCardProps = {
  packageId: PackageId;
  selected: boolean;
  onSelect: (packageId: PackageId) => void;
};

export function PricingCard({ packageId, selected, onSelect }: PricingCardProps) {
  const plan = packages[packageId];

  return (
    <button
      type="button"
      onClick={() => onSelect(packageId)}
      className={`focus-ring rounded-2xl border p-4 text-left transition ${
        selected
          ? "border-gold bg-white shadow-soft"
          : "border-white/70 bg-white/50 hover:bg-white"
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-ink">{plan.name}</h2>
          <p className="mt-1 text-sm leading-5 text-taupe">{plan.description}</p>
        </div>
        <p className="shrink-0 text-xl font-semibold text-ink">
          {plan.priceLabel}
        </p>
      </div>
      <div className="mt-4 grid gap-2">
        {plan.checkoutBullets.map((feature) => (
          <div key={feature} className="flex items-center gap-2 text-sm text-cocoa">
            <Check aria-hidden className="h-4 w-4 text-gold" />
            {feature}
          </div>
        ))}
      </div>
    </button>
  );
}
