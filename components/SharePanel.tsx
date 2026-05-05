"use client";

import { useState } from "react";
import { Copy, Share2 } from "lucide-react";

type SharePanelProps = {
  imageUrl: string;
};

export function SharePanel({ imageUrl }: SharePanelProps) {
  const [message, setMessage] = useState("");

  async function share() {
    try {
      const shareUrl = window.location.origin;
      if (navigator.share) {
        await navigator.share({
          title: "Dream On The Paper wallpaper",
          text: "My personalized wallpaper is ready.",
          url: shareUrl,
        });
        setMessage("Shared.");
        return;
      }

      await navigator.clipboard.writeText(shareUrl);
      setMessage("Link copied.");
    } catch {
      setMessage("Unable to share right now.");
    }
  }

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(window.location.origin);
      setMessage("Link copied.");
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
          Share
        </button>
        <button
          type="button"
          onClick={copyLink}
          className="focus-ring inline-flex min-h-10 items-center justify-center gap-2 rounded-full bg-white px-4 text-sm font-medium text-ink transition hover:bg-pearl"
        >
          <Copy aria-hidden className="h-4 w-4" />
          Copy Link
        </button>
      </div>
      <p className="mt-2 text-xs text-taupe">
        {message || "Sharing never includes your private answers."}
      </p>
      <span className="sr-only">{imageUrl ? "Wallpaper ready" : ""}</span>
    </div>
  );
}
