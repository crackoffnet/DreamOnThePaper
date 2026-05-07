"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, SlidersHorizontal, Sparkles } from "lucide-react";
import { EmailDeliveryForm } from "@/components/EmailDeliveryForm";
import { LoadingGeneration } from "@/components/LoadingGeneration";
import { SharePanel } from "@/components/SharePanel";
import { StartOverButton } from "@/components/StartOverButton";
import { getEphemeralImage } from "@/lib/client-images";
import type { FinalAssetResult, WallpaperInput, WallpaperMeta } from "@/lib/types";
import { getAspectRatioLabel, labels } from "@/lib/wallpaper";
import { getTargetDimensionsLabel } from "@/lib/wallpaperDimensions";
import {
  labelForWallpaperType,
  wallpaperProductFromDevice,
  type WallpaperProductId,
} from "@/lib/wallpaperProducts";

type StoredResult = {
  imageUrl: string;
  input: WallpaperInput | null;
  meta: WallpaperMeta | null;
  dimensions: WallpaperDimensions | null;
  finalAssets: FinalAssetResult[];
  wallpaperType: WallpaperProductId;
};

type WallpaperDimensions = {
  width: number;
  height: number;
};

type FinalAssetHealth = {
  success?: boolean;
  state?: string;
  orderStatus?: string;
  hasFinalAssetRow?: boolean;
  finalAssetCount?: number;
  hasR2Object?: boolean;
  assetId?: string | null;
  assetType?: string | null;
  width?: number | null;
  height?: number | null;
  message?: string;
};

