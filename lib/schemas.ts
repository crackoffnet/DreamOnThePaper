import { z } from "zod";
import { wallpaperProductIds } from "@/lib/wallpaperProducts";
import { devices, isValidRatioForDevice, ratioOptions, styles, themes } from "@/lib/wallpaper";
import {
  dreamProfileQuestions,
  emptyVisualOnlyDreamProfile,
  hasMeaningfulDreamProfile,
  sanitizeDreamProfile,
} from "@/lib/visualDreamProfile";

const textField = z
  .string()
  .max(500)
  .transform((value) =>
    value
      .replace(/[\u0000-\u001F\u007F]/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );

const stringArrayField = z.array(z.string().max(120)).max(6);

export const dreamProfileSchema = z
  .object({
    futureLife: stringArrayField,
    futureLifeOther: textField.optional().default(""),
    currentGoals: stringArrayField,
    currentGoalsOther: textField.optional().default(""),
    desiredFeelings: stringArrayField,
    desiredFeelingsOther: textField.optional().default(""),
    dreamScenes: stringArrayField,
    dreamScenesOther: textField.optional().default(""),
    dreamEnvironment: stringArrayField,
    dreamEnvironmentOther: textField.optional().default(""),
    successType: stringArrayField,
    successTypeOther: textField.optional().default(""),
    colorMood: stringArrayField,
    colorMoodOther: textField.optional().default(""),
    visualStyle: stringArrayField,
    visualStyleOther: textField.optional().default(""),
    compositionStyle: stringArrayField,
    compositionStyleOther: textField.optional().default(""),
    deviceType: z.array(z.string().max(120)).max(3),
    deviceTypeOther: textField.optional().default(""),
    customNotes: textField.optional().default(""),
  })
  .transform((profile) => sanitizeDreamProfile({ ...emptyVisualOnlyDreamProfile, ...profile }))
  .superRefine((profile, context) => {
    for (const question of dreamProfileQuestions) {
      const values = profile[question.id];
      if (values.length < question.minSelections || values.length > question.maxSelections) {
        context.addIssue({
          code: "custom",
          message: `Choose ${question.minSelections}-${question.maxSelections} options.`,
          path: [question.id],
        });
      }

      if (
        values.includes("Other") &&
        !String(profile[question.otherKey] || "").trim()
      ) {
        context.addIssue({
          code: "custom",
          message: "Add a short note for Other.",
          path: [question.otherKey as string],
        });
      }
    }
  });

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
    dreamProfile: dreamProfileSchema,
    goals: textField.default(""),
    lifestyle: textField.default(""),
    career: textField.default(""),
    personalLife: textField.default(""),
    health: textField.default(""),
    place: textField.default(""),
    feelingWords: textField.default(""),
    reminder: textField.default(""),
    quoteTone: z.string().max(40).optional().default("none"),
    customWidth: z.number().int().min(512).max(3840).optional(),
    customHeight: z.number().int().min(512).max(3840).optional(),
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .superRefine((input, context) => {
    if (!hasMeaningfulDreamProfile(input.dreamProfile)) {
      context.addIssue({
        code: "custom",
        message: "Please complete the dream profile before generating.",
        path: ["dreamProfile"],
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

export const checkoutSchema = z
  .object({
    wallpaperType: z.enum(wallpaperProductIds).optional(),
    packageType: z.string().max(40).optional(),
    orderId: z.string().min(8).max(120).optional(),
    orderToken: z.string().min(24).max(12000).optional(),
    orderSnapshotToken: z.string().min(24).max(12000).optional(),
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .refine((input) => Boolean(input.orderId || input.orderToken), {
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

export const emailWallpaperSchema = z
  .object({
    email: z.string().email().max(254),
    finalGenerationToken: z.string().min(24).max(12000).optional(),
    resultAccessToken: z.string().min(24).max(12000).optional(),
    website: z.string().max(0).optional().or(z.literal("")),
  })
  .refine((input) => Boolean(input.finalGenerationToken || input.resultAccessToken), {
    message: "Missing paid result access token.",
    path: ["resultAccessToken"],
  });

export function hasMeaningfulInput(input: z.infer<typeof wallpaperInputSchema>) {
  return hasMeaningfulDreamProfile(input.dreamProfile);
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
