import type {
  DeviceType,
  QuoteTone,
  RatioType,
  ThemeType,
  WallpaperInput,
  WallpaperMeta,
  WallpaperStyle,
} from "@/lib/types";
import { getOpenAIImageSize } from "@/lib/openaiImageSize";

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
  desktop: ["desktop-16-9", "desktop-16-10", "desktop-4k"],
  tablet: ["ipad", "tablet-vertical"],
  custom: ["custom"],
} as const satisfies Record<DeviceType, readonly RatioType[]>;

export const labels = {
  devices: {
    mobile: "Mobile wallpaper",
    desktop: "Desktop wallpaper",
    tablet: "Tablet wallpaper",
    custom: "Custom size wallpaper",
  },
  ratios: {
    "iphone-17-pro-max": "iPhone 17 Pro Max / 9:19.5",
    iphone: "iPhone general / 9:16",
    android: "Android / 9:16",
    "desktop-16-9": "16:9",
    "desktop-16-10": "16:10",
    "desktop-4k": "4K desktop",
    ipad: "iPad / 4:3",
    "tablet-vertical": "Vertical tablet",
    custom: "Custom size (max 4K)",
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
  quoteTones: {
    "soft-emotional": "Soft and emotional",
    "powerful-confident": "Powerful and confident",
    "spiritual-calm": "Spiritual and calm",
    none: "No quote",
  },
} as const;

const ratioMeta: Record<
  RatioType,
  Pick<WallpaperMeta, "aspectRatio" | "imageSize">
> = {
  "iphone-17-pro-max": { aspectRatio: "9 / 19.5", imageSize: "1072x2320" },
  iphone: { aspectRatio: "9 / 16", imageSize: "1008x1792" },
  android: { aspectRatio: "9 / 16", imageSize: "1008x1792" },
  "desktop-16-9": { aspectRatio: "16 / 9", imageSize: "1792x1008" },
  "desktop-16-10": { aspectRatio: "16 / 10", imageSize: "1920x1200" },
  "desktop-4k": { aspectRatio: "16 / 9", imageSize: "3840x2160" },
  ipad: { aspectRatio: "4 / 3", imageSize: "1536x1152" },
  "tablet-vertical": { aspectRatio: "3 / 4", imageSize: "1152x1536" },
  custom: { aspectRatio: "2 / 3", imageSize: "1200x1800" },
};

export const defaultWallpaperInput: WallpaperInput = {
  device: "mobile",
  ratio: "iphone-17-pro-max",
  theme: "light",
  style: "soft-luxury",
  goals: "",
  lifestyle: "",
  career: "",
  personalLife: "",
  health: "",
  place: "",
  feelingWords: "",
  reminder: "",
  quoteTone: "soft-emotional",
  customWidth: 1200,
  customHeight: 1800,
};

export function getWallpaperMeta(input: WallpaperInput): WallpaperMeta {
  if (isCustomWallpaper(input)) {
    return {
      device: input.device,
      ratio: input.ratio,
      theme: input.theme,
      style: input.style,
      quoteTone: input.quoteTone,
      aspectRatio: `${input.customWidth} / ${input.customHeight}`,
      imageSize: `${input.customWidth}x${input.customHeight}`,
    };
  }

  return {
    device: input.device,
    ratio: input.ratio,
    theme: input.theme,
    style: input.style,
    quoteTone: input.quoteTone,
    ...ratioMeta[input.ratio],
  };
}

export function getPreviewImageSize(input: WallpaperInput) {
  const meta = getWallpaperMeta(input);
  const [width, height] = meta.imageSize.split("x").map(Number);
  return getOpenAIImageSize(width, height);
}

export function getFinalImageSize(input: WallpaperInput) {
  const meta = getWallpaperMeta(input);
  const [width, height] = meta.imageSize.split("x").map(Number);
  return getOpenAIImageSize(width, height);
}

export function getResolutionLabel(input: WallpaperInput) {
  if (isCustomWallpaper(input)) {
    return `Custom - ${input.customWidth} x ${input.customHeight}`;
  }

  return labels.ratios[input.ratio];
}

export function getAspectRatioLabel(input: WallpaperInput) {
  if (!isCustomWallpaper(input)) {
    return labels.ratios[input.ratio];
  }

  return `${reduceRatio(input.customWidth, input.customHeight)} custom`;
}

export function buildPreviewWallpaperPrompt(input: WallpaperInput) {
  const summary = summarizeWallpaperInput(input);
  const quoteInstruction =
    input.quoteTone === "none"
      ? "Do not include any quote or readable text."
      : `Place one short readable quote in the center. Quote tone: ${labels.quoteTones[input.quoteTone]}.`;

  return `Create a fast low-resolution preview of a personalized vision board wallpaper.
Device: ${labels.devices[input.device]}
Aspect ratio: ${getAspectRatioLabel(input)}
Resolution target: ${getResolutionLabel(input)}
Theme: ${labels.themes[input.theme]}
Style: ${labels.styles[input.style]}
Mood: calm, elegant, aspirational.
Represent these goals visually: ${summary.goals || "clear personal growth and beauty"}.
Include only a few subtle symbols that match the user's answers.
${quoteInstruction}
This is a preview concept: keep it simple, soft, and slightly less detailed.
No logos. No copyrighted characters. No distorted faces. No tiny unreadable text. No medical, financial, or spiritual guarantees.`;
}

export function buildFinalWallpaperPrompt(input: WallpaperInput) {
  const summary = summarizeWallpaperInput(input);
  const quoteInstruction =
    input.quoteTone === "none"
      ? "Do not include any quote or readable text."
      : `Add centered readable quote: "${summary.reminder || labels.quoteTones[input.quoteTone]}". Typography must be elegant, readable, and not too small.`;

  return `Create a premium, elegant, minimal vision board wallpaper.
Device: ${labels.devices[input.device]}
Aspect ratio: ${getAspectRatioLabel(input)}
Resolution target: ${getResolutionLabel(input)}
Style: ${labels.styles[input.style]}
Theme: ${labels.themes[input.theme]}, warm neutral tones, cream, beige, muted gold, and refined contrast.
Composition: clean, spacious, not cluttered, wallpaper-friendly, with negative space for app icons and desktop folders.
Include subtle visual symbols of success, calm wealth, personal growth, health, home, family, travel, business, nature, or whatever matches the user answers.
Dreams and goals: ${summary.goals || "clear personal growth, beauty, peace, and forward momentum"}.
Life being built: ${summary.lifestyle || "a refined, intentional everyday life"}.
Career, business, or financial goal: ${summary.career || "steady progress and grounded abundance"}.
Personal life: ${summary.personalLife || "love, belonging, and meaningful connection"}.
Health, body, or energy: ${summary.health || "vitality, rest, strength, and calm energy"}.
Place, home, or travel dream: ${summary.place || "a serene beautiful home and inspiring places"}.
Feeling words: ${summary.feelingWords || "clear, soft, focused, abundant"}.
${quoteInstruction}
High-end editorial quality, refined composition, no noise, no chaos, no distortion.
No logos. No copyrighted characters. No distorted faces. No tiny unreadable text.`;
}

function summarizeWallpaperInput(input: WallpaperInput) {
  return {
    goals: sanitizePromptText(input.goals),
    lifestyle: sanitizePromptText(input.lifestyle),
    career: sanitizePromptText(input.career),
    personalLife: sanitizePromptText(input.personalLife),
    health: sanitizePromptText(input.health),
    place: sanitizePromptText(input.place),
    feelingWords: sanitizePromptText(input.feelingWords),
    reminder: sanitizePromptText(input.reminder, 120),
  };
}

function sanitizePromptText(value: string, maxLength = 220) {
  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
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
