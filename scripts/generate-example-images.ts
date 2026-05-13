import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { exampleWallpapers } from "../lib/exampleWallpapers";

type OpenAIImageResponse = {
  data?: Array<{ b64_json?: string }>;
};

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
        model: process.env.OPENAI_EXAMPLE_IMAGE_MODEL || "gpt-image-1",
        prompt: example.generationPrompt,
        size: "1536x1024",
        quality: "medium",
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
