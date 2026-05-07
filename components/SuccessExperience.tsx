"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { Loader2, RotateCcw } from "lucide-react";
import { LoadingGeneration } from "@/components/LoadingGeneration";
import { ResultPreview } from "@/components/ResultPreview";
import { StartOverButton } from "@/components/StartOverButton";
import { ensureAppStateVersion } from "@/lib/clientState";
import {
  getEphemeralImage,
  imageUrlFromPayload,
  setEphemeralImage,
} from "@/lib/client-images";
import type { GenerateResponse } from "@/lib/types";

type Step = "verifying" | "generating" | "done" | "error";
type FinalGenerationResponse = GenerateResponse & {
  status?: "ready" | "generating" | "failed" | string;
};

export function SuccessExperience({ sessionId }: { sessionId: string }) {
  const [step, setStep] = useState<Step>("verifying");
  const [message, setMessage] = useState("Verifying payment...");
  const [error, setError] = useState("");
  const hasStartedRef = useRef(false);

  const requestFinalGeneration = useCallback(
    async (
      finalGenerationToken: string,
      signal: AbortSignal,
    ): Promise<FinalGenerationResponse> => {
      const generationResponse = await fetch("/api/generate-final", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ finalGenerationToken }),
        signal,
      });
      const generated = (await generationResponse.json()) as
        | FinalGenerationResponse
        | undefined;

      if (generationResponse.status === 202 || generated?.status === "generating") {
        setMessage("Your wallpaper is being created...");
        return { ...(generated || {}), status: "generating" };
      }

      const imageUrl = generated ? await imageUrlFromPayload(generated) : "";
      if (!generationResponse.ok || !generated || !imageUrl || !generated.meta) {
        throw new Error(
          generated?.message ||
            generated?.error ||
            "Your payment is verified, but we could not finish generation. Please retry.",
        );
      }

      return { ...generated, status: "ready", imageUrl };
    },
    [],
  );

  const pollFinalStatus = useCallback(
    async (
      finalGenerationToken: string,
      signal: AbortSignal,
    ): Promise<FinalGenerationResponse> => {
      const deadline = Date.now() + 2 * 60 * 1000;

      while (Date.now() < deadline) {
        await sleep(3000, signal);

        const response = await fetch("/api/order-status", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ finalGenerationToken }),
          signal,
        });
        const status = (await response.json()) as FinalGenerationResponse;

        if (status.status === "final_generated" || status.status === "ready") {
          const imageUrl = await imageUrlFromPayload(status);
          if (response.ok && imageUrl && status.meta) {
            return { ...status, status: "ready", imageUrl };
          }
        }

        if (status.status === "paid") {
          return requestFinalGeneration(finalGenerationToken, signal);
        }

        if (status.status === "failed") {
          throw new Error(
            status.message ||
              "Your payment is verified, but generation failed. Please retry.",
          );
        }

        setMessage("Your wallpaper is being created...");
      }

      throw new Error(
        "Your wallpaper is still being created. Please wait a moment and retry.",
      );
    },
    [requestFinalGeneration],
  );

  const generateOrPollFinal = useCallback(
    async (
      finalGenerationToken: string,
      signal: AbortSignal,
    ): Promise<FinalGenerationResponse> => {
      const generated = await requestFinalGeneration(finalGenerationToken, signal);

      if (generated.status === "ready") {
        return generated;
      }

      if (generated.status === "generating") {
        return pollFinalStatus(finalGenerationToken, signal);
      }

      if (generated.status === "failed") {
        throw new Error(
          generated.message ||
            "Your payment is verified, but generation failed. Please retry.",
        );
      }

      return generated;
    },
    [pollFinalStatus, requestFinalGeneration],
  );

  const persistGeneratedWallpaper = useCallback(
    (generated: FinalGenerationResponse) => {
      const imageUrl = generated.imageUrl || generated.finalImageUrl || "";

      setEphemeralImage("finalImageUrl", imageUrl);
      sessionStorage.setItem("dreamFinalSessionId", sessionId);
      if (generated.meta) {
        sessionStorage.setItem("dreamWallpaperMeta", JSON.stringify(generated.meta));
      }
      if (generated.finalWidth && generated.finalHeight) {
        sessionStorage.setItem(
          "dreamWallpaperDimensions",
          JSON.stringify({
            width: generated.finalWidth,
            height: generated.finalHeight,
          }),
        );
      }
      if (generated.finalAssets?.length) {
        sessionStorage.setItem(
          "dreamFinalAssets",
          JSON.stringify(generated.finalAssets),
        );
      }
    },
    [sessionId],
  );

  useEffect(() => {
    ensureAppStateVersion();
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

    const controller = new AbortController();

    void verifyAndGenerate(controller.signal);

    return () => {
      controller.abort();
    };

    async function verifyAndGenerate(signal: AbortSignal) {
      try {
        console.info("[success] verifying payment");
        setStep("verifying");
        setMessage("Verifying payment...");
        const verifyResponse = await fetch("/api/verify-checkout-session", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ sessionId }),
          signal,
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
        const generated = await generateOrPollFinal(
          verified.finalGenerationToken,
          signal,
        );

        persistGeneratedWallpaper(generated);
        setStep("done");
        setMessage("Your full-resolution wallpaper is ready.");
        console.info("[success] final ready");
      } catch (successError) {
        if (signal.aborted) {
          return;
        }

        setStep("error");
        setError(
          successError instanceof Error
            ? successError.message
            : "Unable to finish your wallpaper.",
        );
      }
    }
  }, [generateOrPollFinal, persistGeneratedWallpaper, sessionId]);

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

function sleep(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const timeout = window.setTimeout(resolve, ms);

    signal.addEventListener(
      "abort",
      () => {
        window.clearTimeout(timeout);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}
