import { emailWallpaperSchema } from "@/lib/schemas";
import { assertSameOrigin, getClientIp, jsonError, safeLog } from "@/lib/security";
import {
  checkEmailIpRateLimit,
  checkEmailOrderRateLimit,
} from "@/lib/rateLimit";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { getOrder } from "@/lib/orders";
import { getRuntimeEnv } from "@/lib/env";
import { getImage } from "@/lib/storage";

const unavailableMessage =
  "Email delivery is not available yet. Please download your wallpaper.";
const maxAttachmentBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  try {
    if (!assertSameOrigin(request)) {
      return jsonError("Request origin is not allowed.", 403);
    }

    const ipLimit = await checkEmailIpRateLimit(getClientIp(request));
    if (!ipLimit.allowed) {
      return emailError("Too many email attempts. Please wait and try again.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = emailWallpaperSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      return emailError("Please enter a valid email address.");
    }

    const token = await verifyFinalGenerationToken(parsed.data.finalGenerationToken);
    const order = token ? await getOrder(token.orderId) : null;

    if (
      !token ||
      !order ||
      order.status !== "final_generated" ||
      !order.final_r2_key ||
      order.prompt_hash !== token.promptHash ||
      order.stripe_session_id !== token.sessionId
    ) {
      return emailError("Please confirm payment before emailing.", 402);
    }

    const env = getRuntimeEnv();
    if (!env.BREVO_API_KEY || !env.FROM_EMAIL || !env.FROM_NAME) {
      return emailError(unavailableMessage, 503);
    }

    const orderLimit = await checkEmailOrderRateLimit(order.id);
    if (!orderLimit.allowed) {
      return emailError("Too many email attempts. Please wait and try again.", 429);
    }

    const stored = await getImage(order.final_r2_key);
    if (!stored || stored.size > maxAttachmentBytes) {
      return emailError(
        "Email delivery is not available for this file size yet. Please download your wallpaper.",
        413,
      );
    }

    const bytes = new Uint8Array(await stored.arrayBuffer());
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": env.BREVO_API_KEY,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: env.FROM_NAME,
          email: env.FROM_EMAIL,
        },
        to: [{ email: parsed.data.email }],
        subject: "Your Dream On The Paper wallpaper is ready",
        htmlContent:
          "<p>Your personalized wallpaper is ready.</p><p>Download it from the attachment below.</p>",
        attachment: [
          {
            name: `dream-on-the-paper-wallpaper-${order.id.slice(0, 8)}.png`,
            content: bytesToBase64(bytes),
          },
        ],
      }),
    });

    if (!response.ok) {
      safeLog("Brevo email failed", response.status);
      return emailError("Unable to send the email right now.", 502);
    }

    return Response.json({ success: true, sent: true });
  } catch (error) {
    safeLog("Wallpaper email failed", error);
    return emailError("Unable to send the email right now.", 500);
  }
}

function emailError(message: string, status = 400) {
  return Response.json(
    {
      success: false,
      message,
      error: message,
    },
    { status },
  );
}

function bytesToBase64(bytes: Uint8Array) {
  let binary = "";
  const chunkSize = 0x8000;

  for (let index = 0; index < bytes.length; index += chunkSize) {
    const chunk = bytes.subarray(index, index + chunkSize);
    for (let chunkIndex = 0; chunkIndex < chunk.length; chunkIndex += 1) {
      binary += String.fromCharCode(chunk[chunkIndex]);
    }
  }

  return btoa(binary);
}
