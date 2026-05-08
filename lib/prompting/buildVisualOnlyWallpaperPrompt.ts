import { getRuntimeEnv } from "@/lib/env";
import type { WallpaperInput } from "@/lib/types";
import { getDreamProfileSections } from "@/lib/visualDreamProfile";
import { getWallpaperPresetForInput } from "@/lib/wallpaperPresets";

type PromptMode = "preview" | "final";

export function buildVisualOnlyWallpaperPrompt(input: {
  input: WallpaperInput;
  mode: PromptMode;
}) {
  const useShortPrompt = getRuntimeEnv().USE_SHORT_IMAGE_PROMPT === "true";
  return useShortPrompt
    ? buildShortVisualPrompt(input.input, input.mode)
    : buildMasterVisualPrompt(input.input, input.mode);
}

function buildMasterVisualPrompt(input: WallpaperInput, mode: PromptMode) {
  const sections = getDreamProfileSections(input.dreamProfile);
  const preset = getWallpaperPresetForInput(input);
  const previewLine =
    mode === "preview"
      ? "This is a low-resolution concept preview. Keep it visually clear, but simpler and lighter than the final file."
      : "This is the paid final wallpaper. Keep it polished, refined, and complete.";

  return `Create a high-resolution, premium personalized dream visualization wallpaper.

This is a visual-only wallpaper.

Important rule:
The image must contain absolutely no text. Do not include any words, letters, quotes, affirmations, typography, logos, brand names, signatures, watermarks, numbers, or readable symbols. The final wallpaper must be fully visual only.

Customer dream profile:
- Future life they are visualizing: ${sections.futureLife || "peace, abundance, and a beautiful future life"}
- Current goals: ${sections.currentGoals || "steady growth and meaningful progress"}
- Desired feelings: ${sections.desiredFeelings || "calm, motivated, and hopeful"}
- Dream scenes to include: ${sections.dreamScenes || "beautiful home, calm lifestyle, and future-success imagery"}
- Dream home or environment: ${sections.dreamEnvironment || "a peaceful, elegant environment"}
- Type of success they want: ${sections.successType || "stability, abundance, and personal success"}
- Preferred color mood: ${sections.colorMood || "soft, harmonious, elegant color"}
- Preferred visual style: ${sections.visualStyle || input.style}
- Preferred composition style: ${sections.compositionStyle || "clean and balanced"}
- Device type: ${sections.deviceType || input.device}
- Aspect ratio: ${preset.ratioLabel}
- Custom notes: ${sections.customNotes || "none"}

Purpose:
Create a personalized dream visualization board wallpaper that softly represents the customer's future life, goals, dreams, emotions, and lifestyle. The wallpaper should feel inspiring, elegant, calm, premium, eye-friendly, and beautiful enough to look at every day.

Image direction:
Create a soft, elegant, premium visualization wallpaper that feels like a beautiful future memory. Use symbolic, realistic, emotionally meaningful dream-life scenes based on the customer's answers.

The image should feel:
- calm
- polished
- balanced
- uplifting
- harmonious
- premium
- emotionally meaningful
- suitable for daily wallpaper use

The wallpaper must not feel:
- noisy
- cluttered
- overcrowded
- childish
- chaotic
- overly bright
- visually overwhelming
- like a cheap stock photo
- like a messy mood board

Visual content:
Use subtle, blended, realistic dream-life elements inspired by the customer's answers.

Possible elements may include:
- peaceful home
- beautiful nature
- family warmth
- romantic relationship energy
- health and wellness details
- travel hints
- business success
- creative success
- luxury details
- financial abundance symbols
- calm morning routine
- beautiful interiors
- peaceful outdoor views
- ocean, forest, mountains, garden, pool, terrace, or city view

Important:
The wallpaper should feel like a premium personalized vision board, not a messy collage. Blend scenes softly and beautifully so the final result feels intentional, clean, luxurious, peaceful, and complete without any text.

Composition:
Use the preferred composition style: ${sections.compositionStyle || "balanced and spacious"}.

Follow these composition rules:
- Use balanced spacing
- Use soft layering
- Blend scenes naturally
- Keep the image clean and harmonious
- Avoid too many objects
- Avoid harsh separation between scenes
- Avoid a crowded collage layout
- Keep the wallpaper suitable for phone or desktop use
- Make sure important elements are not cut off by device edges
- Use breathing room and soft negative space
- Make the image complete without needing a quote or text

Style:
Use the selected visual style: ${sections.visualStyle || input.style}.

The final result should feel:
- high-end
- realistic
- cinematic
- soft
- modern
- beautiful
- premium
- emotionally warm
- Pinterest-style but elevated

Color palette:
Use the selected color mood: ${sections.colorMood || "soft neutral luxury tones"}.

Keep the colors:
- soft
- balanced
- harmonious
- eye-friendly
- elegant
- not too saturated
- not too dark
- not too bright

Avoid:
- neon colors
- harsh contrast
- oversaturation
- messy colors
- heavy shadows
- visual overload

Strict negative instructions:
No text.
No quote.
No affirmation.
No letters.
No words.
No typography.
No logos.
No brand names.
No watermarks.
No signatures.
No readable symbols.
No distorted people.
No strange faces.
No extra fingers.
No messy collage.
No clutter.
No harsh neon colors.
No cheap stock-photo look.
No cartoon style unless customer specifically selected it.
No overly busy dream board.

${previewLine}

Final result:
A beautiful personalized dream visualization wallpaper that visually reminds the customer of the future life they are building, with absolutely no text, no quote, and no overlay.`;
}

function buildShortVisualPrompt(input: WallpaperInput, mode: PromptMode) {
  const sections = getDreamProfileSections(input.dreamProfile);
  const preset = getWallpaperPresetForInput(input);
  const previewLine =
    mode === "preview"
      ? "This is a low-resolution concept preview with the same visual direction as the final wallpaper."
      : "This is the paid final wallpaper. Make it polished and complete.";

  return `Create a high-resolution personalized dream visualization wallpaper with absolutely no text.

Customer profile:
Future life: ${sections.futureLife || "a beautiful, abundant future life"}
Current goals: ${sections.currentGoals || "growth and meaningful progress"}
Desired feelings: ${sections.desiredFeelings || "calm, hopeful, motivated"}
Dream scenes: ${sections.dreamScenes || "beautiful home, travel, wellness, and success imagery"}
Dream environment: ${sections.dreamEnvironment || "peaceful elegant environment"}
Success type: ${sections.successType || "abundance, stability, and confidence"}
Color mood: ${sections.colorMood || "soft harmonious luxury tones"}
Visual style: ${sections.visualStyle || input.style}
Composition style: ${sections.compositionStyle || "clean and balanced"}
Device type: ${sections.deviceType || input.device}
Aspect ratio: ${preset.ratioLabel}
Custom notes: ${sections.customNotes || "none"}

Create a premium, eye-friendly, calm, elegant wallpaper that softly represents the customer's dream life. Use realistic, blended dream-life imagery with soft lighting, harmonious color, clean composition, emotional warmth, and enough breathing room for daily wallpaper use.

The image must feel beautiful, inspiring, soft, balanced, and premium. It should look like a refined visual vision board, not a messy collage.

Strict rule:
No text, no quote, no affirmation, no letters, no words, no typography, no logos, no watermarks, no signatures, no readable symbols.

Avoid clutter, chaos, harsh colors, distorted people, strange faces, cheap stock-photo feeling, and overcrowded mood-board layout.

${previewLine}

Final aesthetic:
premium, soft, calm, elegant, inspiring, realistic, high-end Pinterest-style, wallpaper-suitable, fully visual only.`;
}
