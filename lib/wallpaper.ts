import type {
  DeviceType,
  QuoteTone,
  RatioType,
  ThemeType,
  WallpaperInput,
  WallpaperMeta,
  WallpaperStyle,
} from "@/lib/types";
import {
  buildLegacyWallpaperFields,
  emptyVisualOnlyDreamProfile,
  profileFromStoredAnswers,
} from "@/lib/visualDreamProfile";
import { buildVisualOnlyWallpaperPrompt } from "@/lib/prompting/buildVisualOnlyWallpaperPrompt";
import {
  getTargetDimensionsLabel,
  getWallpaperDimensionConfig,
} from "@/lib/wallpaperDimensions";
import { getWallpaperPresetForInput } from "@/lib/wallpaperPresets";

export const devices = ["mobile", "desktop", "tablet", "custom"] as const satisfies readonly DeviceType[];
export const themes = ["light", "dark"] as const satisfies readonly ThemeType[];
export const styles = [
  "soft-luxury",
  "minimal",
  "dreamy",
  "nature",
  "feminine",
  "wealth-business",
  "family-home",
  "fitness-health",
  "freedom-travel",
] as const satisfies readonly WallpaperStyle[];
export const quoteTones = [
  "soft-emotional",
  "powerful-confident",
  "spiritual-calm",
  "none",
] as const satisfies readonly QuoteTone[];

export const ratioOptions = {
  mobile: ["iphone-17-pro-max", "iphone", "android"],
  desktop: ["desktop-16-9", "desktop-ultrawide"],
  tablet: ["ipad", "tablet-vertical"],
  custom: ["custom", "story", "square"],
} as const satisfies Record<DeviceType, readonly RatioType[]>;

export const labels = {
  devices: {
    mobile: "Mobile wallpaper",
    desktop: "Desktop wallpaper",
    tablet: "Tablet wallpaper",
    custom: "Custom size wallpaper",
  },
  ratios: {
    "iphone-17-pro-max": "iPhone / 9:19.5",
    iphone: "iPhone / 9:16",
    android: "Android / 9:16",
    "desktop-16-9": "16:9",
    "desktop-16-10": "Laptop / 16:10",
    "desktop-4k": "Wide desktop / 16:9",
    "desktop-ultrawide": "Ultrawide",
    ipad: "iPad / 4:3",
    "tablet-vertical": "Vertical tablet / 3:4",
    story: "Story",
    square: "Square",
    custom: "Custom size",
  },
  themes: {
    light: "Light",
    dark: "Dark",
  },
  styles: {
    "soft-luxury": "Soft luxury",
    minimal: "Minimal",
    dreamy: "Dreamy",
    nature: "Nature",
    feminine: "Feminine",
    "wealth-business": "Wealth / business",
    "family-home": "Family / home",
    "fitness-health": "Fitness / health",
    "freedom-travel": "Freedom / travel",
  },
} as const;

const defaultDreamProfileFields = buildLegacyWallpaperFields(emptyVisualOnlyDreamProfile);

export const defaultWallpaperInput: WallpaperInput = {
  device: "mobile",
  ratio: "iphone-17-pro-max",
  theme: "light",
  style: "soft-luxury",
  dreamProfile: { ...emptyVisualOnlyDreamProfile },
  goals: defaultDreamProfileFields.goals,
  lifestyle: defaultDreamProfileFields.lifestyle,
  career: defaultDreamProfileFields.career,
  personalLife: defaultDreamProfileFields.personalLife,
  health: defaultDreamProfileFields.health,
  place: defaultDreamProfileFields.place,
  feelingWords: defaultDreamProfileFields.feelingWords,
  reminder: defaultDreamProfileFields.reminder,
  quoteTone: "none",
  customWidth: 1200,
  customHeight: 1800,
};

export function normalizeWallpaperInput(
  value?: Partial<WallpaperInput> | null,
): WallpaperInput {
  const source = value || {};
  const dreamProfile = source.dreamProfile
    ? profileFromStoredAnswers(source.dreamProfile)
    : profileFromStoredAnswers({
        goals: source.goals,
        lifestyle: source.lifestyle,
        career: source.career,
        personalLife: source.personalLife,
        health: source.health,
        place: source.place,
        feelingWords: source.feelingWords,
        reminder: source.reminder,
      });
  const legacyFields = buildLegacyWallpaperFields(dreamProfile);

  return {
    ...defaultWallpaperInput,
    ...source,
    dreamProfile,
    goals: legacyFields.goals,
    lifestyle: legacyFields.lifestyle,
    career: legacyFields.career,
    personalLife: legacyFields.personalLife,
    health: legacyFields.health,
    place: legacyFields.place,
    feelingWords: legacyFields.feelingWords,
    reminder: legacyFields.reminder,
    quoteTone: source.quoteTone || "none",
  };
}

export function getWallpaperMeta(input: WallpaperInput): WallpaperMeta {
  const preset = getWallpaperPresetForInput(input);
  const dimensions = getWallpaperDimensionConfig(input);

  return {
    device: input.device,
    ratio: input.ratio,
    theme: input.theme,
    style: input.style,
    quoteTone: input.quoteTone,
    presetId: preset.id,
    selectedLabel: preset.label,
    ratioLabel: preset.ratioLabel,
    finalWidth: preset.width,
    finalHeight: preset.height,
    outputFormat: "PNG",
    modelSize: preset.modelSize,
    aspectRatio: dimensions.aspectRatio,
    imageSize: `${preset.width}x${preset.height}`,
  };
}

export function getPreviewImageSize(input: WallpaperInput) {
  return getWallpaperMeta(input).modelSize;
}

export function getFinalImageSize(input: WallpaperInput) {
  return getWallpaperMeta(input).modelSize;
}

export function getResolutionLabel(input: WallpaperInput) {
  return getTargetDimensionsLabel(input);
}

export function getAspectRatioLabel(input: WallpaperInput) {
  if (!isCustomWallpaper(input)) {
    return labels.ratios[input.ratio];
  }

  return `${reduceRatio(input.customWidth, input.customHeight)} custom`;
}

export function buildPreviewWallpaperPrompt(input: WallpaperInput) {
  return buildVisualOnlyWallpaperPrompt({
    input,
    mode: "preview",
  });
}

export function buildFinalWallpaperPrompt(input: WallpaperInput) {
  return buildVisualOnlyWallpaperPrompt({
    input,
    mode: "final",
  });
}

export const buildWallpaperPrompt = buildFinalWallpaperPrompt;

export function isValidRatioForDevice(device: DeviceType, ratio: RatioType) {
  return (ratioOptions[device] as readonly RatioType[]).includes(ratio);
}

export function isCustomWallpaper(input: WallpaperInput): input is WallpaperInput & {
  customWidth: number;
  customHeight: number;
} {
  return (
    input.device === "custom" &&
    input.ratio === "custom" &&
    Number.isFinite(input.customWidth) &&
    Number.isFinite(input.customHeight)
  );
}

export function reduceRatio(width: number, height: number) {
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
