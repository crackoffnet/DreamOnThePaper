export const packageIds = ["single"] as const;
export type PackageId = (typeof packageIds)[number];

export type RuntimeStripePriceEnv = "STRIPE_SINGLE_PRICE_ID";

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

export const wallpaperPackages: Record<PackageId, PackageConfig> = {
  single: {
    id: "single",
    name: "Final wallpaper",
    priceLabel: "$4.99",
    amount: 499,
    stripePriceEnv: "STRIPE_SINGLE_PRICE_ID",
    description: "One polished cinematic wallpaper for your selected format.",
    deliverables: [
      "One final PNG",
      "Selected size/device",
      "Download ready",
      "Email delivery optional",
    ],
    checkoutBullets: [
      "One final PNG wallpaper",
      "Selected size / device format",
      "Download ready",
    ],
    finalAssetCount: 1,
  },
};

export const packages = wallpaperPackages;

export function isPackageId(value: unknown): value is PackageId {
  return typeof value === "string" && packageIds.includes(value as PackageId);
}

export function normalizePackageId(_value: unknown): PackageId {
  return "single";
}
