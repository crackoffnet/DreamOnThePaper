import { wallpaperTypeFromDevice } from "@/lib/wallpaperProducts";
import type { WallpaperInput } from "@/lib/types";
import { sanitizeDreamProfile } from "@/lib/visualDreamProfile";
import { getWallpaperMeta } from "@/lib/wallpaper";

type PreviewHashOptions = {
  wallpaperType?: string | null;
  mood?: string | null;
  width?: number | null;
  height?: number | null;
  presetId?: string | null;
};

export function normalizePreviewInput(
  input: WallpaperInput,
  options: PreviewHashOptions = {},
) {
  const meta = getWallpaperMeta(input);

  return {
    visualSystemVersion: "cinematic-v1",
    wallpaperType: options.wallpaperType || wallpaperTypeFromDevice(input.device),
    presetId: options.presetId || meta.presetId,
    device: input.device,
    ratio: input.ratio,
    width: numberValue(options.width) ?? meta.finalWidth,
    height: numberValue(options.height) ?? meta.finalHeight,
    customWidth: numberValue(input.customWidth),
    customHeight: numberValue(input.customHeight),
    theme: input.theme,
    style: input.style,
    mood: stringValue(options.mood),
    dreamProfile: sanitizeDreamProfile(input.dreamProfile),
  };
}

export function createPreviewInputHash(
  input: WallpaperInput,
  options: PreviewHashOptions = {},
) {
  const normalized = JSON.stringify(normalizePreviewInput(input, options));
  let hash = 2166136261;

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return `preview_${(hash >>> 0).toString(16).padStart(8, "0")}`;
}

function stringValue(value: string | null | undefined) {
  return (value || "").trim();
}

function numberValue(value: number | null | undefined) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}
