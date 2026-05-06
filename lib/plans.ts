export const packageIds = ["single", "bundle", "premium"] as const;
export type PackageId = (typeof packageIds)[number];

export const packages: Record<
  PackageId,
  {
    name: string;
    price: string;
    amount: number;
    description: string;
    features: string[];
    versions: number;
  }
> = {
  single: {
    name: "Single wallpaper",
    price: "$7.99",
    amount: 799,
    description: "One polished wallpaper for your selected device.",
    features: ["One AI wallpaper", "Phone, desktop, or tablet", "Download ready"],
    versions: 1,
  },
  bundle: {
    name: "Mobile + desktop bundle",
    price: "$12.99",
    amount: 1299,
    description: "One final wallpaper now, with extra format fulfillment coming soon.",
    features: ["One final image today", "Original selected size", "More formats soon"],
    versions: 1,
  },
  premium: {
    name: "Premium 3-version pack",
    price: "$19.99",
    amount: 1999,
    description: "One final wallpaper now, with multi-version fulfillment coming soon.",
    features: ["One final image today", "Original selected style", "More versions soon"],
    versions: 1,
  },
};
