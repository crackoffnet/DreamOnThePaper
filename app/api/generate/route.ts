import { NextResponse } from "next/server";
import { createMockWallpaperSvg } from "@/lib/mock";
import type { VisionFormData } from "@/lib/types";

export const runtime = "edge";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<VisionFormData>;
    const data = normalizeVisionData(body);
    const prompt = buildVisionPrompt(data);

    if (!process.env.OPENAI_API_KEY) {
      return NextResponse.json({
        imageUrl: createMockWallpaperSvg(data),
        prompt,
        mock: true,
      });
    }

    const imageSize = data.device === "mobile" ? "1024x1536" : "1536x1024";

    const openAiResponse = await fetch(
      "https://api.openai.com/v1/images/generations",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-1",
          prompt,
          size: imageSize,
          quality: "high",
          n: 1,
        }),
      },
    );

    if (!openAiResponse.ok) {
      throw new Error(`OpenAI image generation failed: ${openAiResponse.status}`);
    }

    const result = (await openAiResponse.json()) as {
      data?: Array<{ b64_json?: string; url?: string }>;
    };

    const generated = result.data?.[0];
    const imageUrl = generated?.b64_json
      ? `data:image/png;base64,${generated.b64_json}`
      : generated?.url;

    if (!imageUrl) {
      throw new Error("OpenAI did not return an image.");
    }

    return NextResponse.json({
      imageUrl,
      prompt,
      mock: false,
    });
  } catch (error) {
    console.error("Generate wallpaper error", error);
    return NextResponse.json(
      { error: "Unable to generate wallpaper. Please try again." },
      { status: 500 },
    );
  }
}

function normalizeVisionData(data: Partial<VisionFormData>): VisionFormData {
  return {
    goals: data.goals || "",
    lifestyle: data.lifestyle || "",
    career: data.career || "",
    relationships: data.relationships || "",
    feeling: data.feeling || "",
    travel: data.travel || "",
    health: data.health || "",
    keywords: data.keywords || "",
    quoteStyle: data.quoteStyle || "soft",
    reminder: data.reminder || "",
    device: data.device || "mobile",
    theme: data.theme || "light",
    style: data.style || "luxury",
  };
}

function buildVisionPrompt(data: VisionFormData) {
  const quote = buildQuote(data);

  return `Create a premium, elegant vision board wallpaper.
Theme: ${data.theme}
Device: ${data.device}
Style: ${data.style}
Include elements representing:
- Top 3 life goals: ${data.goals}
- Dream lifestyle: ${data.lifestyle}
- Career/business goals: ${data.career}
- Relationships: ${data.relationships}
- Desired daily feeling: ${data.feeling}
- Travel dreams: ${data.travel}
- Health goals: ${data.health}
- Keywords describing dream life: ${data.keywords}
Add a central motivational quote:
"${quote}"
Keep design minimal, aesthetic, not cluttered.
Use premium calm composition, soft gradients, warm neutrals, subtle texture, refined spacing.
No distorted faces. No text overload. Avoid bright colors.`;
}

function buildQuote(data: VisionFormData) {
  if (data.reminder.trim()) {
    return data.reminder.trim();
  }

  if (data.quoteStyle === "powerful") {
    return "I choose the life I am becoming.";
  }

  if (data.quoteStyle === "spiritual") {
    return "What is meant for me is already unfolding.";
  }

  return "Softly, steadily, I return to my vision.";
}
