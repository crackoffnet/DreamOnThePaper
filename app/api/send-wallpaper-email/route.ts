import { emailWallpaperSchema } from "@/lib/schemas";
import {
  assertSameOrigin,
  getSiteUrl,
  jsonError,
  safeLog,
} from "@/lib/security";
import { checkIpRateLimit } from "@/lib/rateLimit";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { getOrder } from "@/lib/orders";
import {
  dataUrlToAttachment,
  isTrustedGeneratedImage,
  saveWallpaperForDelivery,
} from "@/lib/storage";

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return jsonError("Request origin is not allowed.", 403);
    }

    if (!(await checkIpRateLimit(request, "email-wallpaper", 3, 60 * 60 * 1000))) {
      return jsonError("Too many email attempts. Please wait a moment.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = emailWallpaperSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      return jsonError("Please enter a valid email address.");
    }

    if (!isTrustedGeneratedImage(parsed.data.imageUrl)) {
      return jsonError("This wallpaper source cannot be emailed.");
    }

    const orderToken = parsed.data.orderToken
      ? await verifyFinalGenerationToken(parsed.data.orderToken)
      : null;
    const order = orderToken ? await getOrder(orderToken.orderId) : null;
    const expectedFinalUrl = order?.final_r2_key
      ? `/api/wallpaper-image/${encodeURIComponent(order.final_r2_key)}`
      : "";

    if (
      !orderToken ||
      !order ||
      order.status !== "final_generated" ||
      expectedFinalUrl !== parsed.data.imageUrl
    ) {
      return jsonError("Please confirm payment before emailing.", 402);
    }

    const stored = await saveWallpaperForDelivery(parsed.data.imageUrl);
    const downloadUrl = stored.url || getSiteUrl();

    if (!process.env.RESEND_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return jsonError(
          "Email delivery is temporarily unavailable. Please download your wallpaper.",
          503,
        );
      }

      return Response.json({ sent: true, mock: true });
    }

    const attachment = dataUrlToAttachment(parsed.data.imageUrl);
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: process.env.FROM_EMAIL || "hello@dreamonthepaper.com",
        to: parsed.data.email,
        subject: "Your wallpaper is ready",
        text: `Your personalized wallpaper is ready. Download it here: ${downloadUrl}`,
        html: `<p>Your personalized wallpaper is ready.</p><p><a href="${downloadUrl}">Download it here</a>.</p>`,
        attachments: attachment
          ? [
              {
                filename: attachment.filename,
                content: attachment.content,
                content_type: attachment.contentType,
              },
            ]
          : undefined,
      }),
    });

    if (!response.ok) {
      safeLog("Resend email failed", response.status);
      return jsonError("Unable to send the email right now.", 502);
    }

    return Response.json({ sent: true, mock: false });
  } catch (error) {
    safeLog("Wallpaper email failed", error);
    return jsonError("Unable to send the email right now.", 500);
  }
}
