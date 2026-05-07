export type OpenAIImageSize =
  | "1024x1024"
  | "1024x1536"
  | "1536x1024"
  | "auto";

const OPENAI_IMAGE_DIMENSIONS: Record<
  Exclude<OpenAIImageSize, "auto">,
  { width: number; height: number }
> = {
  "1024x1024": { width: 1024, height: 1024 },
  "1024x1536": { width: 1024, height: 1536 },
  "1536x1024": { width: 1536, height: 1024 },
};

const SQUARE_MIN_RATIO = 0.9;
const SQUARE_MAX_RATIO = 1.1;
const EXTREME_RATIO_LIMIT = 2.1;

export function getOpenAIImageSize(
  width: number,
  height: number,
): OpenAIImageSize {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return "auto";
  }

  const ratio = width / height;

  if (!Number.isFinite(ratio) || ratio <= 0) {
    return "auto";
  }

  if (ratio >= SQUARE_MIN_RATIO && ratio <= SQUARE_MAX_RATIO) {
    return "1024x1024";
  }

  if (ratio > EXTREME_RATIO_LIMIT || ratio < 1 / EXTREME_RATIO_LIMIT) {
    return "auto";
  }

  return ratio < 1 ? "1024x1536" : "1536x1024";
}

export function getOpenAIImageDimensions(size: OpenAIImageSize) {
  if (size === "auto") {
    return null;
  }

  return OPENAI_IMAGE_DIMENSIONS[size];
}
