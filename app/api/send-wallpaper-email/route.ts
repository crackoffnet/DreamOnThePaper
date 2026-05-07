import { emailWallpaperSchema } from "@/lib/schemas";
import { assertSameOrigin, getClientIp, jsonError, safeLog } from "@/lib/security";
import {
  checkEmailIpRateLimit,
  checkEmailOrderRateLimit,
} from "@/lib/rateLimit";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { getFinalAssets, getOrder } from "@/lib/orders";
import { getRuntimeEnv, isFromNameUsingFallback } from "@/lib/env";
import { getImage } from "@/lib/storage";
import { wallpaperProductFromDevice } from "@/lib/wallpaperProducts";
import { getRequestMetadata } from "@/lib/requestMetadata";
import {
  createEmailEvent,
  patchOrderTracking,
  trackOrderEvent,
} from "@/lib/orderEvents";

const unavailableMessage =
  "Email delivery is temporarily unavailable. Please use Download Wallpaper.";
const maxTotalAttachmentBytes = 8 * 1024 * 1024;

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const requestMetadata = await getRequestMetadata(request);
  let orderId: string | undefined;

  try {
    if (!assertSameOrigin(request)) {
      logEmailFailure({ requestId, failureReason: "Origin not allowed" });
      return jsonError("Request origin is not allowed.", 403);
    }

    const ipLimit = await checkEmailIpRateLimit(getClientIp(request));
    if (!ipLimit.allowed) {
      logEmailFailure({ requestId, failureReason: "Email IP rate limit exceeded" });
      void trackOrderEvent({
        eventType: "email_rate_limited",
        requestMetadata,
        metadata: { requestId, reason: "ip_limit" },
      });
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
      order.prompt_hash !== token.promptHash ||
      order.stripe_session_id !== token.sessionId
    ) {
      logEmailFailure({
        requestId,
        orderId,
        failureReason: "Invalid final generation token or order state",
      });
      return emailError("Email delivery is only available after your wallpaper is ready.", 409);
    }
    void trackOrderEvent({
      orderId: order.id,
      customerId: order.customer_id || null,
      eventType: "email_requested",
      statusAfter: order.status,
      packageType: order.package_type || undefined,
      requestMetadata,
      metadata: { requestId },
    });

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
      void createEmailEvent({
        orderId: order.id,
        customerId: order.customer_id || null,
        recipientEmail: parsed.data.email,
        status: "rate_limited",
        failureReason: "order_limit",
      });
      void trackOrderEvent({
        orderId: order.id,
        customerId: order.customer_id || null,
        eventType: "email_rate_limited",
        packageType: order.package_type || undefined,
        requestMetadata,
        metadata: { requestId, reason: "order_limit" },
      });
      return emailError("Too many email attempts. Please wait and try again.", 429);
    }

    const assets = await getFinalAssets(order.id);
    const preferredAssetType = wallpaperProductFromDevice(
      order.wallpaper_type || order.device,
    );
    const selectedAsset =
      assets.find((asset) => asset.asset_type === preferredAssetType) ||
      assets.find((asset) => asset.asset_type === "single") ||
      assets[0];
    const assetInputs = selectedAsset
      ? [
          {
            assetType: selectedAsset.asset_type,
            r2Key: selectedAsset.r2_key,
            filename: filenameForAsset(preferredAssetType, order.id.slice(0, 8)),
          },
        ]
      : order.final_r2_key
        ? [
            {
              assetType: preferredAssetType,
              r2Key: order.final_r2_key,
              filename: filenameForAsset(preferredAssetType, order.id.slice(0, 8)),
            },
          ]
        : [];

    if (assetInputs.length === 0) {
      logEmailFailure({
        requestId,
        orderId,
        failureReason: "Final assets missing",
      });
      return emailError("Email delivery failed. Please use Download Wallpaper.", 404);
    }

    const storedAssets = await Promise.all(
      assetInputs.map(async (asset) => ({
        ...asset,
        object: await getImage(asset.r2Key),
      })),
    );
    const missingAsset = storedAssets.find((asset) => !asset.object);
    const totalSize = storedAssets.reduce(
      (sum, asset) => sum + (asset.object?.size || 0),
      0,
    );

    if (missingAsset) {
      logEmailFailure({
        requestId,
        orderId,
        failureReason: "Final R2 image missing",
      });
      return emailError("Email delivery failed. Please use Download Wallpaper.", 404);
    }

    if (totalSize > maxTotalAttachmentBytes) {
      logEmailFailure({
        requestId,
        orderId,
        failureReason: "Final images too large for email",
        imageSize: totalSize,
      });
      void createEmailEvent({
        orderId: order.id,
        customerId: order.customer_id || null,
        recipientEmail: parsed.data.email,
        status: "skipped_too_large",
        failureReason: "attachments_too_large",
        attachmentCount: assetInputs.length,
        totalAttachmentBytes: totalSize,
      });
      void trackOrderEvent({
        orderId: order.id,
        customerId: order.customer_id || null,
        eventType: "email_skipped_too_large",
        packageType: order.package_type || undefined,
        requestMetadata,
        metadata: { requestId, totalSize, attachmentCount: assetInputs.length },
      });
      return emailError(
        "These files are too large to email. Please use the download buttons.",
        413,
      );
    }

    const attachments = await Promise.all(
      storedAssets.map(async (asset) => ({
        name: asset.filename,
        content: bytesToBase64(new Uint8Array(await asset.object!.arrayBuffer())),
      })),
    );
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
          "<p>Your personalized wallpaper is ready.</p><p>Your final PNG wallpaper is attached.</p><p>If your email provider blocks the attachment, return to your checkout success page and use Download Wallpaper.</p>",
        textContent:
          "Your personalized wallpaper is ready.\nYour final PNG wallpaper is attached.\nIf your email provider blocks the attachment, return to your checkout success page and use Download Wallpaper.",
        attachment: attachments,
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
      void createEmailEvent({
        orderId: order.id,
        customerId: order.customer_id || null,
        recipientEmail: parsed.data.email,
        status: "failed",
        failureReason: `Brevo ${response.status}`,
        attachmentCount: attachments.length,
        totalAttachmentBytes: totalSize,
      });
      void trackOrderEvent({
        orderId: order.id,
        customerId: order.customer_id || null,
        eventType: "email_failed",
        packageType: order.package_type || undefined,
        requestMetadata,
        metadata: { requestId, providerStatus: response.status },
      });
      return emailError("Email delivery failed. Please use Download Wallpaper.", 502);
    }
    const brevoPayload = (await response.json().catch(() => null)) as
      | { messageId?: string }
      | null;

    console.info("[brevo-email]", {
      requestId,
      orderId,
      status: response.status,
      event: "email_sent",
    });
    void createEmailEvent({
      orderId: order.id,
      customerId: order.customer_id || null,
      recipientEmail: parsed.data.email,
      providerMessageId: brevoPayload?.messageId || null,
      status: "sent",
      attachmentCount: attachments.length,
      totalAttachmentBytes: totalSize,
    });
    void patchOrderTracking(order.id, {
      email_send_count: (order.email_send_count || 0) + 1,
      last_email_sent_at: new Date().toISOString(),
    });
    void trackOrderEvent({
      orderId: order.id,
      customerId: order.customer_id || null,
      eventType: "email_sent",
      packageType: order.package_type || undefined,
      requestMetadata,
      metadata: {
        requestId,
        attachmentCount: attachments.length,
        totalAttachmentBytes: totalSize,
      },
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

function filenameForAsset(assetType: string, orderIdShort: string) {
  if (assetType === "mobile") {
    return `dream-on-the-paper-mobile-${orderIdShort}.png`;
  }
  if (assetType === "tablet") {
    return `dream-on-the-paper-tablet-${orderIdShort}.png`;
  }
  if (assetType === "desktop") {
    return `dream-on-the-paper-desktop-${orderIdShort}.png`;
  }
  if (assetType === "custom") {
    return `dream-on-the-paper-custom-${orderIdShort}.png`;
  }
  return `dream-on-the-paper-wallpaper-${orderIdShort}.png`;
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
