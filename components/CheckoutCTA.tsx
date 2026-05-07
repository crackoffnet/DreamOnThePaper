"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { saveDreamState } from "@/lib/clientState";
import type { PackageId } from "@/lib/plans";
import type { WallpaperProductId } from "@/lib/wallpaperProducts";

type CheckoutCTAProps = {
  packageId?: PackageId;
  wallpaperType: WallpaperProductId;
  orderId: string | null;
  orderToken?: string | null;
  orderSnapshotToken?: string | null;
  label?: string;
};

export function CheckoutCTA({
  packageId = "single",
  wallpaperType,
  orderId,
  orderToken,
  orderSnapshotToken,
  label = "Secure Checkout",
}: CheckoutCTAProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function startCheckout() {
    if (isLoading) {
      return;
    }

    if (!orderId && !orderToken) {
      setError("Create your preview first.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          packageType: packageId,
          wallpaperType,
          orderId: orderId || undefined,
          orderToken: orderToken || undefined,
          orderSnapshotToken: orderSnapshotToken || undefined,
          website: "",
        }),
      });
      const data = (await response.json()) as {
        success?: boolean;
        url?: string;
        orderSnapshotToken?: string;
        missing?: string[];
        message?: string;
        error?: string;
        retryAfterSeconds?: number;
      };

      if (
        !response.ok ||
        data.success === false ||
        !data.url
      ) {
        if (process.env.NODE_ENV !== "production") {
          console.error("Checkout session failed", {
            status: response.status,
            message: data.message || data.error,
            missing: data.missing,
          });
        }

        throw new Error(
          response.status === 429
            ? rateLimitMessage(data.retryAfterSeconds)
            : response.status === 503
            ? "Checkout is temporarily unavailable. Please try again soon."
            : data.message || data.error || "Unable to start checkout.",
        );
      }

      if (data.orderSnapshotToken) {
        sessionStorage.setItem("dreamOrderSnapshotToken", data.orderSnapshotToken);
      }
      saveDreamState({
        orderId,
        orderToken: orderToken || null,
        orderSnapshotToken: data.orderSnapshotToken || orderSnapshotToken || null,
        checkoutStartedAt: Date.now(),
        wallpaperType,
        status: "pending_payment",
      });
      window.location.href = data.url;
    } catch (checkoutError) {
      if (process.env.NODE_ENV !== "production") {
        console.error("Checkout redirect failed", checkoutError);
      }

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
        disabled={isLoading || (!orderId && !orderToken)}
        className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-semibold text-pearl shadow-soft transition hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isLoading ? (
          <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
        ) : (
          <Lock aria-hidden className="h-4 w-4" />
        )}
        {isLoading ? "Opening secure checkout..." : label}
      </button>
      {error && process.env.NODE_ENV !== "production" ? (
        <p className="mt-2 text-center text-[11px] text-taupe">
          Checkout could not start. Please try again.
        </p>
      ) : null}
      <div className="mt-3 text-center text-[11px] font-medium text-taupe">
        <p>Secure checkout</p>
      </div>
    </div>
  );
}

function rateLimitMessage(retryAfterSeconds?: number) {
  const base = "Too many checkout attempts. Please wait a moment and try again.";

  if (!retryAfterSeconds) {
    return base;
  }

  const minutes = Math.max(1, Math.ceil(retryAfterSeconds / 60));
  return `${base} Try again in about ${minutes} minute${minutes === 1 ? "" : "s"}.`;
}
