import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import { z } from "zod";
import { getFinalAssets, getOrder } from "@/lib/orders";
import { verifyFinalGenerationToken } from "@/lib/payment";
import { assertSameOrigin } from "@/lib/security";
import { buildFinalGenerationPlan } from "@/lib/finalGenerationPlan";
import type { PackageId } from "@/lib/packages";

const startFinalSchema = z.object({
  finalGenerationToken: z.string().min(24).max(12000),
});

export async function POST(request: Request) {
  const requestId = crypto.randomUUID();
  const verifyStartedAt = Date.now();

  if (!assertSameOrigin(request)) {
    return startError("Request origin is not allowed.", 403);
  }

  const body = await request.json().catch(() => null);
  const parsed = startFinalSchema.safeParse(body);
  if (!parsed.success) {
    return startError("Please confirm payment before generating.", 402);
  }

  const token = await verifyFinalGenerationToken(parsed.data.finalGenerationToken);
  if (!token) {
    return startError("Please confirm payment before generating.", 402);
  }

  const order = await getOrder(token.orderId);
  if (
    !order ||
    order.prompt_hash !== token.promptHash ||
    order.stripe_session_id !== token.sessionId
  ) {
    return startError("Unable to verify this paid order.", 400);
  }

  const packageType: PackageId = "single";
  const expectedAssets = buildFinalGenerationPlan(order, packageType).length;
  const completedAssets = (await getFinalAssets(order.id)).length;

  console.info("[final-generation-timing]", {
    requestId,
    orderId: order.id,
    packageType,
    step: "payment_verification_complete",
    durationMs: Date.now() - verifyStartedAt,
  });

  if (order.status === "final_generated" && completedAssets >= expectedAssets) {
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
      finalGenerationToken: parsed.data.finalGenerationToken,
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

function startError(message: string, status: number) {
  return NextResponse.json(
    {
      success: false,
      message,
      error: message,
    },
    { status },
  );
}
