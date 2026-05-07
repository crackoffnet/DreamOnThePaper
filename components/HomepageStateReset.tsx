"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { StartOverButton } from "@/components/StartOverButton";
import { ensureAppStateVersion } from "@/lib/clientState";

export function HomepageStateReset() {
  const [hasDraft, setHasDraft] = useState(false);

  useEffect(() => {
    ensureAppStateVersion();
    setHasDraft(
      Boolean(
        sessionStorage.getItem("dreamCurrentDraft") ||
          sessionStorage.getItem("dreamOrderId") ||
          sessionStorage.getItem("dreamCheckoutOrderToken"),
      ),
    );
  }, []);

  if (!hasDraft) {
    return null;
  }

  return (
    <div className="px-4 pt-3 sm:px-6">
      <div className="mx-auto flex max-w-6xl flex-col gap-2 rounded-2xl border border-gold/15 bg-white/55 px-3 py-2 text-xs text-cocoa shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <p>You have a wallpaper in progress.</p>
        <div className="flex items-center gap-2">
          <Link
            href="/create"
            className="focus-ring rounded-full px-3 py-2 font-semibold text-ink transition hover:bg-white"
          >
            Continue
          </Link>
          <StartOverButton className="min-h-8" />
        </div>
      </div>
    </div>
  );
}
