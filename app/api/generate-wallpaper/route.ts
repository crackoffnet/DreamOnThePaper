import { NextResponse } from "next/server";
import { createMockWallpaperSvg } from "@/lib/mock";
import type {
  DeviceType,
  QuoteTone,
  RatioType,
  ThemeType,
  WallpaperInput,
  WallpaperStyle,
} from "@/lib/types";
import {
  buildWallpaperPrompt,
  defaultWallpaperInput,
  devices,
  getWallpaperMeta,
  isValidRatioForDevice,
  quoteTones,
  ratioOptions,
  styles,
  themes,
} from "@/lib/wallpaper";

const MAX_FIELD_LENGTH = 360;
const MIN_MEANINGFUL_CHARS = 12;
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 4;
const rateLimitStore = new Map<string, { count: number; resetAt: number }>();

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string; url?: string }>;
};

export async function POST(request: Request) {
  try {
    const rateLimit = checkRateLimit(getClientIp(request));
    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many requests. Please wait a moment and try again." },
        { status: 429 },
      );
    }

    const body = await request.json().catch(() => null);
    const validation = validateWallpaperInput(body);
    if (!validation.ok) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    const input = validation.input;
    const meta = getWallpaperMeta(input);
    const prompt = buildWallpaperPrompt(input);

    if (!process.env.OPENAI_API_KEY) {
      if (process.env.NODE_ENV === "production") {
        return NextResponse.json(
          { error: "Image generation is not configured yet." },
          { status: 503 },
        );
      }

      return NextResponse.json({
        imageUrl: createMockWallpaperSvg(input),
        meta,
        mock: true,
      });
    }

    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1.5",
        prompt,
        size: meta.imageSize,
        quality: "medium",
        output_format: "png",
        moderation: "auto",
        n: 1,
      }),
    });

    if (!response.ok) {
      if (process.env.NODE_ENV !== "production") {
        console.error("OpenAI image generation failed", response.status);
      }

      return NextResponse.json(
        { error: "We could not create your wallpaper right now. Please try again." },
        { status: 502 },
      );
    }

    const result = (await response.json()) as OpenAIImageResponse;
    const image = result.data?.[0];
    const imageUrl = image?.b64_json
      ? `data:image/png;base64,${image.b64_json}`
      : image?.url;

    if (!imageUrl) {
      return NextResponse.json(
        { error: "The image service did not return a wallpaper. Please try again." },
        { status: 502 },
      );
    }

    return NextResponse.json({ imageUrl, meta, mock: false });
  } catch (error) {
    if (process.env.NODE_ENV !== "production") {
      console.error("Wallpaper generation error", error);
    }

    return NextResponse.json(
      { error: "Unable to create your wallpaper. Please try again." },
      { status: 500 },
    );
  }
}

function validateWallpaperInput(value: unknown):
  | { ok: true; input: WallpaperInput }
  | { ok: false; error: string } {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "Please complete the wallpaper form." };
  }

  const raw = value as Partial<Record<keyof WallpaperInput, unknown>>;
  const device = enumValue(raw.device, devices, defaultWallpaperInput.device);
  const ratio = enumValue(
    raw.ratio,
    ratioOptions[device],
    ratioOptions[device][0],
  );

  const input: WallpaperInput = {
    device,
    ratio,
    theme: enumValue(raw.theme, themes, defaultWallpaperInput.theme),
    style: enumValue(raw.style, styles, defaultWallpaperInput.style),
    goals: cleanText(raw.goals),
    lifestyle: cleanText(raw.lifestyle),
    career: cleanText(raw.career),
    personalLife: cleanText(raw.personalLife),
    health: cleanText(raw.health),
    place: cleanText(raw.place),
    feelingWords: cleanText(raw.feelingWords),
    reminder: cleanText(raw.reminder),
    quoteTone: enumValue(raw.quoteTone, quoteTones, defaultWallpaperInput.quoteTone),
  };

  if (!isValidRatioForDevice(input.device, input.ratio)) {
    return { ok: false, error: "Please choose a valid size for your device." };
  }

  const meaningfulText = [
    input.goals,
    input.lifestyle,
    input.career,
    input.personalLife,
    input.health,
    input.place,
    input.feelingWords,
    input.reminder,
  ].join(" ");

  if (meaningfulText.replace(/\s/g, "").length < MIN_MEANINGFUL_CHARS) {
    return { ok: false, error: "Please add a little more detail first." };
  }

  if (containsAbusiveInput(meaningfulText)) {
    return {
      ok: false,
      error: "Please keep the wallpaper request safe and respectful.",
    };
  }

  return { ok: true, input };
}

function enumValue<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return typeof value === "string" && allowed.includes(value as T)
    ? (value as T)
    : fallback;
}

function cleanText(value: unknown) {
  if (typeof value !== "string") {
    return "";
  }

  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_FIELD_LENGTH);
}

function containsAbusiveInput(value: string) {
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

function getClientIp(request: Request) {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "anonymous"
  );
}

function checkRateLimit(key: string) {
  const now = Date.now();
  const current = rateLimitStore.get(key);

  if (!current || current.resetAt <= now) {
    rateLimitStore.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true };
  }

  if (current.count >= RATE_LIMIT_MAX) {
    return { allowed: false };
  }

  current.count += 1;
  return { allowed: true };
}