export function ResultPreview() {
  const [result, setResult] = useState<StoredResult>({
    imageUrl: "",
    input: null,
    meta: null,
    dimensions: null,
    finalAssets: [],
    wallpaperType: "mobile",
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingAsset, setIsCheckingAsset] = useState(true);
  const [resultAccessToken, setResultAccessToken] = useState("");
  const [orderId, setOrderId] = useState("");
  const [sessionId, setSessionId] = useState("");
  const [assetHealth, setAssetHealth] = useState<FinalAssetHealth | null>(null);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  useEffect(() => {
    const imageUrl = getEphemeralImage("finalImageUrl");
    const input = parseJson<WallpaperInput>(
      sessionStorage.getItem("dreamWallpaperInput"),
    );
    const meta = parseJson<WallpaperMeta>(sessionStorage.getItem("dreamWallpaperMeta"));
    const dimensions = parseJson<WallpaperDimensions>(
      sessionStorage.getItem("dreamWallpaperDimensions"),
    );
    const finalAssets =
      parseJson<FinalAssetResult[]>(sessionStorage.getItem("dreamFinalAssets")) || [];
    const storedWallpaperType = sessionStorage.getItem("dreamWallpaperType");
    const wallpaperType = wallpaperProductFromDevice(
      storedWallpaperType || meta?.device,
    );

    setResult({ imageUrl, input, meta, dimensions, finalAssets, wallpaperType });
    setResultAccessToken(
      sessionStorage.getItem("dreamResultAccessToken") ||
        sessionStorage.getItem("dreamOrderToken") ||
        "",
    );
    setOrderId(sessionStorage.getItem("dreamOrderId") || "");
    setSessionId(sessionStorage.getItem("dreamFinalSessionId") || "");
    const timer = window.setTimeout(() => setIsLoading(false), 250);
    return () => window.clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    let cancelled = false;

    async function verifyAsset() {
      try {
        let activeToken = resultAccessToken;
        if (!activeToken && sessionId) {
          const refresh = await fetch("/api/verify-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const refreshed = (await refresh.json().catch(() => null)) as
            | { resultAccessToken?: string; finalGenerationToken?: string; orderId?: string }
            | null;
          if (refresh.ok && refreshed?.resultAccessToken) {
            sessionStorage.setItem("dreamResultAccessToken", refreshed.resultAccessToken);
            sessionStorage.setItem(
              "dreamFinalGenerationToken",
              refreshed.finalGenerationToken || refreshed.resultAccessToken,
            );
            if (refreshed.orderId) {
              sessionStorage.setItem("dreamOrderId", refreshed.orderId);
              setOrderId(refreshed.orderId);
            }
            setResultAccessToken(refreshed.resultAccessToken);
            activeToken = refreshed.resultAccessToken;
          }
        }

        if (!activeToken) {
          if (!cancelled) {
            setAssetHealth({
              success: false,
              state: "session_invalid",
              orderStatus: "failed",
              hasR2Object: false,
              message: "This session is no longer available. Please start again to create a new wallpaper.",
            });
          }
          return;
        }

        let response = await fetch("/api/final-asset-health", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ resultAccessToken: activeToken, orderId: orderId || undefined }),
        });
        if (response.status === 403 && sessionId) {
          const refresh = await fetch("/api/verify-checkout-session", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ sessionId }),
          });
          const refreshed = (await refresh.json().catch(() => null)) as
            | { resultAccessToken?: string; finalGenerationToken?: string }
            | null;
          if (refresh.ok && refreshed?.resultAccessToken) {
            sessionStorage.setItem("dreamResultAccessToken", refreshed.resultAccessToken);
            sessionStorage.setItem(
              "dreamFinalGenerationToken",
              refreshed.finalGenerationToken || refreshed.resultAccessToken,
            );
            setResultAccessToken(refreshed.resultAccessToken);
            activeToken = refreshed.resultAccessToken;
            response = await fetch("/api/final-asset-health", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                resultAccessToken: activeToken,
                orderId: orderId || undefined,
              }),
            });
          }
        }
        const payload = (await response.json()) as FinalAssetHealth;
        if (cancelled) {
          return;
        }

        setAssetHealth(payload);
        console.info("[success-page]", {
          orderId: sessionStorage.getItem("dreamOrderId"),
          paymentVerified: payload.orderStatus === "paid" || payload.orderStatus === "final_generated",
          hasFinalAssetRow: payload.hasFinalAssetRow,
          hasR2Object: payload.hasR2Object,
          finalStatus: payload.state || payload.orderStatus,
        });

        if (payload.hasR2Object && payload.assetId && result.meta) {
          const width = payload.width || result.dimensions?.width || dimensionsFromMeta(result.meta).width;
          const height =
            payload.height || result.dimensions?.height || dimensionsFromMeta(result.meta).height;
          const assetType = payload.assetType || result.wallpaperType;
          const imageUrl = `/api/final-asset?orderId=${encodeURIComponent(orderId || sessionStorage.getItem("dreamOrderId") || "")}&assetId=${encodeURIComponent(payload.assetId)}`;
          setResult((current) => ({
            ...current,
            imageUrl,
            dimensions: { width, height },
            finalAssets: [
              {
                id: payload.assetId || "final-asset",
                assetType,
                label: assetDisplayLabel(assetType),
                imageUrl,
                width,
                height,
                format: "PNG",
              },
            ],
          }));
        }
      } catch {
        if (!cancelled) {
          setAssetHealth({
            success: false,
            orderStatus: "failed",
            hasR2Object: false,
            message:
              "We could not verify your generated wallpaper. Please retry generation.",
          });
        }
      } finally {
        if (!cancelled) {
          setIsCheckingAsset(false);
        }
      }
    }

    void verifyAsset();

    return () => {
      cancelled = true;
    };
  }, [
    isLoading,
    resultAccessToken,
    result.meta,
    result.wallpaperType,
    result.dimensions?.width,
    result.dimensions?.height,
    orderId,
    sessionId,
  ]);

  if (isLoading || isCheckingAsset) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <LoadingGeneration
          label={isLoading ? "Loading your wallpaper..." : "Checking your final wallpaper..."}
        />
      </div>
    );
  }

  if (!result.meta) {
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
  const dimensions = result.dimensions || dimensionsFromMeta(meta);
  const actualDimensionsLabel = `${dimensions.width} × ${dimensions.height} px`;
  const targetDimensionsLabel = result.input
    ? getTargetDimensionsLabel(result.input)
    : `${meta.imageSize.replace("x", " × ")} px`;
  const asset = result.finalAssets[0];
  const wallpaperTypeLabel = labelForWallpaperType(result.wallpaperType || meta.device);
  const missingFinalAsset =
    !resultAccessToken ||
    imageLoadFailed ||
    assetHealth?.hasR2Object === false ||
    assetHealth?.orderStatus === "failed" ||
    !asset;
  const retryHref = sessionId ? `/success?session_id=${encodeURIComponent(sessionId)}` : "/create";
  const failureState = assetHealth?.state || "final_failed_retryable";

  if (missingFinalAsset) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/60 p-6 shadow-soft">
          <Sparkles aria-hidden className="mb-4 h-6 w-6 text-gold" />
          <h1 className="text-3xl font-semibold text-ink">
            {failureState === "session_invalid"
              ? "We couldn’t open this wallpaper session."
              : failureState === "payment_pending" || failureState === "payment_verified"
                ? "Payment verification is still in progress."
                : "We couldn’t finish your wallpaper yet."}
          </h1>
          <p className="mt-3 text-sm leading-6 text-taupe">
            {failureState === "session_invalid"
              ? "This session is no longer available. Please start again to create a new wallpaper."
              : failureState === "payment_pending" || failureState === "payment_verified"
                ? "Please wait a moment and try again. If this continues, return to checkout or contact support."
                : assetHealth?.message ||
                  "Your payment was received, but the final image could not be completed successfully. You can retry below without paying again."}
          </p>
          <div className="mt-5 flex flex-col gap-3 sm:flex-row">
            {failureState !== "session_invalid" ? (
              <Link
                href={retryHref}
                className="focus-ring inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-pearl"
              >
                {failureState === "payment_pending" || failureState === "payment_verified"
                  ? "Retry"
                  : "Retry Generation"}
              </Link>
            ) : null}
            <StartOverButton className="min-h-11 px-5 text-sm font-medium" />
          </div>
        </div>
      </section>
    );
  }

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
          <DetailRow label="Wallpaper type" value={wallpaperTypeLabel} />
          <DetailRow label="Selected size" value={labels.ratios[meta.ratio]} />
          <DetailRow
            label="Ratio"
            value={
              result.input ? getAspectRatioLabel(result.input) : labels.ratios[meta.ratio]
            }
          />
          <DetailRow label="Target dimensions" value={targetDimensionsLabel} />
          <DetailRow label="Downloaded file" value={`PNG · ${actualDimensionsLabel}`} />
          <DetailRow label="Style" value={labels.styles[meta.style]} />
          <DetailRow label="Theme" value={labels.themes[meta.theme]} />
          <DetailRow label="Format" value="PNG" />
        </div>

        <div className="mt-6 grid gap-3">
          <DownloadButton
            asset={asset}
            resultAccessToken={resultAccessToken}
            filename={filenameForAsset(asset, orderIdShort)}
            label="Download Wallpaper"
            onError={setDownloadError}
          />
          {downloadError ? (
            <p className="-mt-1 text-center text-xs font-medium text-rose-700">
              {downloadError}
            </p>
          ) : null}
          <p className="-mt-1 text-center text-xs font-medium text-taupe">
            Optimized for {labels.ratios[meta.ratio]} {"·"} {asset.width} × {asset.height} px
          </p>
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
          <EmailDeliveryForm resultAccessToken={resultAccessToken} />
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/70 bg-white/45 p-4 shadow-soft backdrop-blur-xl">
        <div className="flex justify-center">
          <AssetPreviewCard
            asset={asset}
            resultAccessToken={resultAccessToken}
            single
            aspectRatio={meta.aspectRatio}
            onImageError={() => setImageLoadFailed(true)}
          />
        </div>
        <p className="mt-3 text-center text-xs font-medium text-taupe">
          Final PNG · High-resolution · No preview watermark
        </p>
      </div>
    </section>
  );
}

