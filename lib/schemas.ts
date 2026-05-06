import { z } from "zod";
import { packageIds } from "@/lib/plans";
import {
  devices,
  isValidRatioForDevice,
  quoteTones,
  ratioOptions,
  styles,
  themes,
} from "@/lib/wallpaper";

const textField = z
  .string()
  .max(300)
  .transform((value) =>
    value
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

export const wallpaperInputSchema = z
  .object({
    device: z.enum(devices),
    ratio: z.union([
      z.enum(ratioOptions.mobile),
      z.enum(ratioOptions.desktop),
      z.enum(ratioOptions.tablet),
      z.enum(ratioOptions.custom),
    ]),
    theme: z.enum(themes),
    style: z.enum(styles),
    goals: textField,
    lifestyle: textField,
    career: textField,
    personalLife: textField,
    health: textField,
    place: textField,
    feelingWords: textField,
    reminder: textField,
    quoteTone: z.enum(quoteTones),
    customWidth: z.number().int().min(512).max(3840).optional(),
    customHeight: z.number().int().min(512).max(3840).optional(),
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((input, context) => {
    const totalInputLength = [
      input.goals,
      input.lifestyle,
      input.career,
      input.personalLife,
      input.health,
      input.place,
      input.feelingWords,
      input.reminder,
    ].join(" ").length;

    if (totalInputLength > 1800) {
      context.addIssue({
        code: "custom",
        message: "Please shorten your answers before generating.",
        path: ["goals"],
      });
    }

    if (!isValidRatioForDevice(input.device, input.ratio)) {
      context.addIssue({
        code: "custom",
        message: "Please choose a valid size for your device.",
        path: ["ratio"],
      });
    }

    if (input.device !== "custom") {
      return;
    }

    if (
      input.ratio !== "custom" ||
      typeof input.customWidth !== "number" ||
      typeof input.customHeight !== "number"
    ) {
      context.addIssue({
        code: "custom",
        message: "Please enter a custom width and height between 512 and 3840px.",
        path: ["customWidth"],
      });
    }
  });

export const previewGenerationSchema = wallpaperInputSchema.extend({
  previewSessionId: z.string().min(16).max(120),
});

export const checkoutSchema = z.object({
  packageId: z.enum(packageIds),
  wallpaperInput: wallpaperInputSchema,
  website: z.string().max(0).optional().or(z.literal("")),
});

export const orderTokenSchema = z.object({
  orderToken: z.string().min(24).max(12000),
});

export const generateWallpaperSchema = wallpaperInputSchema.extend({
  orderToken: z.string().min(24).max(12000).optional(),
});

export const verifyPaymentSchema = z
  .object({
    sessionId: z.string().min(8).max(300).optional(),
    session_id: z.string().min(8).max(300).optional(),
    orderSnapshotToken: z.string().min(24).max(12000).optional(),
  })
  .transform((input) => ({
    sessionId: input.sessionId || input.session_id || "",
    orderSnapshotToken: input.orderSnapshotToken || "",
  }))
  .refine((input) => input.sessionId.length >= 8, {
    message: "Missing payment session.",
    path: ["session_id"],
  });

export const emailWallpaperSchema = z.object({
  email: z.string().email().max(254),
  imageUrl: z.string().min(40).max(8_000_000),
  orderToken: z.string().min(24).max(12000).optional(),
  website: z.string().max(0).optional().or(z.literal("")),
});

export function hasMeaningfulInput(input: z.infer<typeof wallpaperInputSchema>) {
  const joined = [
    input.goals,
    input.lifestyle,
    input.career,
    input.personalLife,
    input.health,
    input.place,
    input.feelingWords,
    input.reminder,
  ].join(" ");

  return joined.replace(/\s/g, "").length >= 12;
}

export function containsAbusiveInput(value: string) {
  const lower = value.toLowerCase();
  const blocked = [
    "kill ",
    "murder",
    "terrorist",
    "sexualize",
    "nude child",
    "child nude",
    "self harm",
    "suicide",
  ];

  return blocked.some((term) => lower.includes(term));
}
