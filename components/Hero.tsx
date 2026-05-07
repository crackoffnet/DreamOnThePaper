import {
  BadgeCheck,
  ArrowRight,
  Lock,
  MonitorSmartphone,
  ShieldCheck,
  WandSparkles,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";

const benefits = [
  { icon: BadgeCheck, label: "Free preview" },
  { icon: Lock, label: "Secure checkout" },
  { icon: MonitorSmartphone, label: "Phone, desktop, custom" },
  { icon: ShieldCheck, label: "Private by design" },
];

export function Hero() {
  return (
    <section className="px-4 pb-4 pt-4 sm:px-6 lg:pb-5">
      <div className="mx-auto grid max-w-6xl items-center gap-5 md:grid-cols-[1.08fr_0.92fr] lg:gap-8">
        <div className="max-w-2xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-white/60 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-[0.18em] text-gold">
            <WandSparkles aria-hidden className="h-3.5 w-3.5" />
            AI vision board wallpapers
          </div>
          <h1 className="max-w-[11ch] text-[2.65rem] font-semibold leading-[0.98] tracking-[-0.04em] text-ink sm:text-5xl lg:text-[3.85rem]">
            Create a wallpaper for the life you&apos;re becoming.
          </h1>
          <p className="mt-4 max-w-xl text-[15px] leading-7 text-taupe sm:text-base">
            Answer a few thoughtful prompts and generate a personalized phone,
            desktop, or custom wallpaper designed around your goals, mood, and
            future self.
          </p>
          <div className="mt-5 flex flex-col gap-2.5 sm:flex-row sm:items-center">
            <Link
              href="/create"
              className="focus-ring inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-ink px-6 text-sm font-medium text-pearl shadow-[0_18px_42px_rgba(41,38,33,0.16)] transition hover:-translate-y-0.5 hover:bg-cocoa sm:w-auto"
            >
              Create My Wallpaper
              <ArrowRight aria-hidden className="h-4 w-4" />
            </Link>
            <Link
              href="/#examples"
              className="focus-ring inline-flex min-h-12 w-full items-center justify-center rounded-full px-5 text-sm font-medium text-cocoa transition hover:text-ink sm:w-auto"
            >
              View Examples
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-2 text-xs text-cocoa sm:flex sm:flex-wrap sm:items-center sm:gap-x-4">
            {benefits.map((item) => (
              <div
                key={item.label}
                className="flex items-center gap-1.5 whitespace-nowrap text-[12px]"
              >
                <item.icon aria-hidden className="h-3.5 w-3.5 text-gold" />
                {item.label}
              </div>
            ))}
          </div>
        </div>

        <div className="relative min-h-[265px] overflow-hidden rounded-[1.65rem] border border-white/70 bg-[linear-gradient(145deg,rgba(255,252,246,.92),rgba(224,211,192,.5))] p-3 shadow-[0_22px_65px_rgba(59,49,38,0.12)] sm:min-h-[315px] lg:min-h-[340px]">
          <div className="absolute right-4 top-8 w-[72%] rounded-[1.2rem] border border-white/80 bg-white/55 p-1.5 shadow-[0_18px_55px_rgba(59,49,38,0.12)] sm:right-6 sm:top-9">
            <div className="relative aspect-video overflow-hidden rounded-[0.9rem] bg-linen">
              <Image
                src="/examples/wealth-business.jpg"
                alt="Wealth business desktop wallpaper preview"
                fill
                priority
                sizes="(min-width: 768px) 460px, 82vw"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/26 via-transparent to-transparent" />
            </div>
            <div className="mt-2 flex items-center justify-between px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-taupe">
              <span>Desktop</span>
              <span>16:9</span>
            </div>
          </div>

          <div className="absolute bottom-5 left-5 w-[32%] min-w-[106px] rounded-[1.45rem] border border-white/80 bg-[#f7efe3]/80 p-1.5 shadow-[0_20px_60px_rgba(59,49,38,0.18)] backdrop-blur-md sm:bottom-6 sm:left-8">
            <div className="relative aspect-[9/16] overflow-hidden rounded-[1rem] bg-linen">
              <Image
                src="/examples/soft-luxury.jpg"
                alt="Soft luxury AI wallpaper preview"
                fill
                priority
                sizes="180px"
                className="object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/30 via-transparent to-white/5" />
            </div>
            <div className="mt-2 px-1 text-[10px] font-medium uppercase tracking-[0.16em] text-taupe">
              Mobile
            </div>
          </div>

          <div className="absolute bottom-5 right-5 rounded-full border border-white/70 bg-pearl/78 px-3 py-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-cocoa shadow-sm backdrop-blur-md">
              Custom size
          </div>
        </div>
      </div>
    </section>
  );
}
