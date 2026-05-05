"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Loader2, Sparkles } from "lucide-react";
import { DeviceSelector } from "@/components/DeviceSelector";
import { LoadingGeneration } from "@/components/LoadingGeneration";
import { ProgressSteps } from "@/components/ProgressSteps";
import type {
  DeviceType,
  GenerateResponse,
  WallpaperInput,
  WallpaperMeta,
} from "@/lib/types";
import {
  defaultWallpaperInput,
  getWallpaperMeta,
  labels,
  quoteTones,
  ratioOptions,
  styles,
  themes,
} from "@/lib/wallpaper";

const questions: Array<{
  key: keyof Pick<
    WallpaperInput,
    | "goals"
    | "lifestyle"
    | "career"
    | "personalLife"
    | "health"
    | "place"
    | "feelingWords"
    | "reminder"
  >;
  label: string;
  placeholder: string;
}> = [
  {
    key: "goals",
    label: "What are your top 3 dreams or goals?",
    placeholder: "A calmer home, strong body, creative freedom...",
  },
  {
    key: "lifestyle",
    label: "What kind of life are you building?",
    placeholder: "Soft mornings, focused work, beautiful routines...",
  },
  {
    key: "career",
    label: "What career, business, or financial goal do you want to see?",
    placeholder: "A profitable studio, paid-off debt, better clients...",
  },
  {
    key: "personalLife",
    label: "Who or what matters most in your personal life?",
    placeholder: "Family, partner, friendships, peace, faith...",
  },
  {
    key: "health",
    label: "What health, body, or energy goal do you have?",
    placeholder: "Strength, sleep, glow, calm energy...",
  },
  {
    key: "place",
    label: "What place, home, or travel dream should appear?",
    placeholder: "A warm kitchen, Paris, ocean air, a garden...",
  },
  {
    key: "feelingWords",
    label: "What words describe the feeling of your dream life?",
    placeholder: "Clear, wealthy, loved, light, disciplined...",
  },
  {
    key: "reminder",
    label: "What should the wallpaper remind you every day?",
    placeholder: "I am allowed to build a beautiful life.",
  },
];

const stepTitles = [
  "Choose device",
  "Choose ratio",
  "Choose theme",
  "Choose style",
  "Answer prompts",
  "Quote tone",
  "Generate",
];