function AssetPreviewCard({
  asset,
  resultAccessToken,
  single,
  aspectRatio,
  onImageError,
}: {
  asset: FinalAssetResult;
  resultAccessToken: string;
  single: boolean;
  aspectRatio?: string;
  onImageError: () => void;
}) {
  const protectedImageUrl = withDownloadToken(asset.imageUrl, resultAccessToken);
  const dimensionsLabel = `${asset.width} × ${asset.height} px`;

  return (
    <div className={single ? "w-full max-w-md" : "rounded-2xl bg-white/35 p-3"}>
      <div
        className={`relative w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-linen shadow-soft ${
          single ? "max-h-[72vh]" : "aspect-[4/5]"
        }`}
        style={aspectRatio ? { aspectRatio } : undefined}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={protectedImageUrl}
          alt={`${asset.label} generated wallpaper`}
          className="h-full w-full object-cover"
          onError={onImageError}
        />
      </div>
      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-medium text-ink">{asset.label}</p>
          <p className="text-xs text-taupe">{dimensionsLabel}</p>
        </div>
      </div>
    </div>
  );
}

function DownloadButton({
  asset,
  resultAccessToken,
  filename,
  label,
  onError,
}: {
  asset: FinalAssetResult;
  resultAccessToken: string;
  filename: string;
  label: string;
  onError: (message: string) => void;
}) {
  const [isDownloading, setIsDownloading] = useState(false);

  async function handleDownload() {
    setIsDownloading(true);
    onError("");

    try {
      const response = await fetch(
        withDownloadMode(withDownloadToken(asset.imageUrl, resultAccessToken)),
      );
      const payload = (await response
        .clone()
        .json()
        .catch(() => null)) as { code?: string; message?: string } | null;

      if (!response.ok) {
        throw new Error(
          payload?.code === "FINAL_ASSET_NOT_FOUND"
            ? "Your wallpaper file is missing. Please retry generation."
            : payload?.message || "Unable to download your wallpaper right now.",
        );
      }

      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = objectUrl;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(objectUrl);
    } catch (error) {
      onError(
        error instanceof Error
          ? error.message
          : "Unable to download your wallpaper right now.",
      );
    } finally {
      setIsDownloading(false);
    }
  }

  return (
    <button
      type="button"
      onClick={handleDownload}
      disabled={isDownloading}
      className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-pearl shadow-sm transition hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-70"
    >
      {isDownloading ? (
        <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
      ) : (
        <Download aria-hidden className="h-4 w-4" />
      )}
      {isDownloading ? "Preparing download..." : label}
    </button>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <p>
      <span className="font-medium text-ink">{label}:</span> {value}
    </p>
  );
}

