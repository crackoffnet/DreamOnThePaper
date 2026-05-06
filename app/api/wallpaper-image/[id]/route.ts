import { getOrder } from "@/lib/orders";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { getImageResponse } from "@/lib/storage";

type WallpaperImageRouteProps = {
  params: Promise<{ id: string }>;
};

export async function GET(request: Request, { params }: WallpaperImageRouteProps) {
  const { id } = await params;
  const r2Key = decodeURIComponent(id);

  if (!r2Key.startsWith("finals/")) {
    return getImageResponse(r2Key);
  }

  const tokenValue = new URL(request.url).searchParams.get("token") || "";
  if (!tokenValue) {
    return new Response("Download token is required.", {
      status: 401,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const token = await verifyFinalGenerationToken(tokenValue);
  if (!token) {
    return new Response("This download link has expired.", {
      status: 410,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  const order = await getOrder(token.orderId);
  if (
    !order ||
    order.status !== "final_generated" ||
    order.final_r2_key !== r2Key ||
    order.prompt_hash !== token.promptHash
  ) {
    return new Response("Wallpaper not found.", {
      status: 404,
      headers: { "Cache-Control": "private, no-store" },
    });
  }

  return getImageResponse(r2Key);
}
