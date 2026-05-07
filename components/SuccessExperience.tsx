"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw } from "lucide-react";
import { LoadingGeneration } from "@/components/LoadingGeneration";
import { ResultPreview } from "@/components/ResultPreview";
import { StartOverButton } from "@/components/StartOverButton";
import {
  getEphemeralImage,
  imageUrlFromPayload,
  setEphemeralImage,
} from "@/lib/client-images";
import type { GenerateResponse } from "@/lib/types";

type Step = "verifying" | "generating" | "done" | "error";

export function SuccessExperience({ sessionId }: { sessionId: string }) {
  const [step, setStep] = useState<Step>("verifying");
  const [message, setMessage] = useState("Verifying payment...");
  const [error, setError] = useState("");
  const hasStartedRef = useRef(false);

  useEffect(() => {
    console.info("[success] sessionId present", Boolean(sessionId));

    if (hasStartedRef.current) {
      return;
    }
    hasStartedRef.current = true;

    if (!sessionId) {
      setStep("error");
      setError("We could not find your checkout session.");
      return;
    }

    const existingFinal = getEphemeralImage("finalImageUrl");
    if (
      existingFinal &&
      sessionStorage.getItem("dreamFinalSessionId") === sessionId
    ) {
      setStep("done");
      setMessage("Your full-resolution wallpaper is ready.");
      return;
    }

    void verifyAndGenerate();

    async function verifyAndGenerate() {
      try {
        console.info("[success] verifying payment");
        setStep("verifying");
        setMessage("Verifying payment...");
        const verifyResponse = await fetch("/api/verify-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
        });
        const verified = (await verifyResponse.json()) as {
          success?: boolean;
          finalGenerationToken?: string;
          orderId?: string;
          packageId?: string;
          customerEmail?: string | null;
          message?: string;
          error?: string;
        };

        if (!verifyResponse.ok || !verified.finalGenerationToken) {
          throw new Error(
            verified.message ||
              verified.error ||
              "Payment is not verified yet. Please wait a moment and retry.",
          );
        }

        sessionStorage.setItem(
          "dreamFinalGenerationToken",
          verified.finalGenerationToken,
        );
        sessionStorage.setItem("dreamOrderToken", verified.finalGenerationToken);
        if (verified.orderId) {
          sessionStorage.setItem("dreamOrderId", verified.orderId);
        }
        sessionStorage.setItem("dreamPackageId", verified.packageId || "single");
        if (verified.customerEmail) {
          sessionStorage.setItem("dreamCustomerEmail", verified.customerEmail);
        }

        setStep("generating");
        setMessage("Creating your final wallpaper...");
        console.info("[success] generating final");
        const generationResponse = await fetch("/api/generate-final", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            finalGenerationToken: verified.finalGenerationToken,
          }),
        });
        const generated = (await generationResponse.json()) as
          | GenerateResponse
          | undefined;
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
              "Your payment is verified, but we couldn't finish the wallpaper generation. You will not be charged again. Please retry or contact support.",
          );
        }

        setEphemeralImage("finalImageUrl", imageUrl);
        sessionStorage.setItem("dreamFinalSessionId", sessionId);
        sessionStorage.setItem("dreamWallpaperMeta", JSON.stringify(generated.meta));
        if (generated.finalWidth && generated.finalHeight) {
          sessionStorage.setItem(
            "dreamWallpaperDimensions",
            JSON.stringify({
              width: generated.finalWidth,
              height: generated.finalHeight,
            }),
          );
        }
        setStep("done");
        setMessage("Your full-resolution wallpaper is ready.");
        console.info("[success] final ready");
      } catch (successError) {
        setStep("error");
        setError(
          successError instanceof Error
            ? successError.message
            : "Unable to finish your wallpaper.",
        );
      }
    }
  }, [sessionId]);

  if (step === "done") {
    return <ResultPreview />;
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
            {sessionId ? (
              <Link
                href={`/success?session_id=${encodeURIComponent(sessionId)}`}
                className="focus-ring mt-5 inline-flex min-h-11 items-center justify-center rounded-full bg-ink px-6 text-sm font-semibold text-pearl"
              >
                Retry
              </Link>
            ) : null}
            <div className="mt-3">
              <StartOverButton />
            </div>
          </>
        ) : (
          <>
            <div className="mb-5 flex items-center gap-2 text-sm font-semibold text-gold">
              <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              {step === "verifying" ? "Verifying payment" : "Payment confirmed"}
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
