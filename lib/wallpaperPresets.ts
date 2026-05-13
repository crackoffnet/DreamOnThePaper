import type { DeviceType, RatioType, WallpaperInput } from "@/lib/types";
import {
  getOpenAIImageSize,
  type OpenAIImageSize,
} from "@/lib/openaiImageSize";
import { emptyVisualOnlyDreamProfile } from "@/lib/visualDreamProfile";

export type WallpaperPresetCategory = "mobile" | "tablet" | "desktop" | "custom";

export type WallpaperPresetId =
  | "mobile_phone"
  | "mobile_standard"
  | "tablet_landscape"
  | "tablet_portrait"
  | "desktop_standard"
  | "desktop_wide"
  | "desktop_ultrawide"
  | "desktop_4k"
  | "social_story"
  | "square_wallpaper"
  | "custom";

export type WallpaperPreset = {
  id: WallpaperPresetId;
  category: WallpaperPresetCategory;
  label: string;
  ratioLabel: string;
  width: number;
  height: number;
  aspect: string;
  modelSize: OpenAIImageSize;
};

export type CustomSizeValidation =
  | { valid: true; width: number; height: number }
  | { valid: false; message: string };

const MIN_CUSTOM_SIZE = 768;
const MAX_CUSTOM_SIZE = 2560;
const MAX_CUSTOM_PIXELS = 2560 * 2560;

const presetDefinitions: Record<Exclude<WallpaperPresetId, "custom">, Omit<WallpaperPreset, "modelSize">> =
  {
    mobile_phone: {
      id: "mobile_phone",
      category: "mobile",
      label: "Mobile wallpaper",
      ratioLabel: "9:19.5",
      width: 1290,
      height: 2796,
      aspect: "9 / 19.5",
    },
    mobile_standard: {
      id: "mobile_standard",
      category: "mobile",
      label: "Mobile wallpaper",
      ratioLabel: "9:16",
      width: 1440,
      height: 2560,
      aspect: "9 / 16",
    },
    tablet_landscape: {
      id: "tablet_landscape",
      category: "tablet",
      label: "Tablet wallpaper",
      ratioLabel: "4:3",
      width: 1536,
      height: 1152,
      aspect: "4 / 3",
    },
    tablet_portrait: {
      id: "tablet_portrait",
      category: "tablet",
      label: "Vertical tablet",
      ratioLabel: "3:4",
      width: 1152,
      height: 1536,
      aspect: "3 / 4",
    },
    desktop_standard: {
      id: "desktop_standard",
      category: "desktop",
      label: "Desktop wallpaper",
      ratioLabel: "16:10",
      width: 1920,
      height: 1200,
      aspect: "16 / 10",
    },
    desktop_wide: {
      id: "desktop_wide",
      category: "desktop",
      label: "Wide desktop",
      ratioLabel: "16:9",
      width: 3840,
      height: 2160,
      aspect: "16 / 9",
    },
    desktop_4k: {
      id: "desktop_4k",
      category: "desktop",
      label: "4K desktop",
      ratioLabel: "16:9",
      width: 3840,
      height: 2160,
      aspect: "16 / 9",
    },
    desktop_ultrawide: {
      id: "desktop_ultrawide",
      category: "desktop",
      label: "Ultrawide desktop",
      ratioLabel: "21:9",
      width: 2560,
      height: 1080,
      aspect: "21 / 9",
    },
    social_story: {
      id: "social_story",
      category: "custom",
      label: "Story wallpaper",
      ratioLabel: "9:16",
      width: 1080,
      height: 1920,
      aspect: "9 / 16",
    },
    square_wallpaper: {
      id: "square_wallpaper",
      category: "custom",
      label: "Square wallpaper",
      ratioLabel: "1:1",
      width: 2048,
      height: 2048,
      aspect: "1 / 1",
    },
  };

const ratioToPresetId: Record<Exclude<RatioType, "custom">, Exclude<WallpaperPresetId, "custom">> = {
  "iphone-17-pro-max": "mobile_phone",
  iphone: "mobile_standard",
  android: "mobile_standard",
  ipad: "tablet_landscape",
  "tablet-vertical": "tablet_portrait",
  "desktop-16-10": "desktop_standard",
  "desktop-16-9": "desktop_wide",
  "desktop-4k": "desktop_4k",
  "desktop-ultrawide": "desktop_ultrawide",
  story: "social_story",
  square: "square_wallpaper",
};

