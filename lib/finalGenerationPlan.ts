import type { DbOrder, FinalAssetType } from "@/lib/orders";
import type { PackageId } from "@/lib/packages";
import type { WallpaperInput } from "@/lib/types";
import { inputFromDbOrder } from "@/lib/orders";
import { getAspectRatioLabel, getResolutionLabel, labels } from "@/lib/wallpaper";

export type FinalGenerationPlanItem = {
  assetType: FinalAssetType;
  label: string;
  width: number;
  height: number;
  input: WallpaperInput;
  variationPrompt: string;
};

export function buildFinalGenerationPlan(
  order: DbOrder,
  packageType: PackageId,
): FinalGenerationPlanItem[] {
  const baseInput = inputFromDbOrder(order);

  if (packageType === "bundle") {
    return [
      {
        assetType: "mobile",
        label: "Mobile wallpaper",
        width: 1290,
        height: 2796,
        input: {
          ...baseInput,
          device: "mobile",
          ratio: "iphone-17-pro-max",
          customWidth: undefined,
          customHeight: undefined,
        },
        variationPrompt:
          "Mobile wallpaper composition, vertical, generous negative space for app icons, adapted from the same concept and quote.",
      },
      {
        assetType: "desktop",
        label: "Desktop wallpaper",
        width: 2560,
        height: 1440,
        input: {
          ...baseInput,
          device: "desktop",
          ratio: "desktop-16-9",
          customWidth: undefined,
          customHeight: undefined,
        },
        variationPrompt:
          "Desktop wallpaper composition, horizontal widescreen, spacious layout for desktop folders, matching the same concept and quote.",
      },
    ];
  }

  if (packageType === "premium") {
    return [
      {
        assetType: "version_1",
        label: "Version 1",
        width: order.width,
        height: order.height,
        input: baseInput,
        variationPrompt:
          "Version 1: closest to the selected style, balanced, polished, and faithful to the preview concept.",
      },
      {
        assetType: "version_2",
        label: "Version 2",
        width: order.width,
        height: order.height,
        input: baseInput,
        variationPrompt:
          "Version 2: softer and more minimal interpretation with extra negative space, quieter palette, and refined restraint.",
      },
      {
        assetType: "version_3",
        label: "Version 3",
        width: order.width,
        height: order.height,
        input: baseInput,
        variationPrompt:
          "Version 3: more cinematic and editorial interpretation with premium depth, richer light, and a distinct visual direction.",
      },
    ];
  }

  return [
    {
      assetType: "single",
      label: "Wallpaper",
      width: order.width,
      height: order.height,
      input: baseInput,
      variationPrompt:
        "Single final wallpaper: polished, refined, and optimized for the selected device or custom size.",
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
Target dimensions: ${item.width} x ${item.height} px
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
