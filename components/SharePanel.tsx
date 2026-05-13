"use client";

import { Share2 } from "lucide-react";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

export function SharePanel() {
  function siteUrl() {
    return configuredSiteUrl || window.location.origin;
  }

  async function shareSite() {
    const shareUrl = siteUrl();

    if (navigator.share) {
      await navigator.share({
        title: "Dream On The Paper",
        text: "Create your own personalized cinematic wallpaper.",
        url: shareUrl,
      });
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
  }

  return (
    <div className="rounded-2xl border border-cocoa/10 bg-white/55 p-3">
      <button
        type="button"
        onClick={shareSite}
        className="focus-ring inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink transition hover:bg-pearl"
      >
        <Share2 aria-hidden className="h-4 w-4" />
        Share Site
      </button>
    </div>
  );
}
