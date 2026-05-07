export type DeviceType = "mobile" | "desktop" | "tablet" | "custom";
export type RatioType =
  | "iphone-17-pro-max"
  | "iphone"
  | "android"
  | "desktop-16-9"
  | "desktop-16-10"
  | "desktop-4k"
  | "ipad"
  | "tablet-vertical"
  | "custom";
export type ThemeType = "light" | "dark";
export type WallpaperStyle =
  | "soft-luxury"
  | "minimal"
  | "dreamy"
  | "nature"
  | "feminine"
  | "wealth-business"
  | "family-home"
  | "fitness-health"
  | "freedom-travel";
export type QuoteTone = "soft-emotional" | "powerful-confident" | "spiritual-calm" | "none";

export type WallpaperInput = {
  device: DeviceType;
  ratio: RatioType;
  theme: ThemeType;
  style: WallpaperStyle;
  goals: string;
  lifestyle: string;
  career: string;
  personalLife: string;
  health: string;
  place: string;
  feelingWords: string;
  reminder: string;
  quoteTone: QuoteTone;
  customWidth?: number;
  customHeight?: number;
};

export type WallpaperMeta = {
  device: DeviceType;
  ratio: RatioType;
  theme: ThemeType;
  style: WallpaperStyle;
  quoteTone: QuoteTone;
  imageSize: string;
  aspectRatio: string;
};

export type GenerateResponse = {
  success?: boolean;
  orderId?: string;
  previewImageId?: string | null;
  previewImageUrl?: string;
  orderToken?: string;
  orderSnapshotToken?: string;
  imageUrl?: string;
  finalImageUrl?: string;
  finalWidth?: number;
  finalHeight?: number;
  finalAssets?: FinalAssetResult[];
  imageBase64?: string;
  mimeType?: string;
  meta?: WallpaperMeta;
  mock?: boolean;
  code?: string;
  retryAfterSeconds?: number;
  message?: string;
  error?: string;
};

export type FinalAssetResult = {
  id: string;
  assetType: string;
  label: string;
  imageUrl: string;
  downloadUrl?: string;
  width: number;
  height: number;
  format: "PNG";
};
