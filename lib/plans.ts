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
    description: "A matching pair for your daily screens.",
    features: ["Two screen formats", "Cohesive visual direction", "Best everyday value"],
    versions: 2,
  },
  premium: {
    name: "Premium 3-version pack",
    price: "$19.99",
    amount: 1999,
    description: "Three refined directions to choose from.",
    features: ["Three versions", "More style exploration", "Best for keepsake results"],
    versions: 3,
  },
};
