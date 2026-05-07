"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StartOverButton } from "@/components/StartOverButton";
import { ensureFreshDreamState } from "@/lib/clientState";

export function HomepageStateReset() {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    const state = ensureFreshDreamState();
    setHasDraft(
      Boolean(
        state?.orderToken &&
          state.status !== "paid" &&
          state.status !== "final_generated",
      ),
    );
  }, []);

  if (!hasDraft) {
    return null;
  }

  return (
    <div className="px-4 pt-2 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-1.5 rounded-full border border-gold/15 bg-white/55 px-3 py-1.5 text-[11.5px] font-light text-cocoa sm:flex-row sm:items-center sm:justify-between">
        <p className="truncate">You have a wallpaper in progress.</p>
        <div className="flex items-center gap-2">
          <Link
            href="/create"
            className="focus-ring rounded-full px-3 py-1.5 font-medium text-ink transition hover:bg-white"
          >
            Continue
          </Link>
          <StartOverButton className="min-h-8" />
        </div>
      </div>
    </div>
  );
}
