import { buildFinalGenerationPlan } from "@/lib/finalGenerationPlan";
import {
  getFinalAssets,
  type DbOrder,
  type FinalAsset,
} from "@/lib/orders";
import { imageExists } from "@/lib/storage";
import type { FinalAssetResult } from "@/lib/types";
import type { PackageId } from "@/lib/packages";

type ResolvedFinalAssets = {
  assets: FinalAsset[];
  finalAssets: FinalAssetResult[];
  primaryAsset: FinalAsset | null;
  hasFinalAssetRow: boolean;
  hasR2Object: boolean;
  expectedAssets: number;
  completedAssets: number;
  finalImageUrl?: string;
  inconsistent: boolean;
};

export async function resolveServableFinalAssets(
  order: DbOrder,
  packageType: PackageId = "single",
): Promise<ResolvedFinalAssets> {
  const plan = buildFinalGenerationPlan(order, packageType);
  const expectedAssetTypes = new Set(plan.map((item) => item.assetType));
  const allAssets = await getFinalAssets(order.id);
  const generatedAssets = allAssets.filter(
    (asset) =>
      expectedAssetTypes.has(asset.asset_type) &&
      (asset.generation_status || "generated") === "generated",
  );

  const servableAssets: FinalAsset[] = [];
  for (const asset of generatedAssets) {
    if (await imageExists(asset.r2_key)) {
      servableAssets.push(asset);
    }
  }

  if (servableAssets.length > 0) {
    const finalAssets = servableAssets.map(assetToResult);
    const primaryAsset = servableAssets[0] || null;

    return {
      assets: servableAssets,
      finalAssets,
      primaryAsset,
      hasFinalAssetRow: generatedAssets.length > 0,
      hasR2Object: true,
      expectedAssets: plan.length,
      completedAssets: servableAssets.length,
      finalImageUrl: finalAssets[0]?.imageUrl,
      inconsistent: generatedAssets.length > 0 && servableAssets.length === 0,
    };
  }

  if (packageType === "single" && order.final_r2_key) {
    const legacyExists = await imageExists(order.final_r2_key);
    if (legacyExists) {
      const legacyAsset: FinalAsset = {
        id: `legacy-${order.id}`,
        order_id: order.id,
        asset_type: "single",
        width: order.width,
        height: order.height,
        r2_key: order.final_r2_key,
        format: "png",
        created_at: order.final_generated_at || order.updated_at,
      };
      const finalAssets = [assetToResult(legacyAsset)];

      return {
        assets: [legacyAsset],
        finalAssets,
        primaryAsset: legacyAsset,
        hasFinalAssetRow: false,
        hasR2Object: true,
        expectedAssets: 1,
        completedAssets: 1,
        finalImageUrl: finalAssets[0].imageUrl,
        inconsistent: false,
      };
    }
  }

  return {
    assets: [],
    finalAssets: [],
    primaryAsset: null,
    hasFinalAssetRow: generatedAssets.length > 0,
    hasR2Object: false,
    expectedAssets: plan.length,
    completedAssets: 0,
    inconsistent:
      generatedAssets.length > 0 ||
      Boolean(order.final_r2_key) ||
      order.status === "final_generated",
  };
}

export function assetToResult(asset: FinalAsset): FinalAssetResult {
  return {
    id: asset.id,
    assetType: asset.asset_type,
    label: labelForAsset(asset.asset_type),
    imageUrl: `/api/final-asset?assetId=${encodeURIComponent(asset.id)}`,
    width: asset.width,
    height: asset.height,
    format: "PNG",
  };
}

export function labelForAsset(assetType: string) {
  if (assetType === "mobile") return "Mobile wallpaper";
  if (assetType === "tablet") return "Tablet wallpaper";
  if (assetType === "desktop") return "Desktop wallpaper";
  if (assetType === "custom") return "Custom size wallpaper";
  return "Wallpaper";
}
