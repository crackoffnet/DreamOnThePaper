import {
  BadgeCheck,
  CreditCard,
  MonitorSmartphone,
  Sparkles,
} from "lucide-react";

const values = [
  { icon: Sparkles, label: "Personalized prompts" },
  { icon: BadgeCheck, label: "Free preview before purchase" },
  { icon: CreditCard, label: "Secure checkout" },
  { icon: MonitorSmartphone, label: "Mobile, desktop, custom sizes" },
];

export function ValueStrip() {
  return (
    <section className="px-4 py-3 sm:px-6">
      <div className="mx-auto max-w-6xl border-y border-cocoa/10 py-3">
        <div className="grid grid-cols-2 gap-x-3 gap-y-2 md:grid-cols-4">
          {values.map((item) => (
            <div
              key={item.label}
              className="flex items-center gap-2 text-[12px] font-medium text-cocoa sm:text-sm"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-gold/20 bg-white/55 text-gold">
                <item.icon aria-hidden className="h-3.5 w-3.5" />
              </span>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
