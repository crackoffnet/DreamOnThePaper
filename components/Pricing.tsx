"use client";

import { useEffect, useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { CheckoutCTA } from "@/components/CheckoutCTA";
import { StartOverButton } from "@/components/StartOverButton";
import { TrustBadges } from "@/components/TrustBadges";
import {
  clearDreamState,
  ensureFreshDreamState,
  saveDreamState,
  setDreamStateMessage,
} from "@/lib/clientState";
import type { CheckoutOrderToken } from "@/lib/order-state";
import type { DeviceType, QuoteTone, RatioType, ThemeType, WallpaperMeta, WallpaperStyle } from "@/lib/types";
import {
  wallpaperProductFromDevice,
  wallpaperProducts,
  type WallpaperProductId,
} from "@/lib/wallpaperProducts";
import { getWallpaperPresetForSelection } from "@/lib/wallpaperPresets";
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
        if (tokenExpired) {
          clearDreamState();
          setDreamStateMessage("Your preview expired. Please create a new one.");
        }

        const freshState = ensureFreshDreamState();
        if (!freshState && !initialOrder && !orderToken && !orderId) {
          if (!cancelled) {
            setState({
              imageUrl: "",
              meta: null,
              orderId: null,
              orderToken: null,
              orderSnapshotToken: null,
            });
          }
          return;
        }
        if (initialOrder?.previewImageUrl) {
          const meta = metaFromCheckoutOrder(initialOrder);
          saveDreamState({
            orderId: initialOrder.orderId,
            orderToken: orderToken || null,
            previewImageUrl: initialOrder.previewImageUrl,
            previewImageId: initialOrder.previewImageId || null,
            previewCreatedAt: Date.now(),
            wallpaperType: initialOrder.device,
            status: "preview_created",
          });
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
            saveDreamState({
              orderId: restored.orderId,
              orderToken: activeOrderToken,
              previewImageUrl: restored.previewImageUrl,
              previewImageId: restored.previewImageId || null,
              previewCreatedAt: Date.now(),
              wallpaperType: restored.device,
              status: "preview_created",
            });
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
  }, [initialOrder, orderId, orderToken, tokenExpired]);

  useEffect(() => {
    if (
      typeof window === "undefined" ||
      !state.orderId ||
      !state.orderToken ||
      !window.location.search.includes("orderToken=")
    ) {
      return;
    }

    window.history.replaceState(null, "", "/checkout");
  }, [state.orderId, state.orderToken]);

  if (!state.orderId || !state.imageUrl || !state.meta) {
    return (
      <div className="rounded-[1.75rem] border border-white/70 bg-white/60 p-6 shadow-soft">
        <Sparkles aria-hidden className="mb-4 h-6 w-6 text-gold" />
        <h2 className="text-3xl font-semibold text-ink">
          {tokenExpired ? "Your preview expired." : "Create your preview first."}
        </h2>
        <p className="mt-3 text-sm leading-6 text-taupe">
          {tokenExpired
            ? "This preview expired or can't be restored. Please create a new preview before checkout."
            : "Generate a low-resolution preview before starting secure checkout."}
        </p>
        <div className="mt-5 flex flex-wrap gap-2">
          <StartOverButton />
          <button
            type="button"
            onClick={() => {
              clearDreamState();
              setDreamStateMessage("Your preview expired. Please create a new one.");
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

  const wallpaperType = state.meta
    ? wallpaperProductFromDevice(state.meta.device)
    : ("mobile" as WallpaperProductId);
  const product = wallpaperProducts[wallpaperType];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-5 lg:grid-cols-[0.48fr_0.52fr]">
      <section className="rounded-[1.75rem] border border-white/70 bg-white/50 p-4 shadow-soft backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Low-resolution cinematic preview
        </p>
        <h2 className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-ink">
          Your wallpaper concept is ready.
        </h2>
        <p className="mt-2 text-sm leading-6 text-taupe">
          Unlock the full wallpaper to download, email, and share.
        </p>
        <p className="mt-2 text-sm leading-6 text-cocoa">
          Your preview shows the visual direction, mood, and cinematic composition. After payment, we generate a clean high-resolution wallpaper.
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
          <p>Wallpaper type: {labels.devices[state.meta.device]}</p>
          <p>Selected format: {state.meta.ratioLabel}</p>
          <p>Paid file: High-resolution cinematic PNG for this format</p>
          <p>Style: {labels.styles[state.meta.style]}</p>
          <p>Theme: {labels.themes[state.meta.theme]}</p>
        </div>
      </section>

      <aside className="space-y-3">
        <div className="rounded-[1.5rem] border border-white/70 bg-white/50 p-4">
          <h2 className="text-2xl font-semibold tracking-[-0.03em] text-ink">
            Unlock your final wallpaper.
          </h2>
          <p className="mt-1 text-sm leading-6 text-taupe">
            Pay once to generate and download your high-resolution final PNG wallpaper.
          </p>
        </div>
        <div className="rounded-2xl border border-gold/30 bg-white p-4 shadow-soft">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold text-ink">
                {product.label}
              </h2>
              <p className="mt-1 text-sm leading-5 text-taupe">
                {product.description}
              </p>
            </div>
            <p className="shrink-0 text-xl font-semibold text-ink">
              {product.priceLabel}
            </p>
          </div>
          <div className="mt-4 grid gap-2">
            {product.checkoutBullets.map((feature) => (
              <div key={feature} className="flex items-center gap-2 text-sm text-cocoa">
                <Check aria-hidden className="h-4 w-4 text-gold" />
                {feature}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={() => {
              window.location.href = "/create";
            }}
            className="focus-ring mt-4 inline-flex min-h-10 items-center justify-center rounded-full border border-cocoa/10 bg-white/65 px-4 text-sm font-semibold text-ink"
          >
            Edit size or answers
          </button>
        </div>
        <TrustBadges />
        <CheckoutCTA
          wallpaperType={wallpaperType}
          orderId={state.orderId}
          orderToken={state.orderToken}
          orderSnapshotToken={state.orderSnapshotToken}
        />
      </aside>
    </div>
  );
}

function metaFromCheckoutOrder(order: CheckoutOrderToken): WallpaperMeta {
  const width = Number(order.width);
  const height = Number(order.height);
  const preset = getWallpaperPresetForSelection({
    device: order.device as DeviceType,
    ratio: order.ratio as RatioType,
    customWidth: width,
    customHeight: height,
  });
  return {
    device: order.device as DeviceType,
    ratio: order.ratio as RatioType,
    theme: order.theme as ThemeType,
    style: order.style as WallpaperStyle,
    quoteTone: (order.quoteTone || "none") as QuoteTone,
    presetId: preset.id,
    selectedLabel: preset.label,
    ratioLabel: preset.ratioLabel,
    finalWidth: preset.width,
    finalHeight: preset.height,
    outputFormat: "PNG",
    modelSize: preset.modelSize,
    imageSize: `${preset.width}x${preset.height}`,
    aspectRatio: preset.aspect,
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
