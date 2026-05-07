export const packageIds = ["single", "bundle", "premium"] as const;
export type PackageId = (typeof packageIds)[number];

export type PackageConfig = {
  id: PackageId;
  name: string;
  priceLabel: string;
  amount: number;
  stripePriceEnv: RuntimeStripePriceEnv;
  description: string;
  deliverables: string[];
  checkoutBullets: string[];
  finalAssetCount: number;
};

export type RuntimeStripePriceEnv =
  | "STRIPE_SINGLE_PRICE_ID"
  | "STRIPE_BUNDLE_PRICE_ID"
  | "STRIPE_PREMIUM_PRICE_ID";

export const wallpaperPackages: Record<PackageId, PackageConfig> = {
  single: {
    id: "single",
    name: "Single wallpaper",
    priceLabel: "$4.99",
    amount: 499,
    stripePriceEnv: "STRIPE_SINGLE_PRICE_ID",
    description: "One polished AI wallpaper for your selected device or custom size.",
    deliverables: [
      "1 final PNG",
      "selected size/device",
      "download ready",
      "email delivery optional",
    ],
    checkoutBullets: [
      "One final PNG wallpaper",
      "Selected size / device format",
      "Download ready",
    ],
    finalAssetCount: 1,
  },
  bundle: {
    id: "bundle",
    name: "Mobile + desktop bundle",
    priceLabel: "$6.99",
    amount: 699,
    stripePriceEnv: "STRIPE_BUNDLE_PRICE_ID",
    description: "A matching mobile and desktop wallpaper pair from the same concept.",
    deliverables: [
      "2 final PNG wallpapers",
      "mobile version",
      "desktop version",
      "matching visual direction",
      "download ready",
      "email delivery optional",
    ],
    checkoutBullets: [
      "Two final PNG wallpapers",
      "Mobile + desktop formats",
      "Matching visual direction",
    ],
    finalAssetCount: 2,
  },
  premium: {
    id: "premium",
    name: "Premium 3-version pack",
    priceLabel: "$11.99",
    amount: 1199,
    stripePriceEnv: "STRIPE_PREMIUM_PRICE_ID",
    description: "Three refined wallpaper directions from your selected concept.",
    deliverables: [
      "3 final PNG wallpapers",
      "same selected size/device",
      "three distinct visual variations",
      "download ready",
      "email delivery optional",
    ],
    checkoutBullets: [
      "Three final PNG wallpapers",
      "Same selected size / device",
      "More creative variation",
    ],
    finalAssetCount: 3,
  },
};

export const packages = wallpaperPackages;

export function isPackageId(value: unknown): value is PackageId {
  return typeof value === "string" && packageIds.includes(value as PackageId);
}
