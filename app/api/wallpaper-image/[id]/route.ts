import { getImageResponse } from "@/lib/storage";

type WallpaperImageRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(_request: Request, { params }: WallpaperImageRouteProps) {
  const { id } = await params;
  return getImageResponse(decodeURIComponent(id));
}
