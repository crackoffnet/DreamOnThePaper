"use client";

const memoryImages = new Map<string, string>();

export type ImageApiPayload = {
  imageUrl?: string;
  imageBase64?: string;
  mimeType?: string;
};

export async function imageUrlFromPayload(payload: ImageApiPayload) {
  if (payload.imageUrl) {
    if (payload.imageUrl.startsWith("data:")) {
      return dataUrlToBlobUrl(payload.imageUrl);
    }

    return payload.imageUrl;
  }

  if (payload.imageBase64) {
    return base64ToBlobUrl(payload.imageBase64, payload.mimeType || "image/png");
  }

  return "";
}

export function setEphemeralImage(key: string, imageUrl: string) {
  revokeImage(key);
  memoryImages.set(key, imageUrl);

  if (isPersistableUrl(imageUrl)) {
    sessionStorage.setItem(key, imageUrl);
    return;
  }

  sessionStorage.removeItem(key);
}

export function getEphemeralImage(key: string) {
  return memoryImages.get(key) || sessionStorage.getItem(key) || "";
}

export function removeEphemeralImage(key: string) {
  revokeImage(key);
  memoryImages.delete(key);
  sessionStorage.removeItem(key);
}

function revokeImage(key: string) {
  const current = memoryImages.get(key);

  if (current?.startsWith("blob:")) {
    URL.revokeObjectURL(current);
  }
}

function isPersistableUrl(imageUrl: string) {
  return (
    imageUrl.startsWith("http://") ||
    imageUrl.startsWith("https://") ||
    imageUrl.startsWith("/")
  );
}

async function dataUrlToBlobUrl(dataUrl: string) {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return URL.createObjectURL(blob);
}

function base64ToBlobUrl(content: string, mimeType: string) {
  const binary = atob(content);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return URL.createObjectURL(new Blob([bytes], { type: mimeType }));
}
