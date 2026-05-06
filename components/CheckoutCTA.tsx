"use client";

import { useState } from "react";
import { CreditCard, Loader2, Lock, ShieldCheck } from "lucide-react";
import type { PackageId } from "@/lib/plans";
import type { WallpaperInput } from "@/lib/types";

type CheckoutCTAProps = {
  packageId: PackageId;
  wallpaperInput: WallpaperInput | null;
  label?: string;
};

export function CheckoutCTA({
  packageId,
  wallpaperInput,
  label = "Secure Checkout",
}: CheckoutCTAProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    if (!wallpaperInput) {
      setError("Create your wallpaper answers before checkout.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageId,
          wallpaperInput,
          website: "",
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        url?: string;
        message?: string;
        error?: string;
      };

      if (!response.ok || data.success === false || !data.url) {
        throw new Error(data.message || data.error || "Unable to start checkout.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="sticky bottom-3 z-20 rounded-2xl border border-white/70 bg-white/85 p-3 shadow-soft backdrop-blur-xl sm:static sm:bg-transparent sm:p-0 sm:shadow-none sm:backdrop-blur-0">
      {error ? <p className="mb-3 text-sm text-red-700">{error}</p> : null}
      <button
        type="button"
        onClick={startCheckout}
        disabled={isLoading || !wallpaperInput}
        className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-pearl shadow-soft transition hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Lock aria-hidden className="h-4 w-4" />
        )}
        {label}
      </button>
      <div className="mt-3 grid gap-1.5 text-center text-[11px] font-medium text-taupe">
        <p className="inline-flex items-center justify-center gap-1.5">
          <ShieldCheck aria-hidden className="h-3.5 w-3.5 text-gold" />
          Secure checkout powered by Stripe
        </p>
        <p className="inline-flex items-center justify-center gap-1.5">
          <CreditCard aria-hidden className="h-3.5 w-3.5 text-gold" />
          Cards · Apple Pay · Google Pay
        </p>
      </div>
    </div>
  );
}
