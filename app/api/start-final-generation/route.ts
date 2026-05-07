import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getOrder } from "@/lib/orders";
import { assertSameOrigin } from "@/lib/security";
import { resolveServableFinalAssets } from "@/lib/finalAssetState";
import type { PackageId } from "@/lib/packages";
import {
  getBearerToken,
  verifyResultOrFinalAccessToken,
} from "@/lib/resultAccessToken";

const startFinalSchema = z.object({
  resultAccessToken: z.string().min(24).max(12000).optional(),
  finalGenerationToken: z.string().min(24).max(12000).optional(),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const verifyStartedAt = Date.now();

  if (!assertSameOrigin(request)) {
    return startError("Request origin is not allowed.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = startFinalSchema.safeParse(body);
  if (!parsed.success || (!parsed.data.resultAccessToken && !parsed.data.finalGenerationToken && !request.headers.get("authorization"))) {
    return startError("Please confirm payment before generating.", 402);
  }

  const tokenValue =
    parsed.data.resultAccessToken ||
    parsed.data.finalGenerationToken ||
    getBearerToken(request);
  const token = tokenValue ? await verifyResultOrFinalAccessToken(tokenValue) : null;
  if (!token) {
    return startError("This result link is no longer valid.", 403, "RESULT_ACCESS_DENIED");
  }

  const order = await getOrder(token.orderId);
  if (
    !order ||
    order.stripe_session_id !== token.sessionId
  ) {
    return startError("This result link is no longer valid.", 403, "RESULT_ACCESS_DENIED");
  }

  const packageType: PackageId = "single";
  const resolved = await resolveServableFinalAssets(order, packageType);
  const expectedAssets = resolved.expectedAssets;
  const completedAssets = resolved.completedAssets;

  console.info("[final-generation-timing]", {
    requestId,
    orderId: order.id,
    packageType,
    step: "payment_verification_complete",
    durationMs: Date.now() - verifyStartedAt,
  });

  if (order.status === "final_generated" && resolved.hasR2Object && completedAssets >= expectedAssets) {
    return NextResponse.json({
      success: true,
      status: "ready",
      orderId: order.id,
      expectedAssets,
      completedAssets,
      failedAssets: 0,
    });
  }

  const generationRequest = new Request(new URL("/api/generate-final", request.url), {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Origin: new URL(request.url).origin,
    },
    body: JSON.stringify({
      resultAccessToken: tokenValue,
    }),
  });
  const generationPromise = fetch(generationRequest)
    .then((response) => response.arrayBuffer())
    .then(() => undefined)
    .catch((error) => {
      console.error("[start-final-generation]", {
        requestId,
        orderId: order.id,
        failureReason: "Background final generation failed",
        errorMessage: error instanceof Error ? error.message : "Unknown background error",
      });
    });

  scheduleBackgroundGeneration(generationPromise);

  return NextResponse.json(
    {
      success: true,
      status: "generating",
      orderId: order.id,
      expectedAssets,
      completedAssets,
      failedAssets: 0,
    },
    { status: 202 },
  );
}

function scheduleBackgroundGeneration(promise: Promise<void>) {
  try {
    getCloudflareContext().ctx.waitUntil(promise);
  } catch {
    void promise;
  }
}

function startError(message: string, status: number, code?: string) {
  return NextResponse.json(
    {
      success: false,
      code,
      message,
      error: message,
    },
    { status },
  );
}
