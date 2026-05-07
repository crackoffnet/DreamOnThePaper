import { getRuntimeEnv } from "@/lib/env";
import {
  getOpenAIImageDimensions,
  getOpenAIImageSize,
} from "@/lib/openaiImageSize";

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
  const apiSize = getOpenAIImageSize(width, height);
  const actualDimensions = getOpenAIImageDimensions(apiSize) ?? {
    width: 1024,
    height: 1024,
  };

  return {
    apiSize,
    width: actualDimensions.width,
    height: actualDimensions.height,
    purpose,
  };
}

export function normalizeFinalQuality(value: string): ImageQuality {
  if (value === "low" || value === "medium" || value === "high" || value === "auto") {
    return value;
  }

  return "medium";
}
