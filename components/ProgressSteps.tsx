type ProgressStepsProps = {
  steps: string[];
  currentStep: number;
};

export function ProgressSteps({ steps, currentStep }: ProgressStepsProps) {
  return (
    <div className="grid gap-1" aria-label="Progress">
      <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => (
          <div
            key={step}
            className={`h-1.5 rounded-full ${
              index <= currentStep ? "bg-gold" : "bg-cocoa/10"
            }`}
            title={step}
          />
        ))}
      </div>
    </div>
  );
}
