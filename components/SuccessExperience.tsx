"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Loader2, RotateCcw } from "lucide-react";
import { LoadingGeneration } from "@/components/LoadingGeneration";
import { imageUrlFromPayload, setEphemeralImage } from "@/lib/client-images";
import type { GenerateResponse, WallpaperInput } from "@/lib/types";

type Step = "verifying" | "generating" | "done" | "error";

export function SuccessExperience({ sessionId }: { sessionId: string }) {
  const [step, setStep] = useState<Step>("verifying");
  const [message, setMessage] = useState("Payment confirmed. Preparing generation...");
  const [error, setError] = useState("");
  const [orderToken, setOrderToken] = useState("");
  const input = useMemo(() => getStoredInput(), []);

  useEffect(() => {
    if (!sessionId || !input) {
      setStep("error");
      setError("Missing payment or wallpaper details.");
      return;
    }

    void verifyAndGenerate();

    async function verifyAndGenerate() {
      try {
        setStep("verifying");
        const verifyResponse = await fetch("/api/verify-payment", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const verified = (await verifyResponse.json()) as {
          orderToken?: string;
          packageId?: string;
          customerEmail?: string | null;
          error?: string;
        };

        if (!verifyResponse.ok || !verified.orderToken) {
          throw new Error(verified.error || "Unable to verify payment.");
        }

        sessionStorage.setItem("dreamOrderToken", verified.orderToken);
        sessionStorage.setItem("dreamPackageId", verified.packageId || "single");
        if (verified.customerEmail) {
          sessionStorage.setItem("dreamCustomerEmail", verified.customerEmail);
        }
        setOrderToken(verified.orderToken);

        setStep("generating");
        setMessage("Creating your high-quality wallpaper...");
        const generationResponse = await fetch("/api/generate-final", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...input, orderToken: verified.orderToken }),
        });
        const generated = (await generationResponse.json()) as GenerateResponse | undefined;
        const imageUrl = generated ? await imageUrlFromPayload(generated) : "";

        if (
          !generationResponse.ok ||
          generated?.success === false ||
          !imageUrl ||
          !generated?.meta
        ) {
          throw new Error(
            generated?.message ||
              generated?.error ||
              "Unable to generate wallpaper.",
          );
        }

        setEphemeralImage("finalImageUrl", imageUrl);
        sessionStorage.setItem("dreamWallpaperMeta", JSON.stringify(generated.meta));
        setStep("done");
        setMessage("Your full-resolution wallpaper is ready.");
      } catch (successError) {
        setStep("error");
        setError(
          successError instanceof Error
            ? successError.message
            : "Unable to finish your wallpaper.",
        );
      }
    }
  }, [input, sessionId]);

  if (step === "done") {
    return (
      <section className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-[1.75rem] border border-white/70 bg-white/60 p-6 text-center shadow-soft">
          <CheckCircle2 aria-hidden className="mx-auto h-10 w-10 text-gold" />
          <h1 className="mt-4 text-3xl font-semibold text-ink">{message}</h1>
          <p className="mt-2 text-sm text-taupe">
            Payment verified. Your secure download is unlocked.
          </p>
          <Link
            href="/thank-you"
            className="focus-ring mt-6 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-pearl"
          >
            View Wallpaper
          </Link>
          <span className="sr-only">{orderToken}</span>
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-10">
      <div className="rounded-[1.75rem] border border-white/70 bg-white/60 p-6 shadow-soft">
        {step === "error" ? (
          <>
            <RotateCcw aria-hidden className="h-8 w-8 text-gold" />
            <h1 className="mt-4 text-3xl font-semibold text-ink">
              We could not finish generation.
            </h1>
            <p className="mt-2 text-sm leading-6 text-taupe">{error}</p>
            <Link
              href={`/success?session_id=${encodeURIComponent(sessionId)}`}
              className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-pearl"
            >
              Retry
            </Link>
          </>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-gold">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              Payment confirmed
            </div>
            <h1 className="text-3xl font-semibold text-ink">{message}</h1>
            <div className="mt-5">
              <LoadingGeneration label={message} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function getStoredInput() {
  try {
    const stored = sessionStorage.getItem("dreamWallpaperInput");
    return stored ? (JSON.parse(stored) as WallpaperInput) : null;
  } catch {
    return null;
  }
}
