import type { WallpaperInput } from "@/lib/types";
import { buildCinematicWallpaperPrompt } from "@/lib/prompting/buildCinematicWallpaperPrompt";

type PromptMode = "preview" | "final";

export function buildVisualOnlyWallpaperPrompt(input: {
  input: WallpaperInput;
  mode: PromptMode;
}) {
  return buildCinematicWallpaperPrompt(input);
}
