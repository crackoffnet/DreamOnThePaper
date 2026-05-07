"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, SlidersHorizontal, Sparkles } from "lucide-react";
import { EmailDeliveryForm } from "@/components/EmailDeliveryForm";
import { LoadingGeneration } from "@/components/LoadingGeneration";
import { SharePanel } from "@/components/SharePanel";
import { getEphemeralImage } from "@/lib/client-images";
import type { WallpaperInput, WallpaperMeta } from "@/lib/types";
import type { FinalAssetResult } from "@/lib/types";
import { getAspectRatioLabel, labels } from "@/lib/wallpaper";
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
  const [orderToken, setOrderToken] = useState("");
  const [orderId, setOrderId] = useState("");

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
    setOrderToken(sessionStorage.getItem("dreamOrderToken") || "");
    setOrderId(sessionStorage.getItem("dreamOrderId") || "");
    const timer = window.setTimeout(() => setIsLoading(false), 500);
    return () => window.clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <LoadingGeneration label="Creating your wallpaper..." />
      </div>
    );
  }

  if (!result.imageUrl || !result.meta) {
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
  const dimensionsLabel = `${dimensions.width} \u00d7 ${dimensions.height} px`;
  const rawAssets = result.finalAssets.length
    ? result.finalAssets
    : [
        {
          id: "legacy-single",
          assetType: "single",
          label: "Wallpaper",
          imageUrl: result.imageUrl,
          width: dimensions.width,
          height: dimensions.height,
          format: "PNG" as const,
        },
      ];
  const preferredAsset =
    rawAssets.find((asset) => asset.assetType === result.wallpaperType) ||
    rawAssets.find((asset) => asset.assetType === "single") ||
    rawAssets[0];
  const assets = preferredAsset ? [preferredAsset] : [];
  const primaryAsset = assets[0];
  const heading = "Ready to download.";
  const wallpaperTypeLabel = labelForWallpaperType(
    result.wallpaperType || meta.device,
  );

  return (
    <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[0.42fr_0.58fr]">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/55 p-5 shadow-soft backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Your wallpaper
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
          {heading}
        </h1>
        <div className="mt-4 grid gap-2 text-sm text-taupe">
          <DetailRow label="Wallpaper type" value={wallpaperTypeLabel} />
          <DetailRow
            label="Ratio"
            value={
              result.input
                ? getAspectRatioLabel(result.input)
                : labels.ratios[meta.ratio]
            }
          />
          <DetailRow label="Dimensions" value={dimensionsLabel} />
          <DetailRow label="Style" value={labels.styles[meta.style]} />
          <DetailRow label="Theme" value={labels.themes[meta.theme]} />
          <DetailRow label="Format" value="PNG" />
        </div>

        <div className="mt-6 grid gap-3">
          {assets.length === 1 ? (
            <DownloadButton
              asset={assets[0]}
              orderToken={orderToken}
              filename={filenameForAsset(assets[0], orderIdShort)}
              label="Download Wallpaper"
            />
          ) : null}
          <p className="-mt-1 text-center text-xs font-medium text-taupe">
            PNG {"\u00b7"}{" "}
            {assets.length === 1
              ? `${assets[0].width} \u00d7 ${assets[0].height} px`
              : `${primaryAsset.width} \u00d7 ${primaryAsset.height} px`}
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
          <EmailDeliveryForm finalGenerationToken={orderToken} />
        </div>
      </div>

      <div className="rounded-[1.75rem] border border-white/70 bg-white/45 p-4 shadow-soft backdrop-blur-xl">
        <div
          className={
            "flex justify-center"
          }
        >
          {assets.map((asset) => (
            <AssetPreviewCard
              key={`${asset.assetType}-${asset.imageUrl}`}
              asset={asset}
              orderToken={orderToken}
              orderIdShort={orderIdShort}
              single
              aspectRatio={meta.aspectRatio}
            />
          ))}
        </div>
        {assets.length === 1 && primaryAsset ? (
          <p className="mt-3 text-center text-xs font-medium text-taupe">
            Final PNG {"\u00b7"} {primaryAsset.width} {"\u00d7"}{" "}
            {primaryAsset.height} px
          </p>
        ) : null}
      </div>
    </section>
  );
}

function AssetPreviewCard({
  asset,
  orderToken,
  orderIdShort,
  single,
  aspectRatio,
}: {
  asset: FinalAssetResult;
  orderToken: string;
  orderIdShort: string;
  single: boolean;
  aspectRatio?: string;
}) {
  const protectedImageUrl = withDownloadToken(asset.imageUrl, orderToken);
  const dimensionsLabel = `${asset.width} \u00d7 ${asset.height} px`;

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
        />
      </div>
      <div className="mt-3 grid gap-2">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-medium text-ink">{asset.label}</p>
          <p className="text-xs text-taupe">{dimensionsLabel}</p>
        </div>
        {!single ? (
          <DownloadButton
            asset={asset}
            orderToken={orderToken}
            filename={filenameForAsset(asset, orderIdShort)}
            label={`Download ${asset.label.replace(" wallpaper", "")}`}
          />
        ) : null}
      </div>
    </div>
  );
}

function DownloadButton({
  asset,
  orderToken,
  filename,
  label,
}: {
  asset: FinalAssetResult;
  orderToken: string;
  filename: string;
  label: string;
}) {
  return (
    <a
      href={withDownloadMode(withDownloadToken(asset.imageUrl, orderToken))}
      download={filename}
      className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-pearl shadow-sm transition hover:bg-cocoa"
    >
      <Download aria-hidden className="h-4 w-4" />
      {label}
    </a>
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