export function WallpaperWizard() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WallpaperInput>(defaultWallpaperInput);
  const [website, setWebsite] = useState("");
  const [error, setError] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const meta = useMemo(() => getWallpaperMeta(form), [form]);

  function update<K extends keyof WallpaperInput>(
    key: K,
    value: WallpaperInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function setDevice(device: DeviceType) {
    setForm((current) => ({
      ...current,
      device,
      ratio: ratioOptions[device][0],
    }));
  }

  function next() {
    setError("");
    setStep((current) => Math.min(current + 1, stepTitles.length - 1));
  }

  function back() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsGenerating(true);

    try {
      if (website) {
        throw new Error("Unable to continue. Please try again.");
      }

      const response = await fetch("/api/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, website }),
      });
      const data = (await response.json()) as Partial<GenerateResponse> & {
        error?: string;
        preview?: boolean;
        meta?: WallpaperMeta;
      };

      if (!response.ok || !data.imageUrl || !data.meta) {
        throw new Error(data.error || "Unable to create your preview.");
      }

      localStorage.setItem("dreamWallpaperInput", JSON.stringify(form));
      localStorage.setItem("dreamPreviewWallpaper", data.imageUrl);
      localStorage.setItem("dreamPreviewMeta", JSON.stringify(data.meta));
      localStorage.removeItem("dreamWallpaper");
      localStorage.removeItem("dreamWallpaperMeta");
      localStorage.removeItem("dreamOrderToken");
      router.push("/preview");
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Unable to create your wallpaper.",
      );
      setIsGenerating(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      className="mx-auto grid max-w-6xl gap-4 lg:grid-cols-[0.72fr_0.28fr]"
    >
      <section className="rounded-[1.75rem] border border-white/70 bg-white/55 p-4 shadow-soft backdrop-blur-xl sm:p-5">
        <div className="mb-5 flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-gold">
              Step {step + 1} of {stepTitles.length}
            </p>
            <h1 className="mt-2 text-2xl font-semibold tracking-[-0.02em] text-ink sm:text-3xl">
              {stepTitles[step]}
            </h1>
          </div>
          <div className="rounded-full border border-cocoa/10 bg-white/65 px-3 py-1 text-xs text-taupe">
            {labels.ratios[form.ratio]}
          </div>
        </div>

        <div className="mb-5">
          <ProgressSteps steps={stepTitles} currentStep={step} />
        </div>
        <input
          className="hidden"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(event) => setWebsite(event.target.value)}
          aria-hidden="true"
        />

        {step === 0 ? (
          <DeviceSelector value={form.device} onChange={setDevice} />
        ) : null}

        {step === 1 ? (
          <OptionGrid
            options={ratioOptions[form.device]}
            value={form.ratio}
            getLabel={(option) => labels.ratios[option]}
            onChange={(ratio) => update("ratio", ratio)}
          />
        ) : null}

        {step === 2 ? (
          <OptionGrid
            options={themes}
            value={form.theme}
            getLabel={(option) => labels.themes[option]}
            onChange={(theme) => update("theme", theme)}
          />
        ) : null}

        {step === 3 ? (
          <OptionGrid
            options={styles}
            value={form.style}
            getLabel={(option) => labels.styles[option]}
            onChange={(style) => update("style", style)}
          />
        ) : null}

        {step === 4 ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {questions.map((question) => (
              <label key={question.key} className="block">
                <span className="mb-1.5 block text-xs font-semibold text-cocoa">
                  {question.label}
                </span>
                <textarea
                  className="field min-h-20 resize-y"
                  maxLength={360}
                  value={form[question.key]}
                  placeholder={question.placeholder}
                  onChange={(event) => update(question.key, event.target.value)}
                />
              </label>
            ))}
          </div>
        ) : null}

        {step === 5 ? (
          <OptionGrid
            options={quoteTones}
            value={form.quoteTone}
            getLabel={(option) => labels.quoteTones[option]}
            onChange={(quoteTone) => update("quoteTone", quoteTone)}
          />
        ) : null}

        {step === 6 ? (
          <div className="grid gap-4">
            <div className="rounded-2xl border border-cocoa/10 bg-white/60 p-4">
              <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-ink">
                <Sparkles aria-hidden className="h-4 w-4 text-gold" />
                Ready to create preview
              </div>
              <div className="grid gap-2 text-sm text-taupe sm:grid-cols-2">
                <p>Device: {labels.devices[form.device]}</p>
                <p>Ratio: {labels.ratios[form.ratio]}</p>
                <p>Theme: {labels.themes[form.theme]}</p>
                <p>Style: {labels.styles[form.style]}</p>
              </div>
            </div>
            {isGenerating ? (
              <LoadingGeneration label="Creating your preview..." />
            ) : null}
          </div>
        ) : null}

        {error ? (
          <p className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {error}
          </p>
        ) : null}

        <div className="mt-5 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={back}
            disabled={step === 0 || isGenerating}
            className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full border border-cocoa/10 bg-white/60 px-4 text-sm font-medium text-ink transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-40"
          >
            <ArrowLeft aria-hidden className="h-4 w-4" />
            Back
          </button>
          {step < stepTitles.length - 1 ? (
            <button
              type="button"
              onClick={next}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-pearl shadow-sm transition hover:bg-cocoa"
            >
              Next
              <ArrowRight aria-hidden className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="submit"
              disabled={isGenerating}
              className="focus-ring inline-flex min-h-11 items-center gap-2 rounded-full bg-ink px-5 text-sm font-medium text-pearl shadow-sm transition hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isGenerating ? (
                <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles aria-hidden className="h-4 w-4" />
              )}
              Generate Preview
            </button>
          )}
        </div>
      </section>

      <aside className="rounded-[1.75rem] border border-white/70 bg-white/45 p-4 shadow-sm backdrop-blur-xl">
        <div
          className="mx-auto w-full max-w-[220px] overflow-hidden rounded-[1.5rem] border border-white/80 bg-linen p-3 shadow-soft"
          style={{ aspectRatio: meta.aspectRatio }}
        >
          <div className="flex h-full flex-col justify-between rounded-[1.1rem] border border-white/70 bg-white/45 p-4">
            <div className="space-y-2">
              <div className="h-12 rounded-2xl bg-[#d9c8ac]" />
              <div className="grid grid-cols-2 gap-2">
                <div className="h-10 rounded-xl bg-mist" />
                <div className="h-10 rounded-xl bg-[#c9b58e]" />
              </div>
            </div>
            <p className="font-serif text-lg leading-tight text-ink">
              {form.reminder || "Your vision, quietly visible."}
            </p>
          </div>
        </div>
        <div className="mt-4 space-y-2 text-xs text-taupe">
          <p className="font-semibold text-cocoa">Preview frame</p>
          <p>{labels.devices[form.device]}</p>
          <p>{labels.ratios[form.ratio]}</p>
          <p>{meta.imageSize}</p>
        </div>
      </aside>
    </form>
  );
}

type OptionGridProps<T extends string> = {
  options: readonly T[];
  value: T;
  getLabel: (option: T) => string;
  onChange: (option: T) => void;
};

function OptionGrid<T extends string>({
  options,
  value,
  getLabel,
  onChange,
}: OptionGridProps<T>) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {options.map((option) => {
        const active = value === option;

        return (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`focus-ring rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
              active
                ? "border-gold bg-white text-ink shadow-sm"
                : "border-cocoa/10 bg-white/55 text-cocoa hover:bg-white"
            }`}
          >
            {getLabel(option)}
          </button>
        );
      })}
    </div>
  );
}
