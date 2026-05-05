import type {
  DeviceType,
  QuoteTone,
  RatioType,
  ThemeType,
  WallpaperInput,
  WallpaperMeta,
  WallpaperStyle,
} from "@/lib/types";

export const devices = ["mobile", "desktop", "tablet"] as const satisfies readonly DeviceType[];
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
} as const satisfies Record<DeviceType, readonly RatioType[]>;

export const labels = {
  devices: {
    mobile: "Mobile wallpaper",
    desktop: "Desktop wallpaper",
    tablet: "Tablet wallpaper",
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
  "iphone-17-pro-max": { aspectRatio: "9 / 19.5", imageSize: "1024x1536" },
  iphone: { aspectRatio: "9 / 16", imageSize: "1024x1536" },
  android: { aspectRatio: "9 / 16", imageSize: "1024x1536" },
  "desktop-16-9": { aspectRatio: "16 / 9", imageSize: "1536x1024" },
  "desktop-16-10": { aspectRatio: "16 / 10", imageSize: "1536x1024" },
  "desktop-4k": { aspectRatio: "16 / 9", imageSize: "1536x1024" },
  ipad: { aspectRatio: "4 / 3", imageSize: "1024x1024" },
  "tablet-vertical": { aspectRatio: "3 / 4", imageSize: "1024x1536" },
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
};

export function getWallpaperMeta(input: WallpaperInput): WallpaperMeta {
  return {
    device: input.device,
    ratio: input.ratio,
    theme: input.theme,
    style: input.style,
    quoteTone: input.quoteTone,
    ...ratioMeta[input.ratio],
  };
}

export function buildWallpaperPrompt(input: WallpaperInput) {
  const quoteInstruction =
    input.quoteTone === "none"
      ? "Do not include any quote or readable text."
      : `Place one short readable quote in the center. Quote tone: ${labels.quoteTones[input.quoteTone]}.`;

  return `Create a premium personalized vision board wallpaper.
Device: ${labels.devices[input.device]}
Aspect ratio: ${labels.ratios[input.ratio]}
Theme: ${labels.themes[input.theme]}
Style: ${labels.styles[input.style]}
Mood: calm, elegant, aspirational, emotionally warm.
Represent these goals visually: ${input.goals || "clear personal growth, beauty, peace, and forward momentum"}.
Dream life context: ${input.lifestyle || "a refined, intentional everyday life"}.
Career, business, or financial vision: ${input.career || "steady progress and grounded abundance"}.
Personal life priorities: ${input.personalLife || "love, belonging, and meaningful connection"}.
Health, body, or energy vision: ${input.health || "vitality, rest, strength, and calm energy"}.
Place, home, or travel dream: ${input.place || "a serene beautiful home and inspiring places"}.
Feeling words: ${input.feelingWords || "clear, soft, focused, abundant"}.
Daily reminder intent: ${input.reminder || "return to the vision with confidence"}.
Include subtle visual symbols for home, family, health, travel, business, wealth, nature, or whatever matches the user answers.
${quoteInstruction}
Design must be clean, refined, not cluttered, wallpaper-friendly, with generous negative space for app icons.
No logos. No copyrighted characters. No distorted faces. No tiny unreadable text. No medical, financial, or spiritual guarantees.`;
}

export function isValidRatioForDevice(device: DeviceType, ratio: RatioType) {
  return (ratioOptions[device] as readonly RatioType[]).includes(ratio);
}
