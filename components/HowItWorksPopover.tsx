export function HowItWorksPopover() {
  return (
    <details className="group relative hidden sm:block">
      <summary className="focus-ring flex cursor-pointer list-none rounded-full px-3 py-2 text-[12.5px] font-medium text-taupe transition hover:text-ink [&::-webkit-details-marker]:hidden">
        How it works
      </summary>
      <div className="absolute right-0 top-10 z-50 w-64 rounded-2xl border border-[rgba(180,160,130,0.22)] bg-pearl/95 p-4 text-[12px] font-light leading-5 text-taupe backdrop-blur-xl">
        <p className="font-medium text-ink">A simple visual ritual.</p>
        <ol className="mt-2 space-y-1.5">
          <li>Choose type, ratio, theme, and style.</li>
          <li>Complete your Dream Profile.</li>
          <li>Preview the cinematic direction free.</li>
          <li>Pay only when you want the final PNG.</li>
        </ol>
      </div>
    </details>
  );
}
