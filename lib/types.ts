export type QuoteStyle = "soft" | "powerful" | "spiritual";
export type DeviceType = "mobile" | "desktop";
export type ThemeType = "light" | "dark";
export type WallpaperStyle = "minimalist" | "luxury" | "dreamy" | "nature";

export type VisionFormData = {
  goals: string;
  lifestyle: string;
  career: string;
  relationships: string;
  feeling: string;
  travel: string;
  health: string;
  keywords: string;
  quoteStyle: QuoteStyle;
  reminder: string;
  device: DeviceType;
  theme: ThemeType;
  style: WallpaperStyle;
};

export type GenerateResponse = {
  imageUrl: string;
  prompt: string;
  mock: boolean;
};
