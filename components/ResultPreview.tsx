"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Download, RefreshCw, SlidersHorizontal, Sparkles } from "lucide-react";
import { LoadingGeneration } from "@/components/LoadingGeneration";
import type { GenerateResponse, WallpaperInput, WallpaperMeta } from "@/lib/types";
import { labels } from "@/lib/wallpaper";

type StoredResult = {
  imageUrl: string;
  input: WallpaperInput | null;
  meta: WallpaperMeta | null;
};

export function ResultPreview() {
  const [result, setResult] = useState<StoredResult>({
    imageUrl: "",
    input: null,
    meta: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const imageUrl = localStorage.getItem("dreamWallpaper") || "";
    const input = parseJson<WallpaperInput>(
      localStorage.getItem("dreamWallpaperInput"),
    );
    const meta = parseJson<WallpaperMeta>(localStorage.getItem("dreamWallpaperMeta"));

    setResult({ imageUrl, input, meta });
    const timer = window.setTimeout(() => setIsLoading(false), 500);
    return () => window.clearTimeout(timer);
  }, []);

  async function createAnotherVersion() {
    if (!result.input) {
      setError("Start a new wallpaper first.");
      return;
    }

    setError("");
    setIsRegenerating(true);

    try {
      const response = await fetch("/api/generate-wallpaper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(result.input),
      });
      const data = (await response.json()) as Partial<GenerateResponse> & {
        error?: string;
      };

      if (!response.ok || !data.imageUrl || !data.meta) {
        throw new Error(data.error || "Unable to create another version.");
      }

      localStorage.setItem("dreamWallpaper", data.imageUrl);
      localStorage.setItem("dreamWallpaperMeta", JSON.stringify(data.meta));
      setResult((current) => ({
        ...current,
        imageUrl: data.imageUrl || "",
        meta: data.meta || current.meta,
      }));
    } catch (regenerateError) {
      setError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "Unable to create another version.",
      );
    } finally {
      setIsRegenerating(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto flex min-h-[60vh] max-w-3xl items-center justify-center px-4">
        <LoadingGeneration label="Creating your wallpaper..." />
      </div>
    );
  }

  if (!result.imageUrl || !result.meta) {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/60 p-6 shadow-soft">
          <Sparkles aria-hidden className="mb-4 h-6 w-6 text-gold" />
          <h1 className="text-3xl font-semibold text-ink">No wallpaper found.</h1>
          <p className="mt-3 text-sm leading-6 text-taupe">
            Your browser session does not have a generated wallpaper yet.
          </p>
          <Link
            href="/create"
            className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-5 text-sm font-medium text-pearl"
          >
            Create a Wallpaper
          </Link>
        </div>
      </section>
    );
  }

  const meta = result.meta;

  return (
    <section className="mx-auto grid max-w-6xl gap-5 px-4 py-6 sm:px-6 lg:grid-cols-[0.42fr_0.58fr]">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/55 p-5 shadow-soft backdrop-blur-xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
          Your wallpaper
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-[-0.02em] text-ink">
          Ready to download.
        </h1>
        <div className="mt-4 grid gap-2 text-sm text-taupe">
          <p>Device: {labels.devices[meta.device]}</p>
          <p>Ratio: {labels.ratios[meta.ratio]}</p>
          <p>Style: {labels.styles[meta.style]}</p>
          <p>Theme: {labels.themes[meta.theme]}</p>
        </div>

        {isRegenerating ? (
          <div className="mt-5">
            <LoadingGeneration label="Creating another version..." />
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-6 grid gap-3">
          <a
            href={result.imageUrl}
            download="dream-on-the-paper-wallpaper.png"
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-pearl shadow-sm transition hover:bg-cocoa"
          >
            <Download aria-hidden className="h-4 w-4" />
            Download Wallpaper
          </a>
          <button
            type="button"
            onClick={createAnotherVersion}
            disabled={isRegenerating}
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cocoa/10 bg-white/65 px-5 text-sm font-medium text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw aria-hidden className="h-4 w-4" />
            Create Another Version
          </button>
          <Link
            href="/create"
            className="focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-full border border-cocoa/10 bg-white/65 px-5 text-sm font-medium text-ink transition hover:bg-white"
          >
            <SlidersHorizontal aria-hidden className="h-4 w-4" />
            Try Different Style
          </Link>
        </div>
      </div>

      <div className="flex justify-center rounded-[1.75rem] border border-white/70 bg-white/45 p-4 shadow-soft backdrop-blur-xl">
        <div
          className="relative max-h-[72vh] w-full max-w-md overflow-hidden rounded-[1.5rem] border border-white/80 bg-linen shadow-soft"
          style={{ aspectRatio: meta.aspectRatio }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={result.imageUrl}
            alt="Generated Dream On The Paper wallpaper"
            className="h-full w-full object-cover"
          />
        </div>
      </div>
    </section>
  );
}

function parseJson<T>(value: string | null): T | null {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value) as T;
  } catch {
    return null;
  }
}
