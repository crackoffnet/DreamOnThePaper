"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { RotateCcw, X } from "lucide-react";
import { clearDreamWallpaperState } from "@/lib/wallpaperDraft";

type StartOverButtonProps = {
  className?: string;
};

export function StartOverButton({ className = "" }: StartOverButtonProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  function startOver() {
    clearDreamWallpaperState();
    setIsOpen(false);
    router.push("/create");
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`focus-ring inline-flex min-h-9 items-center justify-center gap-2 rounded-full border border-cocoa/10 bg-white/70 px-3 text-xs font-semibold text-ink shadow-sm transition hover:bg-white ${className}`}
      >
        <RotateCcw aria-hidden className="h-3.5 w-3.5 text-gold" />
        Start Over
      </button>

      {isOpen ? (
        <div className="fixed inset-0 z-50 grid place-items-center bg-ink/25 px-4 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-[1.5rem] border border-white/70 bg-pearl p-5 shadow-soft">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-xl font-semibold text-ink">Start over?</h2>
                <p className="mt-2 text-sm leading-6 text-taupe">
                  This will clear your current preview and answers.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="focus-ring rounded-full p-1 text-taupe transition hover:bg-white"
                aria-label="Cancel start over"
              >
                <X aria-hidden className="h-4 w-4" />
              </button>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="focus-ring min-h-10 rounded-full border border-cocoa/10 bg-white/70 px-4 text-sm font-semibold text-ink"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={startOver}
                className="focus-ring min-h-10 rounded-full bg-ink px-4 text-sm font-semibold text-pearl"
              >
                Start Over
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
