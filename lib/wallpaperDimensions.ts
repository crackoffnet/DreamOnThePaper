import type { DeviceType, RatioType, WallpaperInput } from "@/lib/types";
import { getOpenAIImageSize, type OpenAIImageSize } from "@/lib/openaiImageSize";

export type WallpaperDimensionConfig = {
  wallpaperType: DeviceType;
  ratio: RatioType;
  label: string;
  ratioLabel: string;
  targetWidth: number;
  targetHeight: number;
  aspectRatio: string;
  previewFrameAspectRatio: string;
  openAiSize: OpenAIImageSize;
};

type BaseDimensionConfig = Omit<WallpaperDimensionConfig, "openAiSize">;

const ratioDimensionConfig: Record<Exclude<RatioType, "custom">, BaseDimensionConfig> = {
  "iphone-17-pro-max": {
    wallpaperType: "mobile",
    ratio: "iphone-17-pro-max",
    label: "Mobile wallpaper",
    ratioLabel: "iPhone 17 Pro Max / 9:19.5",
    targetWidth: 1072,
    targetHeight: 2320,
    aspectRatio: "9 / 19.5",
    previewFrameAspectRatio: "9 / 19.5",
  },
  iphone: {
    wallpaperType: "mobile",
    ratio: "iphone",
    label: "Mobile wallpaper",
    ratioLabel: "iPhone general / 9:16",
    targetWidth: 1008,
    targetHeight: 1792,
    aspectRatio: "9 / 16",
    previewFrameAspectRatio: "9 / 16",
  },
  android: {
    wallpaperType: "mobile",
    ratio: "android",
    label: "Mobile wallpaper",
    ratioLabel: "Android / 9:16",
    targetWidth: 1008,
    targetHeight: 1792,
    aspectRatio: "9 / 16",
    previewFrameAspectRatio: "9 / 16",
  },
  "desktop-16-9": {
    wallpaperType: "desktop",
    ratio: "desktop-16-9",
    label: "Desktop wallpaper",
    ratioLabel: "16:9",
    targetWidth: 1792,
    targetHeight: 1008,
    aspectRatio: "16 / 9",
    previewFrameAspectRatio: "16 / 9",
  },
  "desktop-16-10": {
    wallpaperType: "desktop",
    ratio: "desktop-16-10",
    label: "Desktop wallpaper",
    ratioLabel: "16:10",
    targetWidth: 1920,
    targetHeight: 1200,
    aspectRatio: "16 / 10",
    previewFrameAspectRatio: "16 / 10",
  },
  "desktop-4k": {
    wallpaperType: "desktop",
    ratio: "desktop-4k",
    label: "Desktop wallpaper",
    ratioLabel: "4K desktop",
    targetWidth: 3840,
    targetHeight: 2160,
    aspectRatio: "16 / 9",
    previewFrameAspectRatio: "16 / 9",
  },
  ipad: {
    wallpaperType: "tablet",
    ratio: "ipad",
    label: "Tablet wallpaper",
    ratioLabel: "iPad / 4:3",
    targetWidth: 1536,
    targetHeight: 1152,
    aspectRatio: "4 / 3",
    previewFrameAspectRatio: "4 / 3",
  },
  "tablet-vertical": {
    wallpaperType: "tablet",
    ratio: "tablet-vertical",
    label: "Tablet wallpaper",
    ratioLabel: "Vertical tablet",
    targetWidth: 1152,
    targetHeight: 1536,
    aspectRatio: "3 / 4",
    previewFrameAspectRatio: "3 / 4",
  },
};

export function getWallpaperDimensionConfig(
  input: WallpaperInput,
): WallpaperDimensionConfig {
  if (input.device === "custom" && input.ratio === "custom") {
    const targetWidth = Math.max(1, Math.round(input.customWidth || 1200));
    const targetHeight = Math.max(1, Math.round(input.customHeight || 1800));
    return {
      wallpaperType: "custom",
      ratio: "custom",
      label: "Custom size wallpaper",
      ratioLabel: "Custom size (max 4K)",
      targetWidth,
      targetHeight,
      aspectRatio: `${targetWidth} / ${targetHeight}`,
      previewFrameAspectRatio: `${targetWidth} / ${targetHeight}`,
      openAiSize: getOpenAIImageSize(targetWidth, targetHeight),
    };
  }

  const config = ratioDimensionConfig[input.ratio as Exclude<RatioType, "custom">];
  return {
    ...config,
    openAiSize: getOpenAIImageSize(config.targetWidth, config.targetHeight),
  };
}

export function getTargetDimensionsLabel(input: WallpaperInput) {
  const config = getWallpaperDimensionConfig(input);
  return `${config.targetWidth} × ${config.targetHeight} px`;
}

export function getTargetDimensions(input: WallpaperInput) {
  const config = getWallpaperDimensionConfig(input);
  return {
    width: config.targetWidth,
    height: config.targetHeight,
  };
}

export function getPreviewOptimizedLabel(input: WallpaperInput) {
  return `Optimized for ${getTargetDimensionsLabel(input)}`;
}
