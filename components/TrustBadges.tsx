import { Lock, Mail, ShieldCheck, Sparkles } from "lucide-react";

const badges = [
  { icon: Lock, label: "Secure Stripe checkout" },
  { icon: ShieldCheck, label: "Server-side AI generation" },
  { icon: Mail, label: "Email delivery option" },
  { icon: Sparkles, label: "No frontend API keys" },
];

export function TrustBadges() {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {badges.map((badge) => (
        <div
          key={badge.label}
          className="flex items-center gap-2 rounded-2xl border border-cocoa/10 bg-white/55 px-3 py-2 text-xs font-medium text-cocoa"
        >
          <badge.icon aria-hidden className="h-4 w-4 text-gold" />
          {badge.label}
        </div>
      ))}
    </div>
  );
}
