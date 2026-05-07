import { readImageDimensions } from "@/lib/imageDimensions";

type ImageTransformResult = {
  bytes: Uint8Array;
  contentType: string;
  width: number;
  height: number;
};

// Cloudflare Worker runtime cannot use native sharp.
// Exact post-processing resize is disabled in this deployment.
// Final delivered dimensions reflect the actual OpenAI output.
export function detectSourceImageSize(
  bytes: Uint8Array,
  fallback: { width: number; height: number },
  contentType = "image/png",
) {
  return readImageDimensions(bytes, contentType) || fallback;
}

export function preserveGeneratedImage(
  bytes: Uint8Array,
  contentType: string,
  fallback: { width: number; height: number },
): ImageTransformResult {
  const detected = detectSourceImageSize(bytes, fallback, contentType);
  return {
    bytes,
    contentType,
    width: detected.width,
    height: detected.height,
  };
}
