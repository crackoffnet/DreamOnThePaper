import { Sparkles } from "lucide-react";

type LoadingGenerationProps = {
  label?: string;
  title?: string;
  description?: string;
  steps?: string[];
};

export function LoadingGeneration({
  label = "Creating your wallpaper...",
  title,
  description,
  steps,
}: LoadingGenerationProps) {
  const resolvedSteps =
    steps && steps.length > 0
      ? steps
      : ["Rendering image", "Saving final file", "Preparing download"];

  return (
    <div className="rounded-2xl border border-gold/20 bg-white/70 p-4 text-sm font-medium text-cocoa">
      <div className="flex items-center gap-3">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold">
          <span className="absolute h-8 w-8 animate-ping rounded-full bg-gold/20" />
          <Sparkles aria-hidden className="relative h-4 w-4" />
        </span>
        {title || label}
      </div>
      {description ? <p className="mt-2 text-sm font-normal leading-6 text-taupe">{description}</p> : null}
      <div className="mt-4 space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-linen">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-gold/55" />
        </div>
        <div className="grid gap-2 sm:grid-cols-3">
          {resolvedSteps.map((step, index) => (
            <div
              key={step}
              className={`rounded-2xl px-3 py-3 text-xs font-medium ${
                index === 1 ? "bg-mist/80" : "bg-linen/80"
              }`}
            >
              {step}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