export function getWallpaperPresetById(
  presetId: WallpaperPresetId,
  customSize?: { width: number; height: number },
): WallpaperPreset {
  if (presetId === "custom") {
    const custom = validateCustomSize(customSize?.width, customSize?.height);
    if (!custom.valid) {
      throw new Error(custom.message);
    }

    return {
      id: "custom",
      category: "custom",
      label: "Custom size wallpaper",
      ratioLabel: `${reduceRatio(custom.width, custom.height)} custom`,
      width: custom.width,
      height: custom.height,
      aspect: `${custom.width} / ${custom.height}`,
      modelSize: getOpenAIImageSize(custom.width, custom.height),
    };
  }

  return withModelSize(presetDefinitions[presetId]);
}

export function getWallpaperPresetForInput(input: WallpaperInput): WallpaperPreset {
  if (input.ratio === "custom") {
    return getWallpaperPresetById("custom", {
      width: input.customWidth || 0,
      height: input.customHeight || 0,
    });
  }

  return getWallpaperPresetById(ratioToPresetId[input.ratio]);
}

export function getWallpaperPresetForSelection(selection: {
  device: DeviceType;
  ratio: RatioType;
  customWidth?: number | null;
  customHeight?: number | null;
}) {
  return getWallpaperPresetForInput({
    device: selection.device,
    ratio: selection.ratio,
    customWidth: selection.customWidth || undefined,
    customHeight: selection.customHeight || undefined,
    theme: "light",
    style: "soft-luxury",
    dreamProfile: { ...emptyVisualOnlyDreamProfile },
    goals: "",
    lifestyle: "",
    career: "",
    personalLife: "",
    health: "",
    place: "",
    feelingWords: "",
    reminder: "",
    quoteTone: "none",
  });
}

export function getPresetIdForRatio(
  ratio: RatioType,
  device: DeviceType,
): WallpaperPresetId {
  if (ratio === "custom") {
    return "custom";
  }

  return ratioToPresetId[ratio];
}

export function getModelCanvasForPreset(preset: WallpaperPreset) {
  return preset.modelSize;
}

export function getFinalDeliverySize(selection: WallpaperInput | WallpaperPreset) {
  const preset = "id" in selection ? selection : getWallpaperPresetForInput(selection);
  return {
    width: preset.width,
    height: preset.height,
  };
}

export function getPreviewRenderSize(
  preset: WallpaperPreset,
  maxLongEdge = 720,
) {
  const longestEdge = Math.max(preset.width, preset.height);
  const scale = Math.min(1, maxLongEdge / longestEdge);

  return {
    width: Math.max(320, Math.round(preset.width * scale)),
    height: Math.max(320, Math.round(preset.height * scale)),
  };
}

export function validateCustomSize(
  width: number | null | undefined,
  height: number | null | undefined,
): CustomSizeValidation {
  const normalizedWidth = Math.round(Number(width));
  const normalizedHeight = Math.round(Number(height));

  if (
    !Number.isFinite(normalizedWidth) ||
    !Number.isFinite(normalizedHeight) ||
    normalizedWidth <= 0 ||
    normalizedHeight <= 0
  ) {
    return {
      valid: false,
      message: "Please enter a valid custom wallpaper size.",
    };
  }

  if (
    normalizedWidth < MIN_CUSTOM_SIZE ||
    normalizedHeight < MIN_CUSTOM_SIZE ||
    normalizedWidth > MAX_CUSTOM_SIZE ||
    normalizedHeight > MAX_CUSTOM_SIZE
  ) {
    return {
      valid: false,
      message: `Custom wallpapers must be between ${MIN_CUSTOM_SIZE}px and ${MAX_CUSTOM_SIZE}px on each side.`,
    };
  }

  if (normalizedWidth * normalizedHeight > MAX_CUSTOM_PIXELS) {
    return {
      valid: false,
      message: "That custom wallpaper size is too large. Please choose a smaller size.",
    };
  }

  return {
    valid: true,
    width: normalizedWidth,
    height: normalizedHeight,
  };
}

function withModelSize(
  preset: Omit<WallpaperPreset, "modelSize">,
): WallpaperPreset {
  return {
    ...preset,
    modelSize: getOpenAIImageSize(preset.width, preset.height),
  };
}

function reduceRatio(width: number, height: number) {
  const divisor = gcd(width, height);
  return `${Math.round(width / divisor)}:${Math.round(height / divisor)}`;
}

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));

  while (y) {
    [x, y] = [y, x % y];
  }

  return x || 1;
}
