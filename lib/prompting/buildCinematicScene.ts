import type { DreamPriority } from "@/lib/prompting/buildDreamPriority";
import type { CleanedCustomAnswer } from "@/lib/prompting/cleanCustomAnswer";
import type { StyleThemePlan } from "@/lib/prompting/applyStyleTheme";
import type { VisualMapping } from "@/lib/prompting/visualMappingEngine";

export type CinematicScenePlan = {
  dominantEnvironment: string;
  focalAreas: string[];
  subtleDetails: string[];
  lighting: string;
  composition: string;
  humanPresence: string;
};

export function buildCinematicScene(input: {
  mapping: VisualMapping;
  priority: DreamPriority;
  styleTheme: StyleThemePlan;
  customAnswers: CleanedCustomAnswer[];
}): CinematicScenePlan {
  const primaryCustom = input.customAnswers.find((answer) => answer.importance === "primary");
  const environment =
    primaryCustom?.visualTranslation.environment ||
    input.mapping.architecture[0] ||
    "one calm premium future-life environment";
  const customDetails = input.customAnswers.flatMap(
    (answer) => answer.visualTranslation.subtleDetails,
  );

  return {
    dominantEnvironment: `${environment}, expressed as a believable luxury editorial photograph`,
    focalAreas: unique([
      input.mapping.architecture[0],
      input.mapping.architecture[1],
      input.priority.primaryGoals[0],
    ]).slice(0, 2),
    subtleDetails: unique([
      ...input.priority.accentDetails,
      ...customDetails,
      ...input.mapping.textures,
    ]).slice(0, 5),
    lighting:
      primaryCustom?.visualTranslation.lighting ||
      input.mapping.lighting[0] ||
      "soft cinematic natural light",
    composition:
      "one dominant environment, maximum two focal areas, generous negative space, cinematic depth, breathable wallpaper-first framing",
    humanPresence:
      "no visible faces; only silhouettes, backs, reflections, shadows, or implied lived-in presence if needed",
  };
}

function unique(values: Array<string | undefined>) {
  return Array.from(new Set(values.filter(Boolean) as string[]));
}
