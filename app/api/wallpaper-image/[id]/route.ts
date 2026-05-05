import { getStoredWallpaper } from "@/lib/storage";

type WallpaperImageRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: WallpaperImageRouteProps) {
  const { id } = await params;
  const stored = await getStoredWallpaper(id);

  if (!stored?.bytes || !stored.contentType) {
    return new Response("Image not found.", { status: 404 });
  }

  const bytes = new ArrayBuffer(stored.bytes.byteLength);
  new Uint8Array(bytes).set(stored.bytes);
  const body = new Blob([bytes], { type: stored.contentType });

  return new Response(body, {
    headers: {
      "Content-Type": stored.contentType,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
