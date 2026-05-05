type StoredWallpaper = {
  imageUrl: string;
  createdAt: number;
};

const devWallpaperStore = new Map<string, StoredWallpaper>();

export async function saveWallpaperForDelivery(imageUrl: string) {
  const id = crypto.randomUUID();

  // TODO: Replace this with Cloudflare R2 for durable delivery.
  // Suggested binding: WALLPAPER_BUCKET
  // Preferred production flow: upload PNG to private R2 and email a signed URL,
  // or serve through a Worker route that verifies an expiring download token.
  devWallpaperStore.set(id, { imageUrl, createdAt: Date.now() });

  return {
    id,
    url: imageUrl.startsWith("data:") ? null : imageUrl,
  };
}

export async function getStoredWallpaper(id: string) {
  return devWallpaperStore.get(id) || null;
}

export function isTrustedGeneratedImage(value: string) {
  if (value.startsWith("data:image/png;base64,")) {
    return value.length <= 8_000_000;
  }

  if (value.startsWith("data:image/svg+xml;base64,")) {
    return value.length <= 2_000_000;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" && url.hostname.endsWith("openai.com");
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
