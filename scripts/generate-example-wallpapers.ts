import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { exampleWallpapers } from "../lib/exampleWallpapers";
import { getOpenAIImageSize } from "../lib/openaiImageSize";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
};

const prompts = {
  "soft-luxury":
    "Create a premium vertical phone wallpaper in soft cream, beige, and muted gold tones. Minimal elegant composition, quiet luxury mood, subtle abstract light shapes, negative space for app icons and website overlay text. No typography inside the image, no words, no letters, no logo, no text.",
  "wealth-business":
    "Create a premium vertical wallpaper with warm neutral tones, subtle desk/workspace abstraction, calm wealth energy, soft shadows, minimal gold details, lots of negative space for website overlay text. No typography inside the image, no words, no letters, no logo, no text.",
  "nature-reset":
    "Create a premium vertical wallpaper with sage green, cream, and soft natural textures, gentle botanical abstract shapes, calm growth feeling, lots of negative space for website overlay text. No typography inside the image, no words, no letters, no logo, no text.",
  "fitness-health":
    "Create a premium vertical wallpaper with warm beige, stone, and soft charcoal accents, clean strength mood, subtle movement shapes, calm energy, not sporty or loud, with negative space for website overlay text. No typography inside the image, no words, no letters, no logo, no text.",
  "family-home":
    "Create a premium vertical wallpaper with warm home tones, soft sunlight, gentle abstract house and family symbols, cozy but elegant, not childish, negative space for website overlay text. No typography inside the image, no words, no letters, no logo, no text.",
  "freedom-travel":
    "Create a premium vertical wallpaper with soft sky blue, cream, warm sand tones, abstract travel path and horizon feeling, airy composition, elegant minimal style, negative space for website overlay text. No typography inside the image, no words, no letters, no logo, no text.",
} satisfies Record<(typeof exampleWallpapers)[number]["id"], string>;

async function main() {
  if (!process.env.OPENAI_API_KEY) {
    console.error("OPENAI_API_KEY is required to generate examples.");
    process.exitCode = 1;
    return;
  }

  const outputDirectory = path.join(process.cwd(), "public", "examples");
  await mkdir(outputDirectory, { recursive: true });

  for (const example of exampleWallpapers) {
    console.log(`Generating ${example.title}...`);
    const response = await fetch("https://api.openai.com/v1/images/generations", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.OPENAI_IMAGE_MODEL || "gpt-image-2",
        prompt: prompts[example.id],
        size: getOpenAIImageSize(1024, 1536),
        quality: "high",
        output_format: "jpeg",
        output_compression: 82,
        moderation: "auto",
        n: 1,
      }),
    });

    if (!response.ok) {
      const body = await response.text();
      throw new Error(
        `OpenAI failed for ${example.title}: ${response.status} ${body}`,
      );
    }

    const result = (await response.json()) as OpenAIImageResponse;
    const imageBase64 = result.data?.[0]?.b64_json;

    if (!imageBase64) {
      throw new Error(`OpenAI did not return image data for ${example.title}.`);
    }

    const fileName = example.image.replace("/examples/", "");
    await writeFile(
      path.join(outputDirectory, fileName),
      Buffer.from(imageBase64, "base64"),
    );
  }

  console.log("Example wallpapers saved to public/examples/.");
}

main().catch((error) => {
  console.error(
    error instanceof Error
      ? error.message
      : "Unable to generate example wallpapers.",
  );
  process.exitCode = 1;
});
