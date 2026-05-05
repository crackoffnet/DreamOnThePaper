"use client";

import { useState } from "react";
import { Check, Loader2 } from "lucide-react";

const plans = [
  {
    id: "single",
    name: "Single Wallpaper",
    price: "$7.99",
    description: "One personalized wallpaper for your chosen device.",
    features: ["AI-generated vision board", "Mobile or desktop size", "Download-ready image"],
  },
  {
    id: "bundle",
    name: "Wallpaper Bundle",
    price: "$12.99",
    description: "A matching set for every screen in your daily rhythm.",
    features: ["Mobile and desktop versions", "Refined quote direction", "Best for full-device reset"],
  },
];

export function Pricing() {
  const [selectedPlan, setSelectedPlan] = useState("single");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  async function proceedToPayment() {
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan: selectedPlan }),
      });
      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error || "Unable to start checkout.");
      }

      window.location.href = data.url;
    } catch (checkoutError) {
      setError(
        checkoutError instanceof Error
          ? checkoutError.message
          : "Unable to start checkout.",
      );
      setIsLoading(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-5xl">
      <div className="grid gap-5 md:grid-cols-2">
        {plans.map((plan) => {
          const isSelected = selectedPlan === plan.id;
          return (
            <button
              key={plan.id}
              type="button"
              onClick={() => setSelectedPlan(plan.id)}
              className={`focus-ring rounded-[1.75rem] border p-6 text-left transition ${
                isSelected
                  ? "border-gold bg-white shadow-soft"
                  : "border-white/70 bg-white/45 hover:bg-white/70"
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-2xl font-semibold text-ink">{plan.name}</h2>
                  <p className="mt-2 text-sm leading-6 text-taupe">
                    {plan.description}
                  </p>
                </div>
                <p className="text-2xl font-semibold text-ink">{plan.price}</p>
              </div>
              <div className="mt-7 space-y-3">
                {plan.features.map((feature) => (
                  <div key={feature} className="flex items-center gap-3 text-sm text-cocoa">
                    <Check aria-hidden className="h-4 w-4 text-gold" />
                    {feature}
                  </div>
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {error ? <p className="mt-5 text-sm text-red-700">{error}</p> : null}

      <button
        type="button"
        onClick={proceedToPayment}
        disabled={isLoading}
        className="focus-ring mt-8 inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-pearl shadow-soft transition hover:-translate-y-0.5 hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
      >
        {isLoading ? <Loader2 aria-hidden className="h-4 w-4 animate-spin" /> : null}
        Proceed to Payment
      </button>
    </div>
  );
}
