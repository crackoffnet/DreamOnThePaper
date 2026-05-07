import type { DeviceType } from "@/lib/types";

export const wallpaperProductIds = [
  "mobile",
  "tablet",
  "desktop",
  "custom",
] as const;

export type WallpaperProductId = (typeof wallpaperProductIds)[number];

export type WallpaperProductConfig = {
  id: WallpaperProductId;
  label: string;
  priceLabel: string;
  amount: number;
  description: string;
  deliverables: string[];
  checkoutBullets: string[];
};

export const wallpaperProducts: Record<
  WallpaperProductId,
  WallpaperProductConfig
> = {
  mobile: {
    id: "mobile",
    label: "Mobile wallpaper",
    priceLabel: "$4.99",
    amount: 499,
    description:
      "One polished phone wallpaper sized for your selected mobile ratio.",
    deliverables: [
      "One final PNG",
      "Mobile format",
      "Download ready",
      "Email delivery optional",
    ],
    checkoutBullets: [
      "One final PNG wallpaper",
      "Selected mobile size",
      "High-resolution download",
      "Email delivery optional",
    ],
  },
  tablet: {
    id: "tablet",
    label: "Tablet wallpaper",
    priceLabel: "$4.99",
    amount: 499,
    description:
      "One polished tablet wallpaper sized for your selected tablet ratio.",
    deliverables: [
      "One final PNG",
      "Tablet format",
      "Download ready",
      "Email delivery optional",
    ],
    checkoutBullets: [
      "One final PNG wallpaper",
      "Selected tablet size",
      "High-resolution download",
      "Email delivery optional",
    ],
  },
  desktop: {
    id: "desktop",
    label: "Desktop wallpaper",
    priceLabel: "$4.99",
    amount: 499,
    description:
      "One polished desktop wallpaper sized for your selected desktop ratio.",
    deliverables: [
      "One final PNG",
      "Desktop format",
      "Download ready",
      "Email delivery optional",
    ],
    checkoutBullets: [
      "One final PNG wallpaper",
      "Selected desktop size",
      "High-resolution download",
      "Email delivery optional",
    ],
  },
  custom: {
    id: "custom",
    label: "Custom size wallpaper",
    priceLabel: "$4.99",
    amount: 499,
    description: "One polished wallpaper created for your custom dimensions.",
    deliverables: [
      "One final PNG",
      "Custom dimensions",
      "Download ready",
      "Email delivery optional",
    ],
    checkoutBullets: [
      "One final PNG wallpaper",
      "Selected custom dimensions",
      "High-resolution download",
      "Email delivery optional",
    ],
  },
};

export function isWallpaperProductId(
  value: unknown,
): value is WallpaperProductId {
  return (
    typeof value === "string" &&
    wallpaperProductIds.includes(value as WallpaperProductId)
  );
}

export function wallpaperProductFromDevice(
  device: string | null | undefined,
): WallpaperProductId {
  return isWallpaperProductId(device) ? device : "mobile";
}

export function labelForWallpaperType(
  wallpaperType: string | null | undefined,
) {
  return wallpaperProducts[wallpaperProductFromDevice(wallpaperType)].label;
}

export function wallpaperTypeFromDevice(device: DeviceType): WallpaperProductId {
  return wallpaperProductFromDevice(device);
}
