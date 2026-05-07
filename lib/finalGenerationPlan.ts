import type { DbOrder, FinalAssetType } from "@/lib/orders";
import type { PackageId } from "@/lib/packages";
import type { WallpaperInput } from "@/lib/types";
import {
  labelForWallpaperType,
  wallpaperProductFromDevice,
} from "@/lib/wallpaperProducts";
import { inputFromDbOrder } from "@/lib/orders";
import { getAspectRatioLabel, getResolutionLabel, labels } from "@/lib/wallpaper";
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
        "Single final PNG wallpaper: polished, refined, and optimized for the selected device or custom size.",
    },
  ];
}

export function buildFinalAssetPrompt(item: FinalGenerationPlanItem) {
  const input = item.input;
  const quoteInstruction =
    input.quoteTone === "none"
      ? "Do not include any quote or readable text."
      : `Add one short centered readable quote if it fits the composition. Quote tone: ${labels.quoteTones[input.quoteTone]}. Typography must be elegant, readable, and not too small.`;

  return `Create a premium, elegant, minimal vision board wallpaper.
Asset: ${item.label}
Selected size: ${item.ratioLabel}
Final delivery size: ${item.finalWidth} x ${item.finalHeight} px
Device: ${labels.devices[input.device]}
Aspect ratio: ${getAspectRatioLabel(input)}
Resolution target: ${getResolutionLabel(input)}
Style: ${labels.styles[input.style]}
Theme: ${labels.themes[input.theme]}, warm neutral tones, cream, beige, muted gold, and refined contrast.
Composition: clean, spacious, not cluttered, wallpaper-friendly, with negative space for app icons and desktop folders where appropriate.
Variation direction: ${item.variationPrompt}
Represent the user's dreams visually with subtle symbols of success, calm wealth, personal growth, health, home, family, travel, business, or nature as appropriate.
Goals: ${input.goals || "clear personal growth and forward momentum"}.
Life being built: ${input.lifestyle || "a refined, intentional everyday life"}.
Career, business, or financial goal: ${input.career || "steady progress and grounded abundance"}.
Personal life: ${input.personalLife || "love, belonging, and meaningful connection"}.
Health, body, or energy: ${input.health || "vitality, rest, strength, and calm energy"}.
Place, home, or travel dream: ${input.place || "a serene beautiful home and inspiring places"}.
Feeling words: ${input.feelingWords || "clear, soft, focused, abundant"}.
Daily reminder: ${input.reminder || "move toward the life you are becoming"}.
${quoteInstruction}
High-end editorial quality, refined composition, no noise, no chaos, no distortion.
No logos. No copyrighted characters. No distorted faces. No tiny unreadable text.`;
}
