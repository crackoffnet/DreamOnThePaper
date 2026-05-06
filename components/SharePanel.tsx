"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";

const configuredSiteUrl = process.env.NEXT_PUBLIC_SITE_URL || "";

export function SharePanel() {
  const [message, setMessage] = useState("");

  function siteUrl() {
    return configuredSiteUrl || window.location.origin;
  }

  async function share() {
    try {
      const shareUrl = siteUrl();
      if (navigator.share) {
        await navigator.share({
          title: "Dream On The Paper",
          text: "Create your own personalized AI wallpaper.",
          url: shareUrl,
        });
        setMessage("Shared.");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setMessage("Site link copied.");
    } catch {
      setMessage("Unable to share right now.");
    }
  }

  async function copySiteLink() {
    try {
      await navigator.clipboard.writeText(siteUrl());
      setMessage("Site link copied.");
    } catch {
      setMessage("Unable to copy link.");
    }
  }

  return (
    <div className="rounded-2xl border border-cocoa/10 bg-white/55 p-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={share}
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink transition hover:bg-pearl"
        >
          <Share2 aria-hidden className="h-4 w-4" />
          Share Site
        </button>
        <button
          type="button"
          onClick={copySiteLink}
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink transition hover:bg-pearl"
        >
          <Copy aria-hidden className="h-4 w-4" />
          Copy Site Link
        </button>
      </div>
      <p className="mt-2 text-xs leading-5 text-taupe">
        {message || "Private wallpaper links are not shared for your privacy."}
      </p>
    </div>
  );
}
