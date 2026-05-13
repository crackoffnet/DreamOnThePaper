import type { WallpaperInput } from "@/lib/types";
import { getDreamProfileSections } from "@/lib/visualDreamProfile";
import { getWallpaperPresetForInput } from "@/lib/wallpaperPresets";
import { applyStyleTheme } from "@/lib/prompting/applyStyleTheme";
import { buildCinematicScene } from "@/lib/prompting/buildCinematicScene";
import { buildDreamPriority } from "@/lib/prompting/buildDreamPriority";
import { cleanCustomAnswer } from "@/lib/prompting/cleanCustomAnswer";
import { mapProfileToVisualLanguage } from "@/lib/prompting/visualMappingEngine";

type PromptMode = "preview" | "final" | "regeneration";

export const cinematicQualityCheckPrompt = `Check the generated wallpaper for realism, wallpaper beauty, emotional immersion, clutter, AI artifacts, no visible faces, no text, no pixelation, and style consistency. Return PASS or FAIL. TODO: wire this into an automated image QA service when a Cloudflare-compatible implementation is available.`;

export const cinematicRegenerationPrompt = `Fix clutter, unrealistic composition, AI artifacts, excessive objects, visible faces, and any text-like marks. Improve realism, emotional immersion, cinematic atmosphere, breathing room, and premium editorial photography feel.`;

export function buildCinematicWallpaperPrompt({
  input,
  mode,
}: {
  input: WallpaperInput;
  mode: PromptMode;
}) {
  const sections = getDreamProfileSections(input.dreamProfile);
  const preset = getWallpaperPresetForInput(input);
  const mapping = mapProfileToVisualLanguage(input.dreamProfile);
  const priority = buildDreamPriority(input.dreamProfile, mapping);
  const styleTheme = applyStyleTheme(input.style, input.theme);
  const customAnswers = [
    cleanCustomAnswer("final custom detail", sections.finalCustomDetail, "accent"),
    cleanCustomAnswer("future life other", input.dreamProfile.futureLifeOther, "secondary"),
    cleanCustomAnswer(
      "future environment other",
      input.dreamProfile.futureEnvironmentOther,
      "secondary",
    ),
    cleanCustomAnswer("personal details other", input.dreamProfile.personalDetailsOther, "accent"),
  ].filter((answer) => answer.cleanGoal !== "personal calm future-life detail");
  const scene = buildCinematicScene({
    mapping,
    priority,
    styleTheme,
    customAnswers,
  });
  const modeLine =
    mode === "preview"
      ? "This is a low-resolution cinematic preview. It must show the visual direction, mood, and composition without adding any watermark or text."
      : mode === "regeneration"
        ? cinematicRegenerationPrompt
        : "This is the paid final wallpaper. Generate a clean high-resolution PNG/JPG quality image with polished realism.";

  return `Create a premium ultra-realistic cinematic wallpaper.

${modeLine}

USER PROFILE:
- Future life: ${sections.futureLife || "a calm abundant future life"}
- Current creation: ${sections.currentCreation || "meaningful progress"}
- Desired feelings: ${sections.desiredFeelings || "calm, focused, hopeful"}
- Dream-life scenes: ${sections.dreamScenes || "a beautiful future-life scene"}
- Future environment: ${sections.futureEnvironment || "a calm premium environment"}
- Personal details: ${sections.personalDetails || "subtle personal meaning"}
- Format: ${preset.label}, ${preset.ratioLabel}, wallpaper-first composition

CUSTOM DETAILS:
${customAnswers.length ? JSON.stringify(customAnswers, null, 2) : "none"}

PRIMARY GOALS:
${bulletList(priority.primaryGoals)}

SECONDARY GOALS:
${bulletList(priority.secondaryGoals)}

ACCENT DETAILS:
${bulletList(priority.accentDetails)}

STYLE:
${styleTheme.styleName} - ${styleTheme.mood}
${styleTheme.visualDirection}
Palette: ${styleTheme.palette}

THEME:
${input.theme}
${styleTheme.themeModifier}

SCENE PLAN:
- Dominant environment: ${scene.dominantEnvironment}
- Focal areas: ${scene.focalAreas.join(", ") || "one calm architectural focal area"}
- Subtle details: ${scene.subtleDetails.join(", ") || "3-5 restrained personal details"}
- Lighting: ${scene.lighting}
- Composition: ${scene.composition}
- Human presence: ${scene.humanPresence}

RULES:
- one dominant environment
- maximum two focal areas
- 3-5 subtle details only
- cinematic depth
- realistic textures
- breathing room
- emotional realism
- subtle storytelling
- wallpaper-first composition
- beautiful behind phone icons
- luxury editorial photography
- cinematic architecture photography
- wellness branding realism

NO:
- visible faces
- portrait framing
- close-up face shots
- text
- quotes
- letters
- numbers
- logos
- watermarks
- clutter
- collage blocks
- tiled moodboard layout
- fantasy art
- AI artifacts
- poster design
- template design
- object overload
- staged prop dump

IMAGE QUALITY:
Ultra high resolution.
Sharp but natural.
No pixelation.
No blur.

FINAL RESULT:
Beautiful calming premium wallpaper that feels emotionally personal and realistic.
It should feel like: This already feels like my future life.`;
}

function bulletList(values: string[]) {
  return values.length ? values.map((value) => `- ${value}`).join("\n") : "- calm believable future-life immersion";
}
