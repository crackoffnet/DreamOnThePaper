import { z } from "zod";
import { wallpaperProductIds } from "@/lib/wallpaperProducts";
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
      return;
    }

    if (input.customWidth * input.customHeight > 3840 * 2160) {
      context.addIssue({
        code: "custom",
        message:
          "Custom size is too large. Keep total pixels at or below 3840 x 2160.",
        path: ["customWidth"],
      });
    }
  });

export const previewGenerationSchema = wallpaperInputSchema.extend({
  previewSessionId: z.string().min(16).max(120),
});

export const checkoutSchema = z.object({
  wallpaperType: z.enum(wallpaperProductIds).optional(),
  packageType: z.string().max(40).optional(),
  orderId: z.string().min(8).max(120).optional(),
  orderToken: z.string().min(24).max(12000).optional(),
  orderSnapshotToken: z.string().min(24).max(12000).optional(),
  website: z.string().max(0).optional().or(z.literal("")),
}).refine((input) => Boolean(input.orderId || input.orderToken), {
  message: "Create your preview first.",
  path: ["orderId"],
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
  finalGenerationToken: z.string().min(24).max(12000).optional(),
  resultAccessToken: z.string().min(24).max(12000).optional(),
  website: z.string().max(0).optional().or(z.literal("")),
}).refine((input) => Boolean(input.finalGenerationToken || input.resultAccessToken), {
  message: "Missing paid result access token.",
  path: ["resultAccessToken"],
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
