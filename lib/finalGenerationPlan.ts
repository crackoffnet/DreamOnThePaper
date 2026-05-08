import type { DbOrder, FinalAssetType } from "@/lib/orders";
import type { PackageId } from "@/lib/packages";
import type { WallpaperInput } from "@/lib/types";
import { buildVisualOnlyWallpaperPrompt } from "@/lib/prompting/buildVisualOnlyWallpaperPrompt";
import {
  inputFromDbOrder,
} from "@/lib/orders";
import {
  labelForWallpaperType,
  wallpaperProductFromDevice,
} from "@/lib/wallpaperProducts";
import { getWallpaperPresetForInput } from "@/lib/wallpaperPresets";
import type { OpenAIImageSize } from "@/lib/openaiImageSize";

export type FinalGenerationPlanItem = {
  assetType: FinalAssetType;
  wallpaperType: FinalAssetType;
  label: string;
  presetId: string;
  ratioLabel: string;
  finalWidth: number;
  finalHeight: number;
  modelSize: OpenAIImageSize;
  input: WallpaperInput;
  variationPrompt: string;
};

export function buildFinalGenerationPlan(
  order: DbOrder,
  _packageType: PackageId,
): FinalGenerationPlanItem[] {
  const baseInput = inputFromDbOrder(order);
  const preset = getWallpaperPresetForInput(baseInput);
  const wallpaperType = wallpaperProductFromDevice(
    order.wallpaper_type || order.device,
  );

  return [
    {
      assetType: wallpaperType,
      wallpaperType,
      label: labelForWallpaperType(wallpaperType),
      presetId: preset.id,
      ratioLabel: preset.ratioLabel,
      finalWidth: preset.width,
      finalHeight: preset.height,
      modelSize: preset.modelSize,
      input: baseInput,
      variationPrompt:
        "Single final PNG wallpaper: polished, refined, premium, and fully visual-only.",
    },
  ];
}

export function buildFinalAssetPrompt(item: FinalGenerationPlanItem) {
  return buildVisualOnlyWallpaperPrompt({
    input: item.input,
    mode: "final",
  });
}
