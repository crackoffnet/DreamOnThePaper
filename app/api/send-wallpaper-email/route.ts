import { emailWallpaperSchema } from "@/lib/schemas";
import { assertSameOrigin, getClientIp, jsonError, safeLog } from "@/lib/security";
import {
  checkEmailIpRateLimit,
  checkEmailOrderRateLimit,
} from "@/lib/rateLimit";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { getOrder } from "@/lib/orders";
import { getRuntimeEnv, isFromNameUsingFallback } from "@/lib/env";
import { getImage } from "@/lib/storage";

const unavailableMessage =
  "Email delivery is not available yet. Please download your wallpaper.";
const maxAttachmentBytes = 4 * 1024 * 1024;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  let orderId: string | undefined;

  try {
    if (!assertSameOrigin(request)) {
      logEmailFailure({ requestId, failureReason: "Origin not allowed" });
      return jsonError("Request origin is not allowed.", 403);
    }

    const ipLimit = await checkEmailIpRateLimit(getClientIp(request));
    if (!ipLimit.allowed) {
      logEmailFailure({ requestId, failureReason: "Email IP rate limit exceeded" });
      return emailError("Too many email attempts. Please wait and try again.", 429);
    }

    const body = await request.json().catch(() => null);
    const parsed = emailWallpaperSchema.safeParse(body);

    if (!parsed.success || parsed.data.website) {
      logEmailFailure({ requestId, failureReason: "Invalid email request body" });
      return emailError("Please enter a valid email address.");
    }

    const token = await verifyFinalGenerationToken(parsed.data.finalGenerationToken);
    const order = token ? await getOrder(token.orderId) : null;
    orderId = token?.orderId;

    if (
      !token ||
      !order ||
      order.status !== "final_generated" ||
      !order.final_r2_key ||
      order.prompt_hash !== token.promptHash ||
      order.stripe_session_id !== token.sessionId
    ) {
      logEmailFailure({
        requestId,
        orderId,
        failureReason: "Invalid final generation token or order state",
      });
      return emailError("Please confirm payment before emailing.", 402);
    }

    const env = getRuntimeEnv();
    const brevoApiKey = env.BREVO_API_KEY;
    const fromEmail = env.FROM_EMAIL;
    const fromName = env.FROM_NAME;
    const fromNameUsesFallback = isFromNameUsingFallback();
    const missingEmailEnv = getMissingEmailEnv(env);
    if (missingEmailEnv.length > 0) {
      logEmailFailure({
        requestId,
        orderId,
        failureReason: `Missing ${missingEmailEnv.join(", ")}`,
        envPresence: {
          hasBrevoApiKey: Boolean(env.BREVO_API_KEY),
          hasFromEmail: Boolean(env.FROM_EMAIL),
          hasFromName: Boolean(env.FROM_NAME),
        },
      });
      return emailError(unavailableMessage, 503);
    }

    if (fromNameUsesFallback) {
      console.warn("[brevo-email]", {
        requestId,
        warning: "FROM_NAME missing, using fallback",
      });
    }

    const orderLimit = await checkEmailOrderRateLimit(order.id);
    if (!orderLimit.allowed) {
      logEmailFailure({ requestId, orderId, failureReason: "Email order rate limit exceeded" });
      return emailError("Too many email attempts. Please wait and try again.", 429);
    }

    const stored = await getImage(order.final_r2_key);
    if (!stored || stored.size > maxAttachmentBytes) {
      logEmailFailure({
        requestId,
        orderId,
        failureReason: stored ? "Final image too large for email" : "Final R2 image missing",
        imageSize: stored?.size,
      });
      return emailError(
        "This wallpaper is too large to email. Please use the download button.",
        413,
      );
    }

    const bytes = new Uint8Array(await stored.arrayBuffer());
    const response = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: {
        accept: "application/json",
        "api-key": brevoApiKey!,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        sender: {
          name: fromName!,
          email: fromEmail!,
        },
        to: [{ email: parsed.data.email }],
        subject: "Your Dream On The Paper wallpaper is ready",
        htmlContent:
          "<p>Your personalized wallpaper is ready.</p><p>Your final wallpaper is attached to this email.</p><p>If the attachment is blocked by your email provider, return to your checkout success page and use the Download Wallpaper button.</p>",
        textContent:
          "Your personalized wallpaper is ready.\nYour final wallpaper is attached to this email.\nIf the attachment is blocked, return to your checkout success page and use Download Wallpaper.",
        attachment: [
          {
            name: `dream-on-the-paper-wallpaper-${order.id.slice(0, 8)}.png`,
            content: bytesToBase64(bytes),
          },
        ],
      }),
    });

    if (!response.ok) {
      const brevoError = await response.text().catch(() => "");
      console.error("[brevo-email]", {
        requestId,
        orderId,
        status: response.status,
        statusText: response.statusText,
        brevoError: brevoError.slice(0, 500),
      });
      return emailError("Email delivery failed. Please use Download Wallpaper.", 502);
    }

    console.info("[brevo-email]", {
      requestId,
      orderId,
      status: response.status,
      event: "email_sent",
    });
    return Response.json({ success: true, sent: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";
    console.error("[brevo-email]", {
      requestId,
      orderId,
      failureReason: "Unhandled email route error",
      message,
    });
    safeLog("Wallpaper email failed", message);
    return emailError("Unable to send the email right now.", 500);
  }
}

function getMissingEmailEnv(env: ReturnType<typeof getRuntimeEnv>) {
  return [
    ["BREVO_API_KEY", env.BREVO_API_KEY],
    ["FROM_EMAIL", env.FROM_EMAIL],
  ]
    .filter(([, value]) => !value)
    .map(([name]) => name);
}

function logEmailFailure(details: {
  requestId: string;
  orderId?: string;
  failureReason: string;
  imageSize?: number;
  envPresence?: {
    hasBrevoApiKey: boolean;
    hasFromEmail: boolean;
    hasFromName: boolean;
  };
}) {
  console.error("[brevo-email]", details);
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
