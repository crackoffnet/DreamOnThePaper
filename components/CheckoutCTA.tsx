"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
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
        orderSnapshotToken?: string;
        message?: string;
        error?: string;
      };

      if (
        !response.ok ||
        data.success === false ||
        !data.url ||
        !data.orderSnapshotToken
      ) {
        throw new Error(data.message || data.error || "Unable to start checkout.");
      }

      sessionStorage.setItem("dreamOrderSnapshotToken", data.orderSnapshotToken);
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
      <div className="mt-3 text-center text-[11px] font-medium text-taupe">
        <p>Secure checkout</p>
      </div>
    </div>
  );
}
