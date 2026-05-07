const values = [
  "Choose a mood",
  "Answer thoughtful prompts",
  "Preview free",
  "Download your final PNG",
];

export function ValueStrip() {
  return (
    <section className="px-4 py-2 sm:px-6">
      <div className="mx-auto max-w-6xl border-y border-cocoa/10 py-2.5">
        <p className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-[11px] font-medium uppercase tracking-[0.15em] text-cocoa/75 sm:text-xs">
          {values.map((item) => (
            <span key={item} className="inline-flex items-center gap-2">
              <span>{item}</span>
              {item !== values[values.length - 1] ? (
                <span aria-hidden className="text-gold/70">
                  /
                </span>
              ) : null}
            </span>
          ))}
        </p>
      </div>
    </section>
  );
}
