import sharp from "sharp";
import { readImageDimensions } from "@/lib/imageDimensions";

type TransformResult = {
  bytes: Uint8Array;
  contentType: "image/png" | "image/jpeg";
  width: number;
  height: number;
};

export async function renderPreviewImage(
  sourceBytes: Uint8Array,
  target: { width: number; height: number },
): Promise<TransformResult> {
  const transformed = await sharp(sourceBytes)
    .rotate()
    .resize({
      width: target.width,
      height: target.height,
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .jpeg({
      quality: 72,
      mozjpeg: true,
    })
    .toBuffer();

  return {
    bytes: new Uint8Array(transformed),
    contentType: "image/jpeg",
    width: target.width,
    height: target.height,
  };
}

export async function renderFinalWallpaper(
  sourceBytes: Uint8Array,
  target: { width: number; height: number },
): Promise<TransformResult> {
  const transformed = await sharp(sourceBytes)
    .rotate()
    .resize({
      width: target.width,
      height: target.height,
      fit: "cover",
      position: sharp.strategy.attention,
    })
    .png({
      compressionLevel: 9,
      adaptiveFiltering: true,
      effort: 8,
    })
    .toBuffer();

  return {
    bytes: new Uint8Array(transformed),
    contentType: "image/png",
    width: target.width,
    height: target.height,
  };
}

export function detectSourceImageSize(
  bytes: Uint8Array,
  fallback: { width: number; height: number },
  contentType = "image/png",
) {
  return readImageDimensions(bytes, contentType) || fallback;
}
