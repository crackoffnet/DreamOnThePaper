import { Sparkles } from "lucide-react";

type LoadingGenerationProps = {
  label?: string;
};

export function LoadingGeneration({
  label = "Creating your wallpaper...",
}: LoadingGenerationProps) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-gold/20 bg-white/70 px-4 py-3 text-sm font-medium text-cocoa">
      <span className="relative flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold">
        <span className="absolute h-8 w-8 animate-ping rounded-full bg-gold/20" />
        <Sparkles aria-hidden className="relative h-4 w-4" />
      </span>
      {label}
    </div>
  );
}
