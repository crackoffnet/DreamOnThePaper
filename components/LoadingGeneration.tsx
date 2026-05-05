import { Sparkles } from "lucide-react";

type LoadingGenerationProps = {
  label?: string;
};

export function LoadingGeneration({
  label = "Creating your wallpaper...",
}: LoadingGenerationProps) {
  return (
    <div className="rounded-2xl border border-gold/20 bg-white/70 p-4 text-sm font-medium text-cocoa">
      <div className="flex items-center gap-3">
        <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold">
          <span className="absolute h-8 w-8 animate-ping rounded-full bg-gold/20" />
          <Sparkles aria-hidden className="relative h-4 w-4" />
        </span>
        {label}
      </div>
      <div className="mt-4 space-y-2">
        <div className="h-2 overflow-hidden rounded-full bg-linen">
          <div className="h-full w-2/3 animate-pulse rounded-full bg-gold/55" />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="h-14 animate-pulse rounded-2xl bg-linen/80" />
          <div className="h-14 animate-pulse rounded-2xl bg-mist/80" />
          <div className="h-14 animate-pulse rounded-2xl bg-linen/80" />
        </div>
      </div>
    </div>
  );
}
