import { getCloudflareContext } from "@opennextjs/cloudflare";

type DreamCloudflareEnv = CloudflareEnv & {
  DB?: D1Database;
  DREAM_RATE_LIMITS?: KVNamespace;
  WALLPAPER_BUCKET?: R2Bucket;
};

function getEnv() {
  return getCloudflareContext().env as DreamCloudflareEnv;
}

export function getDb() {
  const db = getEnv().DB;

  if (!db) {
    throw new Error("Cloudflare D1 binding DB is not configured.");
  }

  return db;
}

export function getRateLimitKv() {
  const kv = getEnv().DREAM_RATE_LIMITS;

  if (!kv) {
    throw new Error("Cloudflare KV binding DREAM_RATE_LIMITS is not configured.");
  }

  return kv;
}

export function getWallpaperBucket() {
  const bucket = getEnv().WALLPAPER_BUCKET;

  if (!bucket) {
    throw new Error("Cloudflare R2 binding WALLPAPER_BUCKET is not configured.");
  }

  return bucket;
}
