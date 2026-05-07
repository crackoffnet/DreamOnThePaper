import type { WallpaperInput } from "@/lib/types";
import {
  getPreviewRenderSize,
  getWallpaperPresetForInput,
  type WallpaperPreset,
} from "@/lib/wallpaperPresets";

export type WallpaperDimensionConfig = {
  wallpaperType: WallpaperPreset["category"];
  ratio: WallpaperInput["ratio"];
  label: string;
  ratioLabel: string;
  targetWidth: number;
  targetHeight: number;
  aspectRatio: string;
  previewFrameAspectRatio: string;
  openAiSize: WallpaperPreset["modelSize"];
  presetId: WallpaperPreset["id"];
};

export function getWallpaperDimensionConfig(
  input: WallpaperInput,
): WallpaperDimensionConfig {
  const preset = getWallpaperPresetForInput(input);

  return {
    wallpaperType: preset.category,
    ratio: input.ratio,
    label: preset.label,
    ratioLabel: preset.ratioLabel,
    targetWidth: preset.width,
    targetHeight: preset.height,
    aspectRatio: preset.aspect,
    previewFrameAspectRatio: preset.aspect,
    openAiSize: preset.modelSize,
    presetId: preset.id,
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
  const preset = getWallpaperPresetForInput(input);
  const preview = getPreviewRenderSize(preset);
  return `Preview shown at ${preview.width} × ${preview.height} px`;
}
