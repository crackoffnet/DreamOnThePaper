import { getRuntimeEnv } from "@/lib/env";

export type ImageQuality = "low" | "medium" | "high" | "auto";
export type ImageOutputFormat = "png" | "jpeg" | "webp";
export type GenerationPurpose = "preview" | "final";

export const IMAGE_GENERATION_CONFIG = {
  preview: {
    model:
      process.env.OPENAI_PREVIEW_IMAGE_MODEL ||
      "gpt-image-1-mini",
    quality: "low" as ImageQuality,
    outputFormat: "jpeg" as ImageOutputFormat,
    compression: 75,
  },
  final: {
    model: process.env.OPENAI_FINAL_IMAGE_MODEL || "gpt-image-1",
    quality: (process.env.OPENAI_FINAL_IMAGE_QUALITY || "medium") as ImageQuality,
    outputFormat: "png" as ImageOutputFormat,
  },
};

export function getImageGenerationConfig() {
  const env = getRuntimeEnv();

  return {
    preview: {
      ...IMAGE_GENERATION_CONFIG.preview,
      model:
        env.OPENAI_PREVIEW_IMAGE_MODEL ||
        IMAGE_GENERATION_CONFIG.preview.model,
    },
    final: {
      ...IMAGE_GENERATION_CONFIG.final,
      model:
        env.OPENAI_FINAL_IMAGE_MODEL ||
        IMAGE_GENERATION_CONFIG.final.model,
      quality: normalizeFinalQuality(
        env.OPENAI_FINAL_IMAGE_QUALITY ||
          IMAGE_GENERATION_CONFIG.final.quality,
      ),
    },
  };
}

export function normalizeGenerationSize(
  width: number,
  height: number,
  purpose: GenerationPurpose,
) {
  const ratio = width / height;
  const supported =
    purpose === "preview"
      ? ["1024x1024", "1024x1536", "1536x1024"]
      : ["1024x1024", "1024x1536", "1536x1024"];
  const apiSize = supported.reduce((best, size) => {
    const [candidateWidth, candidateHeight] = size.split("x").map(Number);
    const [bestWidth, bestHeight] = best.split("x").map(Number);
    const candidateDifference = Math.abs(candidateWidth / candidateHeight - ratio);
    const bestDifference = Math.abs(bestWidth / bestHeight - ratio);

    return candidateDifference < bestDifference ? size : best;
  }, supported[0]);
  const [actualWidth, actualHeight] = apiSize.split("x").map(Number);

  return {
    apiSize,
    width: actualWidth,
    height: actualHeight,
  };
}

export function normalizeFinalQuality(value: string): ImageQuality {
  if (value === "low" || value === "medium" || value === "high" || value === "auto") {
    return value;
  }

  return "medium";
}
