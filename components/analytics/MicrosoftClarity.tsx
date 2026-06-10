"use client";

import Script from "next/script";

export function MicrosoftClarity() {
  const clarityId = process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID;

  if (!clarityId) return null;

  if (process.env.NODE_ENV !== "production") {
    console.log(
      "Microsoft Clarity configured:",
      Boolean(process.env.NEXT_PUBLIC_MICROSOFT_CLARITY_ID),
    );
  }

  return (
    <Script
      id="microsoft-clarity"
      src={`https://www.clarity.ms/tag/${clarityId}`}
      strategy="afterInteractive"
    />
  );
}
