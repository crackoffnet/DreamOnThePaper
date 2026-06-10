import { NextResponse } from "next/server";

export async function GET() {
  const clarityId = process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID;

  return NextResponse.json(
    {
      hasClarityId: Boolean(clarityId),
      clarityIdLength: clarityId?.length ?? 0,
      environment: process.env.NODE_ENV ?? "unknown",
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
