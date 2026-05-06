"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, HelpCircle, Loader2, Sparkles } from "lucide-react";
import { DeviceSelector } from "@/components/DeviceSelector";
import { LoadingGeneration } from "@/components/LoadingGeneration";
import { ProgressSteps } from "@/components/ProgressSteps";
import { StartOverButton } from "@/components/StartOverButton";
import {
  imageUrlFromPayload,
  removeEphemeralImage,
  setEphemeralImage,
} from "@/lib/client-images";
import {
  createNewWallpaperDraft,
  getCurrentDraft,
  getDraftPreviewSessionId,
  getPreviewPolicy,
  markDraftFailed,
  markDraftGenerating,
  markDraftReady,
  saveCurrentDraft,
  updateDraftInput,
  type PreviewPolicy,
  type WallpaperDraft,
} from "@/lib/wallpaperDraft";
import type {
  DeviceType,
  GenerateResponse,
  WallpaperInput,
  WallpaperMeta,
} from "@/lib/types";
import {
  defaultWallpaperInput,
  getAspectRatioLabel,
  getResolutionLabel,
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
  const [draft, setDraft] = useState<WallpaperDraft | null>(null);
  const [policy, setPolicy] = useState<PreviewPolicy>({
    freePreviewUsed: false,
    freePreviewDraftId: null,
  });
  const meta = useMemo(() => getWallpaperMeta(form), [form]);

  useEffect(() => {
    const currentDraft = getCurrentDraft();
    setDraft(currentDraft);
    setForm(currentDraft.input);
    setPolicy(getPreviewPolicy());
    if (currentDraft.previewStatus !== "not_started") {
      setStep(stepTitles.length - 1);
    }
  }, []);

  function update<K extends keyof WallpaperInput>(
    key: K,
    value: WallpaperInput[K],
  ) {
    setForm((current) => {
      const next = { ...current, [key]: value };
      setDraft(updateDraftInput(next));
      return next;
    });
  }

  function setDevice(device: DeviceType) {
    setForm((current) => {
      const next = {
        ...current,
        device,
        ratio: ratioOptions[device][0],
      };
      setDraft(updateDraftInput(next));
      return next;
    });
  }

  function next() {
    setError("");
    if ((step === 0 || step === 1) && form.device === "custom") {
      const issue = getCustomSizeIssue(form);
      if (issue) {
        setError(issue);
        return;
      }
    }

    setStep((current) => Math.min(current + 1, stepTitles.length - 1));
  }

  function back() {
    setError("");
    setStep((current) => Math.max(current - 1, 0));
  }

  function editAnswers() {
    setError("");
    setStep(4);
  }

  function startNewWallpaper() {
    const nextDraft = createNewWallpaperDraft();
    setDraft(nextDraft);
    setForm(nextDraft.input);
    setPolicy(getPreviewPolicy());
    setError("");
    setIsGenerating(false);
    setStep(0);
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsGenerating(true);

    try {
      const activeDraft = saveCurrentDraft({
        ...(draft || getCurrentDraft()),
        input: form,
      });
      setDraft(activeDraft);

      if (activeDraft.previewStatus === "ready" && activeDraft.previewImageUrl) {
        router.push(
          checkoutHref(activeDraft),
        );
        return;
      }

      if (policy.freePreviewUsed) {
        router.push(
          activeDraft.orderToken
            ? checkoutHref(activeDraft)
            : "/checkout",
        );
        return;
      }

      if (website) {
        throw new Error("Unable to continue. Please try again.");
      }

      const customIssue = getCustomSizeIssue(form);
      if (customIssue) {
        throw new Error(customIssue);
      }

      setDraft(markDraftGenerating());

      const response = await fetch("/api/generate-preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          website,
          previewSessionId: getDraftPreviewSessionId(activeDraft.id),
        }),
      });
      const data = (await response.json()) as GenerateResponse & {
        preview?: boolean;
      };
      const imageUrl = await imageUrlFromPayload(data);

      if (!response.ok || data.success === false || !imageUrl || !data.meta) {
        throw new Error(
          data.message || data.error || "Unable to create your preview.",
        );
      }

      sessionStorage.setItem("dreamWallpaperInput", JSON.stringify(form));
      sessionStorage.setItem("dreamPreviewMeta", JSON.stringify(data.meta));
      const readyDraft = markDraftReady(imageUrl, data.meta, {
        orderId: data.orderId,
        previewImageId: data.previewImageId,
        orderToken: data.orderToken,
        orderSnapshotToken: data.orderSnapshotToken,
      });
      setDraft(readyDraft);
      setPolicy(getPreviewPolicy());
      setEphemeralImage("previewImageUrl", imageUrl);
      removeEphemeralImage("finalImageUrl");
      sessionStorage.removeItem("dreamWallpaperMeta");
      sessionStorage.removeItem("dreamOrderToken");
      router.push(checkoutHref(readyDraft));
    } catch (generationError) {
      setError(
        generationError instanceof Error
          ? generationError.message
          : "Unable to create your wallpaper.",
      );
      const currentDraft = getCurrentDraft();
      setDraft(
        currentDraft.previewStatus === "generating"
          ? markDraftFailed()
          : currentDraft,
      );
      setPolicy(getPreviewPolicy());
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
            {getAspectRatioLabel(form)}
          </div>
        </div>
        <div className="-mt-2 mb-4 flex justify-end">
          <StartOverButton />
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
          <div className="grid gap-3">
            <DeviceSelector value={form.device} onChange={setDevice} />
            {form.device === "custom" ? (
              <CustomSizeFields form={form} onChange={update} />
            ) : null}
          </div>
        ) : null}

        {step === 1 ? (
          form.device === "custom" ? (
            <CustomSizeFields form={form} onChange={update} />
          ) : (
            <OptionGrid
              options={ratioOptions[form.device]}
              value={form.ratio}
              getLabel={(option) => labels.ratios[option]}
              onChange={(ratio) => update("ratio", ratio)}
            />
          )
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
                  maxLength={300}
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
                {draft?.previewStatus === "ready"
                  ? "Your free preview is ready."
                  : "Ready to create preview"}
              </div>
              <div className="grid gap-2 text-sm text-taupe sm:grid-cols-2">
                <p>Device: {labels.devices[form.device]}</p>
                <p>Ratio: {getAspectRatioLabel(form)}</p>
                <p>Theme: {labels.themes[form.theme]}</p>
                <p>Style: {labels.styles[form.style]}</p>
              </div>
            </div>
            {draft?.previewStatus === "ready" && draft.previewImageUrl ? (
              <div className="rounded-2xl border border-gold/20 bg-white/70 p-4">
                <p className="text-sm leading-6 text-taupe">
                  You can review it, edit your answers, or unlock the full
                  wallpaper download.
                </p>
                <div className="mt-3 overflow-hidden rounded-2xl border border-white/70 bg-linen">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={draft.previewImageUrl}
                    alt="Generated wallpaper preview"
                    className="max-h-72 w-full object-cover"
                  />
                </div>
                <div className="mt-4 grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        checkoutHref(draft),
                      )
                    }
                    className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-medium text-pearl"
                  >
                    View Preview
                  </button>
                  <button
                    type="button"
                    onClick={editAnswers}
                    className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full border border-cocoa/10 bg-white/65 px-4 text-sm font-medium text-ink"
                  >
                    Edit Answers
                  </button>
                  <button
                    type="button"
                    onClick={startNewWallpaper}
                    className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full border border-cocoa/10 bg-white/65 px-4 text-sm font-medium text-ink"
                  >
                    Start New Wallpaper
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        checkoutHref(draft),
                      )
                    }
                    className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full bg-gold px-4 text-sm font-medium text-ink"
                  >
                    Unlock Full Wallpaper
                  </button>
                </div>
              </div>
            ) : null}
            {isGenerating || draft?.previewStatus === "generating" ? (
              <LoadingGeneration label="Creating your preview..." />
            ) : null}
            {draft?.previewStatus === "failed" && !isGenerating ? (
              <p className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                Preview generation failed. You can edit your answers and try
                again if your free preview is still available.
              </p>
            ) : null}
            {draft?.previewStatus === "not_started" &&
            policy.freePreviewUsed &&
            !isGenerating ? (
              <div className="rounded-2xl border border-gold/20 bg-[#f8f0df] p-4 text-sm text-cocoa">
                <p className="font-semibold text-ink">
                  You&apos;ve already used your free preview.
                </p>
                <p className="mt-1 leading-6">
                  You can still create a new wallpaper and unlock the full
                  version anytime.
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={editAnswers}
                    className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full border border-cocoa/10 bg-white/65 px-4 text-sm font-medium text-ink"
                  >
                    Edit Answers
                  </button>
                  <button
                    type="button"
                    onClick={startNewWallpaper}
                    className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full border border-cocoa/10 bg-white/65 px-4 text-sm font-medium text-ink"
                  >
                    Start New Wallpaper
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      router.push(
                        draft?.orderId
                          ? checkoutHref(draft)
                          : "/checkout",
                      )
                    }
                    className="focus-ring inline-flex min-h-10 items-center justify-center rounded-full bg-ink px-4 text-sm font-medium text-pearl"
                  >
                    Unlock Full Wallpaper
                  </button>
                </div>
              </div>
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
              {draft?.previewStatus === "ready"
                ? "View Preview"
                : policy.freePreviewUsed
                  ? "Unlock Full Wallpaper"
                  : "Generate Free Preview"}
            </button>
          )}
        </div>
      </section>

      <aside className="rounded-[1.75rem] border border-white/70 bg-white/45 p-4 shadow-sm backdrop-blur-xl">
        <div
          className={`mx-auto w-full overflow-hidden rounded-[1.5rem] border border-white/80 bg-linen p-3 shadow-soft ${
            form.device === "custom" ? "max-w-[250px]" : "max-w-[220px]"
          }`}
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
          <p>{getAspectRatioLabel(form)}</p>
          <p>{meta.imageSize}</p>
          {form.device === "custom" ? (
            <p className="text-gold">{getResolutionLabel(form)}</p>
          ) : null}
        </div>
      </aside>
    </form>
  );
}

