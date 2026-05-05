type LoaderProps = {
  label?: string;
};

export function Loader({ label = "Creating your wallpaper" }: LoaderProps) {
  return (
    <div className="flex items-center gap-3 text-sm text-taupe">
      <span className="relative flex h-4 w-4">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-gold opacity-40" />
        <span className="relative inline-flex h-4 w-4 rounded-full bg-gold" />
      </span>
      <span>{label}</span>
    </div>
  );
}
