import { getSiteUrl } from "@/lib/security";

type StoredWallpaper = {
  bytes?: Uint8Array;
  contentType?: string;
  imageUrl?: string;
  createdAt: number;
};

const devWallpaperStore = new Map<string, StoredWallpaper>();
const STORE_TTL_MS = 1000 * 60 * 60 * 6;

export async function saveImage(bytes: Uint8Array, contentType = "image/png") {
  const id = crypto.randomUUID();
  devWallpaperStore.set(id, { bytes, contentType, createdAt: Date.now() });

  // TODO: Replace with Cloudflare R2 put() using WALLPAPER_BUCKET.
  return {
    id,
    url: `/api/wallpaper-image/${id}`,
  };
}

export async function getImage(id: string) {
  return getStoredWallpaper(id);
}

export async function imageExists(id: string) {
  return Boolean(await getStoredWallpaper(id));
}

export async function getSignedDownloadUrl(id: string) {
  // TODO: Sign short-lived R2 download URLs once WALLPAPER_BUCKET is configured.
  return imageExists(id).then((exists) =>
    exists ? `${getSiteUrl()}/api/wallpaper-image/${id}` : null,
  );
}

export function saveGeneratedImageFromBase64(
  content: string,
  contentType = "image/png",
) {
  const id = crypto.randomUUID();
  const bytes = base64ToBytes(content);
  devWallpaperStore.set(id, { bytes, contentType, createdAt: Date.now() });

  return `/api/wallpaper-image/${id}`;
}

export function saveGeneratedImageFromDataUrl(dataUrl: string) {
  const match = dataUrl.match(/^data:(image\/(?:png|svg\+xml|jpeg));base64,(.+)$/);
  if (!match) {
    return null;
  }

  return saveGeneratedImageFromBase64(match[2], match[1]);
}

export async function saveWallpaperForDelivery(imageUrl: string) {
  const id = crypto.randomUUID();

  // TODO: Replace this with Cloudflare R2 for durable delivery.
  // Suggested binding: WALLPAPER_BUCKET
  // Preferred production flow: upload PNG to private R2 and email a signed URL,
  // or serve through a Worker route that verifies an expiring download token.
  devWallpaperStore.set(id, { imageUrl, createdAt: Date.now() });

  return {
    id,
    url: imageUrl.startsWith("data:")
      ? null
      : imageUrl.startsWith("/")
        ? `${getSiteUrl()}${imageUrl}`
        : imageUrl,
  };
}

export async function getStoredWallpaper(id: string) {
  const stored = devWallpaperStore.get(id);

  if (!stored) {
    return null;
  }

  if (Date.now() - stored.createdAt > STORE_TTL_MS) {
    devWallpaperStore.delete(id);
    return null;
  }

  return stored;
}

export function isTrustedGeneratedImage(value: string) {
  if (value.startsWith("data:image/png;base64,")) {
    return value.length <= 8_000_000;
  }

  if (value.startsWith("data:image/svg+xml;base64,")) {
    return value.length <= 2_000_000;
  }

  try {
    if (value.startsWith("/api/wallpaper-image/")) {
      return true;
    }

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

export function dataUrlToAttachment(value: string) {
  const match = value.match(/^data:(image\/(?:png|svg\+xml));base64,(.+)$/);
  if (!match) {
    return null;
  }

  return {
    contentType: match[1],
    content: match[2],
    filename:
      match[1] === "image/png"
        ? "dream-on-the-paper-wallpaper.png"
        : "dream-on-the-paper-wallpaper.svg",
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