function withDownloadToken(imageUrl: string, token: string) {
  if (
    !imageUrl ||
    !token ||
    (!imageUrl.includes("/api/wallpaper-image/finals") &&
      !imageUrl.includes("/api/final-asset"))
  ) {
    return imageUrl;
  }

  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${separator}token=${encodeURIComponent(token)}`;
}

function withDownloadMode(imageUrl: string) {
  if (!imageUrl.includes("/api/final-asset")) {
    return imageUrl;
  }

  const separator = imageUrl.includes("?") ? "&" : "?";
  return `${imageUrl}${separator}download=1`;
}

function filenameForAsset(asset: FinalAssetResult, orderIdShort: string) {
  if (asset.assetType === "mobile") {
    return `dream-on-the-paper-mobile-${orderIdShort}.png`;
  }
  if (asset.assetType === "tablet") {
    return `dream-on-the-paper-tablet-${orderIdShort}.png`;
  }
  if (asset.assetType === "desktop") {
    return `dream-on-the-paper-desktop-${orderIdShort}.png`;
  }
  if (asset.assetType === "custom") {
    return `dream-on-the-paper-custom-${orderIdShort}.png`;
  }
  return `dream-on-the-paper-wallpaper-${orderIdShort}.png`;
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

function dimensionsFromMeta(meta: WallpaperMeta) {
  const [width, height] = meta.imageSize.split("x").map(Number);

  return {
    width: Number.isFinite(width) ? width : 0,
    height: Number.isFinite(height) ? height : 0,
  };
}

function assetDisplayLabel(assetType: string) {
  if (assetType === "mobile") return "Mobile wallpaper";
  if (assetType === "tablet") return "Tablet wallpaper";
  if (assetType === "desktop") return "Desktop wallpaper";
  if (assetType === "custom") return "Custom size wallpaper";
  return "Wallpaper";
}
