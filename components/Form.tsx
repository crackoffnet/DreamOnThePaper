"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles } from "lucide-react";
import type { GenerateResponse, VisionFormData } from "@/lib/types";

const initialForm: VisionFormData = {
  goals: "",
  lifestyle: "",
  career: "",
  relationships: "",
  feeling: "",
  travel: "",
  health: "",
  keywords: "",
  quoteStyle: "soft",
  reminder: "",
  device: "mobile",
  theme: "light",
  style: "luxury",
};

const fields = [
  {
    name: "goals",
    label: "Top 3 life goals",
    placeholder: "Buy a home, build creative freedom, feel deeply healthy...",
  },
  {
    name: "lifestyle",
    label: "Dream lifestyle",
    placeholder: "Slow mornings, beautiful workspace, time for family...",
  },
  {
    name: "career",
    label: "Career/business goals",
    placeholder: "Launch a studio, grow a calm online business...",
  },
  {
    name: "relationships",
    label: "Relationships",
    placeholder: "Supportive partnership, close friendships, chosen family...",
  },
  {
    name: "feeling",
    label: "Desired daily feeling",
    placeholder: "Clear, magnetic, grounded, abundant...",
  },
  {
    name: "travel",
    label: "Travel dreams",
    placeholder: "Paris, ocean villas, mountain retreats...",
  },
  {
    name: "health",
    label: "Health goals",
    placeholder: "Strong body, glowing skin, peaceful sleep...",
  },
  {
    name: "keywords",
    label: "Keywords describing dream life",
    placeholder: "gold, linen, ocean, clarity, love, freedom",
  },
] as const;

export function Form() {
  const router = useRouter();
  const [form, setForm] = useState<VisionFormData>(initialForm);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  function updateField<K extends keyof VisionFormData>(
    key: K,
    value: VisionFormData[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const data = (await response.json()) as Partial<GenerateResponse> & {
        error?: string;
      };

      if (!response.ok || !data.imageUrl) {
        throw new Error(data.error || "We couldn't generate your wallpaper.");
      }

      localStorage.setItem("dreamWallpaper", data.imageUrl);
      localStorage.setItem("dreamWallpaperPrompt", data.prompt || "");
      router.push("/checkout");
    } catch (generateError) {
      setError(
        generateError instanceof Error
          ? generateError.message
          : "We couldn't generate your wallpaper.",
      );
      setIsLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="glass rounded-[2rem] p-5 sm:p-8">
      <div className="mb-8 flex items-start gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gold/15 text-gold">
          <Sparkles aria-hidden className="h-5 w-5" />
        </div>
        <div>
          <h1 className="text-3xl font-semibold tracking-[-0.02em] text-ink sm:text-4xl">
            Create your wallpaper
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-taupe sm:text-base">
            Share the shape of the life you’re building. We’ll turn it into a
            calm, premium vision board wallpaper.
          </p>
        </div>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        {fields.map((field) => (
          <label key={field.name} className="block">
            <span className="mb-2 block text-sm font-medium text-cocoa">
              {field.label}
            </span>
            <textarea
              className="field min-h-28 resize-y"
              required={field.name === "goals"}
              placeholder={field.placeholder}
              value={form[field.name]}
              onChange={(event) => updateField(field.name, event.target.value)}
            />
          </label>
        ))}

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-cocoa">
            Quote style
          </span>
          <select
            className="select-field"
            value={form.quoteStyle}
            onChange={(event) =>
              updateField(
                "quoteStyle",
                event.target.value as VisionFormData["quoteStyle"],
              )
            }
          >
            <option value="soft">Soft</option>
            <option value="powerful">Powerful</option>
            <option value="spiritual">Spiritual</option>
          </select>
        </label>

        <label className="block">
          <span className="mb-2 block text-sm font-medium text-cocoa">
            Reminder message
          </span>
          <input
            className="field"
            placeholder="The sentence you want to see every day"
            value={form.reminder}
            onChange={(event) => updateField("reminder", event.target.value)}
          />
        </label>
      </div>

      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <SegmentedControl
          label="Device"
          value={form.device}
          options={["mobile", "desktop"]}
          onChange={(value) =>
            updateField("device", value as VisionFormData["device"])
          }
        />
        <SegmentedControl
          label="Theme"
          value={form.theme}
          options={["light", "dark"]}
          onChange={(value) =>
            updateField("theme", value as VisionFormData["theme"])
          }
        />
        <SegmentedControl
          label="Style"
          value={form.style}
          options={["minimalist", "luxury", "dreamy", "nature"]}
          onChange={(value) =>
            updateField("style", value as VisionFormData["style"])
          }
        />
      </div>

      {error ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      ) : null}

      <div className="mt-8 flex flex-col items-start gap-4 sm:flex-row sm:items-center">
        <button
          type="submit"
          disabled={isLoading}
          className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-7 text-sm font-medium text-pearl shadow-soft transition hover:-translate-y-0.5 hover:bg-cocoa disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
        >
          {isLoading ? (
            <Loader2 aria-hidden className="h-4 w-4 animate-spin" />
          ) : null}
          Generate My Wallpaper
        </button>
        <p className="text-sm text-taupe">
          Generation uses OpenAI when configured, otherwise a polished mock.
        </p>
      </div>
    </form>
  );
}

type SegmentedControlProps = {
  label: string;
  value: string;
  options: string[];
  onChange: (value: string) => void;
};

function SegmentedControl({
  label,
  value,
  options,
  onChange,
}: SegmentedControlProps) {
  return (
    <div>
      <span className="mb-2 block text-sm font-medium text-cocoa">{label}</span>
      <div className="grid gap-2 rounded-2xl border border-cocoa/10 bg-white/55 p-2">
        {options.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={`focus-ring min-h-10 rounded-xl px-3 text-sm capitalize transition ${
              value === option
                ? "bg-ink text-pearl shadow-sm"
                : "text-taupe hover:bg-white"
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  );
}