function checkoutHref(draft: WallpaperDraft) {
  if (draft.orderToken) {
    return `/checkout?orderToken=${encodeURIComponent(draft.orderToken)}`;
  }

  return `/checkout?orderId=${encodeURIComponent(draft.orderId || "")}`;
}

type CustomSizeFieldsProps = {
  form: WallpaperInput;
  onChange: <K extends keyof WallpaperInput>(
    key: K,
    value: WallpaperInput[K],
  ) => void;
};

function CustomSizeFields({ form, onChange }: CustomSizeFieldsProps) {
  const issue = getCustomSizeIssue(form);

  function updateSize(key: "customWidth" | "customHeight", value: string) {
    const nextValue = Number(value);
    onChange(key, Number.isFinite(nextValue) ? nextValue : 0);
  }

  return (
    <div className="rounded-2xl border border-cocoa/10 bg-white/55 p-3">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ink">Custom size (max 4K)</p>
          <p className="mt-1 text-xs text-taupe">
            Use this if your device is not listed.
          </p>
        </div>
        <div className="group relative">
          <HelpCircle aria-hidden className="h-4 w-4 text-gold" />
          <div className="pointer-events-none absolute right-0 top-6 z-10 w-44 rounded-xl border border-cocoa/10 bg-white px-3 py-2 text-xs text-taupe opacity-0 shadow-sm transition group-hover:opacity-100">
            Max size is 4K (3840px).
          </div>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-cocoa">
            Width (px)
          </span>
          <input
            className="field"
            type="number"
            inputMode="numeric"
            min={512}
            max={3840}
            value={form.customWidth ?? 1200}
            onChange={(event) => updateSize("customWidth", event.target.value)}
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-xs font-semibold text-cocoa">
            Height (px)
          </span>
          <input
            className="field"
            type="number"
            inputMode="numeric"
            min={512}
            max={3840}
            value={form.customHeight ?? 1800}
            onChange={(event) => updateSize("customHeight", event.target.value)}
          />
        </label>
      </div>
      <p className={`mt-2 text-xs ${issue ? "text-red-700" : "text-taupe"}`}>
        {issue || `Calculated ratio: ${getAspectRatioLabel(form)}`}
      </p>
    </div>
  );
}

function getCustomSizeIssue(form: WallpaperInput) {
  if (form.device !== "custom") {
    return "";
  }

  const width = form.customWidth;
  const height = form.customHeight;

  if (
    typeof width !== "number" ||
    typeof height !== "number" ||
    !Number.isFinite(width) ||
    !Number.isFinite(height)
  ) {
    return "Enter a valid width and height.";
  }

  if (!width || !height || width < 512 || height < 512) {
    return "Custom size must be at least 512px on each side.";
  }

  if (width > 3840 || height > 3840) {
    return "Custom size cannot exceed 3840px on either side.";
  }

  return "";
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
