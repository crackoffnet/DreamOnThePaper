"use client";

import { useEffect, useState } from "react";
import { Sparkles } from "lucide-react";
import { CheckoutCTA } from "@/components/CheckoutCTA";
import { PricingCard } from "@/components/PricingCard";
import { StartOverButton } from "@/components/StartOverButton";
import { TrustBadges } from "@/components/TrustBadges";
import { ensureAppStateVersion } from "@/lib/clientState";
import type { CheckoutOrderToken } from "@/lib/order-state";
import type { PackageId } from "@/lib/plans";
import { packageIds } from "@/lib/plans";
import type { DeviceType, QuoteTone, RatioType, ThemeType, WallpaperMeta, WallpaperStyle } from "@/lib/types";
import { clearBrokenCheckoutState, getCurrentDraft } from "@/lib/wallpaperDraft";
import { labels } from "@/lib/wallpaper";

type PricingState = {
  imageUrl: string;
  meta: WallpaperMeta | null;
  orderId: string | null;
  orderToken: string | null;
  orderSnapshotToken: string | null;
};

type PricingProps = {
  orderId?: string;
  orderToken?: string;
  initialOrder?: CheckoutOrderToken | null;
  tokenExpired?: boolean;
};

export function Pricing({ orderId, orderToken, initialOrder, tokenExpired }: PricingProps) {
  const [selectedPackage, setSelectedPackage] = useState<PackageId>("single");
  const [state, setState] = useState<PricingState>({
    imageUrl: "",
    meta: null,
    orderId: null,
    orderToken: null,
    orderSnapshotToken: null,
  });

  useEffect(() => {
    let cancelled = false;

    async function loadPricingState() {
      try {
        ensureAppStateVersion();
        if (initialOrder?.previewImageUrl) {
          const meta = metaFromCheckoutOrder(initialOrder);
          sessionStorage.setItem("dreamOrderId", initialOrder.orderId);
          sessionStorage.setItem("dreamCheckoutOrderToken", orderToken || "");
          sessionStorage.setItem("previewImageUrl", initialOrder.previewImageUrl);
          if (initialOrder.previewImageId) {
            sessionStorage.setItem("dreamPreviewImageId", initialOrder.previewImageId);
          }
          console.info("Checkout preview restored", {
            hasOrderToken: Boolean(orderToken),
            orderId: initialOrder.orderId,
          });
          if (!cancelled) {
            setState({
              imageUrl: initialOrder.previewImageUrl,
              meta,
              orderId: initialOrder.orderId,
              orderToken: orderToken || null,
              orderSnapshotToken: sessionStorage.getItem("dreamOrderSnapshotToken"),
            });
          }
          return;
        }

        const draft = getCurrentDraft();
        const activeOrderId = orderId || sessionStorage.getItem("dreamOrderId");
        const activeOrderToken =
          orderToken || draft.orderToken || sessionStorage.getItem("dreamCheckoutOrderToken");

        if (activeOrderToken) {
          const restored = await validateStoredOrderToken(activeOrderToken);
          if (restored?.previewImageUrl) {
            const meta = metaFromCheckoutOrder(restored);
            if (!cancelled) {
              setState({
                imageUrl: restored.previewImageUrl,
                meta,
                orderId: restored.orderId,
                orderToken: activeOrderToken,
                orderSnapshotToken: sessionStorage.getItem("dreamOrderSnapshotToken"),
              });
            }
            return;
          }
        }

        if (!activeOrderId || draft.orderId !== activeOrderId) {
          console.info("Checkout preview missing", {
            hasOrderToken: Boolean(activeOrderToken),
            hasOrderId: Boolean(activeOrderId),
          });
          if (!cancelled) {
            setState((current) => ({
              ...current,
              orderId: activeOrderId || null,
              orderToken: activeOrderToken || null,
            }));
          }
          return;
        }

        if (!cancelled) {
          setState({
            imageUrl: draft.previewImageUrl || sessionStorage.getItem("previewImageUrl") || "",
            meta: draft.previewMeta || null,
            orderId: draft.orderId || activeOrderId,
            orderToken: activeOrderToken || null,
            orderSnapshotToken:
              draft.orderSnapshotToken ||
              sessionStorage.getItem("dreamOrderSnapshotToken"),
          });
        }
      } catch {
        if (!cancelled) {
          setState({
            imageUrl: "",
            meta: null,
            orderId: orderId || null,
            orderToken: orderToken || null,
            orderSnapshotToken: null,
          });
        }
      }
    }

    void loadPricingState();
    return () => {
      cancelled = true;
    };
  }, [initialOrder, orderId, orderToken]);

  if (!state.orderId || !state.imageUrl || !state.meta) {
    return (
      <div className="rounded-[1.75rem] border border-white/70 bg-white/60 p-6 shadow-soft">
        <Sparkles aria-hidden className="mb-4 h-6 w-6 text-gold" />
        <h2 className="text-3xl font-semibold text-ink">
          {tokenExpired ? "Your preview expired." : "Create your preview first."}
        </h2>
        <p className="mt-3 text-sm leading-6 text-taupe">
          {tokenExpired
            ? "This preview expired or can't be restored. Please create a new preview before choosing a package."
            : "Generate a low-quality preview before choosing a package and starting secure checkout."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StartOverButton />
          <button
            type="button"
            onClick={() => {
              clearBrokenCheckoutState();
              window.location.href = "/create";
            }}
            className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full bg-ink px-5 text-sm font-semibold text-pearl"
          >
            Back to Create
          </button>
        </div>
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
          <p>Ratio: {labels.ratios[state.meta.ratio]}</p>
          <p>Style: {labels.styles[state.meta.style]}</p>
          <p>Theme: {labels.themes[state.meta.theme]}</p>
        </div>
      </section>

      <aside className="space-y-3">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/50 p-4">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Choose your package.
          </h2>
          <p className="mt-1 text-sm leading-6 text-taupe">
            Select how many final wallpapers you want after your free preview.
          </p>
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
        <TrustBadges />
        <CheckoutCTA
          packageId={selectedPackage}
          orderId={state.orderId}
          orderToken={state.orderToken}
          orderSnapshotToken={state.orderSnapshotToken}
        />
      </aside>
    </div>
  );
}

function metaFromCheckoutOrder(order: CheckoutOrderToken): WallpaperMeta {
  return {
    device: order.device as DeviceType,
    ratio: order.ratio as RatioType,
    theme: order.theme as ThemeType,
    style: order.style as WallpaperStyle,
    quoteTone: order.quoteTone as QuoteTone,
    imageSize: `${order.width}x${order.height}`,
    aspectRatio: `${order.width} / ${order.height}`,
  };
}

async function validateStoredOrderToken(orderToken: string) {
  try {
    const response = await fetch("/api/validate-order-token", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderToken }),
    });
    const data = (await response.json()) as {
      valid?: boolean;
      order?: CheckoutOrderToken;
    };

    return response.ok && data.valid ? data.order || null : null;
  } catch {
    return null;
  }
}
