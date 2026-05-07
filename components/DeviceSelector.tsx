"use client";

import { Monitor, Ruler, Smartphone, Tablet } from "lucide-react";
import type { DeviceType } from "@/lib/types";
import { labels } from "@/lib/wallpaper";

const deviceIcons = {
  mobile: Smartphone,
  desktop: Monitor,
  tablet: Tablet,
  custom: Ruler,
};

type DeviceSelectorProps = {
  value: DeviceType;
  onChange: (device: DeviceType) => void;
};

export function DeviceSelector({ value, onChange }: DeviceSelectorProps) {
  return (
    <div className="grid gap-2 sm:grid-cols-4">
      {(["mobile", "tablet", "desktop", "custom"] as const).map((device) => {
        const Icon = deviceIcons[device];
        const active = value === device;

        return (
          <button
            key={device}
            type="button"
            onClick={() => onChange(device)}
            className={`focus-ring rounded-2xl border p-4 text-left transition ${
              active
                ? "border-gold bg-white shadow-sm"
                : "border-cocoa/10 bg-white/55 hover:bg-white"
            }`}
          >
            <Icon aria-hidden className="mb-3 h-5 w-5 text-gold" />
            <span className="block text-sm font-semibold text-ink">
              {labels.devices[device]}
            </span>
          </button>
        );
      })}
    </div>
  );
}
