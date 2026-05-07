import { NextResponse } from "next/server";
import { assertSameOrigin } from "@/lib/security";
import {
  appendBrowserCookie,
  resolveBrowserIdentity,
} from "@/lib/browserIdentity";
import { getPreviewAvailability } from "@/lib/previewEntitlements";

export async function GET(request: Request) {
  const requestId = crypto.randomUUID();

  try {
    if (!assertSameOrigin(request)) {
      return NextResponse.json({ success: false }, { status: 403 });
    }

    const identity = resolveBrowserIdentity(request);
    const availability = await getPreviewAvailability(identity.browserId);
    const response = NextResponse.json({
      success: true,
      browserIdPresent: !identity.created,
      hasPreviewAvailable: availability.hasPreviewAvailable,
      nextPreviewAt: availability.nextPreviewAt,
      activeOrderId: availability.activeOrderId,
    });

    appendBrowserCookie(response, identity.setCookie);
    console.info("[preview-entitlement]", {
      requestId,
      browserIdCreated: identity.created,
      hasPreviewAvailable: availability.hasPreviewAvailable,
      hasActiveOrderId: Boolean(availability.activeOrderId),
    });
    return response;
  } catch (error) {
    console.error("[preview-entitlement]", {
      requestId,
      failureReason: "Unable to read preview entitlement",
      errorMessage: error instanceof Error ? error.message : "Unknown entitlement error",
    });
    return NextResponse.json(
      {
        success: false,
        hasPreviewAvailable: true,
        nextPreviewAt: null,
        activeOrderId: null,
      },
      { status: 200 },
    );
  }
}
