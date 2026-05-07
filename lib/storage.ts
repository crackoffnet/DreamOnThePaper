import { getWallpaperBucket } from "@/lib/cloudflare";
import { getSiteUrl } from "@/lib/security";

type StoredWallpaper = {
  bytes?: Uint8Array;
  contentType?: string;
  imageUrl?: string;
  createdAt: number;
};

const CACHE_CONTROL = "private, no-store";

export async function savePreviewImage(
  orderId: string,
  bytes: Uint8Array,
  contentType: string,
) {
  return saveImageAtKey(`previews/${orderId}.webp`, bytes, contentType);
}

export async function savePreviewImageFromBase64(
  orderId: string,
  content: string,
  contentType = "image/png",
) {
  return savePreviewImage(orderId, base64ToBytes(content), contentType);
}

export async function savePreviewImageFromDataUrl(orderId: string, dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|svg\+xml|jpeg|webp));base64,(.+)$/);
  if (!match) {
    return null;
  }

  return savePreviewImageFromBase64(orderId, match[2], match[1]);
}

export async function saveFinalImage(
  orderId: string,
  bytes: Uint8Array,
  contentType: string,
) {
  return saveImageAtKey(`finals/${orderId}.png`, bytes, contentType);
}

export async function saveFinalAssetImage(
  orderId: string,
  assetType: string,
  bytes: Uint8Array,
  contentType: string,
) {
  return saveImageAtKey(`finals/${orderId}/${assetType}.png`, bytes, contentType);
}

export async function saveFinalAssetImageFromBase64(
  orderId: string,
  assetType: string,
  content: string,
  contentType = "image/png",
) {
  return saveFinalAssetImage(orderId, assetType, base64ToBytes(content), contentType);
}

export async function saveFinalImageFromBase64(
  orderId: string,
  content: string,
  contentType = "image/png",
) {
  return saveFinalImage(orderId, base64ToBytes(content), contentType);
}

export async function saveImage(bytes: Uint8Array, contentType = "image/png") {
  const id = crypto.randomUUID();
  const key = `generated/${id}.${extensionForContentType(contentType)}`;
  const saved = await saveImageAtKey(key, bytes, contentType);

  return {
    id: saved.key,
    url: saved.url,
  };
}

export async function getImage(r2Key: string) {
  return getWallpaperBucket().get(r2Key);
}

export async function getImageResponse(r2Key: string) {
  const object = await getImage(r2Key);

  if (!object) {
    return new Response("Image not found.", { status: 404 });
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("Cache-Control", CACHE_CONTROL);
  headers.set("X-Content-Type-Options", "nosniff");

  if (!headers.has("Content-Type")) {
    headers.set("Content-Type", "application/octet-stream");
  }

  return new Response(object.body, { headers });
}

export async function imageExists(r2Key: string) {
  return Boolean(await getImage(r2Key));
}

export async function getSignedDownloadUrl(r2Key: string) {
  // TODO: Replace this app-routed URL with signed R2 URLs if public delivery is
  // moved outside the Worker. Keep downloads private until the route verifies
  // an order token.
  return (await imageExists(r2Key))
    ? `${getSiteUrl()}/api/wallpaper-image/${encodeURIComponent(r2Key)}`
    : null;
}

export async function saveGeneratedImageFromBase64(
  content: string,
  contentType = "image/png",
) {
  const saved = await saveImage(base64ToBytes(content), contentType);
  return saved.url;
}

export async function saveGeneratedImageFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|svg\+xml|jpeg|webp));base64,(.+)$/);
  if (!match) {
    return null;
  }

  return saveGeneratedImageFromBase64(match[2], match[1]);
}

export async function saveWallpaperForDelivery(imageUrl: string) {
  if (imageUrl.startsWith("/api/wallpaper-image/")) {
    return {
      id: decodeURIComponent(imageUrl.replace("/api/wallpaper-image/", "")),
      url: `${getSiteUrl()}${imageUrl}`,
    };
  }

  return {
    id: crypto.randomUUID(),
    url: imageUrl.startsWith("/")
      ? `${getSiteUrl()}${imageUrl}`
      : imageUrl,
  };
}

export async function getStoredWallpaper(r2Key: string): Promise<StoredWallpaper | null> {
  const object = await getImage(r2Key);

  if (!object) {
    return null;
  }

  const bytes = new Uint8Array(await object.arrayBuffer());
  return {
    bytes,
    contentType:
      object.httpMetadata?.contentType ||
      object.customMetadata?.contentType ||
      "application/octet-stream",
    createdAt: Date.parse(object.uploaded.toISOString()),
  };
}

export function isTrustedGeneratedImage(value: string) {
  if (value.startsWith("/api/wallpaper-image/")) {
    return true;
  }

  try {
    const url = new URL(value);
    const siteUrl = new URL(getSiteUrl());
    const isOwnTemporaryImage =
      url.origin === siteUrl.origin && url.pathname.startsWith("/api/wallpaper-image/");

    return (
      isOwnTemporaryImage ||
      (url.protocol === "https:" && url.hostname.endsWith("openai.com"))
    );
  } catch {
    return false;
  }
}

type EmailAttachment = {
  contentType: string;
  content: string;
  filename: string;
};

export function dataUrlToAttachment(_value: string): EmailAttachment | null {
  // R2-backed images should be delivered as trusted URLs. Attachments from
  // arbitrary browser-provided data URLs are intentionally disabled.
  return null;
}

async function saveImageAtKey(
  key: string,
  bytes: Uint8Array,
  contentType: string,
) {
  await getWallpaperBucket().put(key, bytes, {
    httpMetadata: {
      contentType,
      cacheControl: CACHE_CONTROL,
    },
    customMetadata: {
      contentType,
    },
  });

  return {
    key,
    url: `/api/wallpaper-image/${encodeURIComponent(key)}`,
    size: bytes.byteLength,
  };
}

function base64ToBytes(content: string) {
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
}

function extensionForContentType(contentType: string) {
  if (contentType === "image/webp") {
    return "webp";
  }

  if (contentType === "image/svg+xml") {
    return "svg";
  }

  if (contentType === "image/jpeg") {
    return "jpg";
  }

  return "png";
}
