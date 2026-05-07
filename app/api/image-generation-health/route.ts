import { NextResponse } from "next/server";
import { getImageGenerationConfig } from "@/lib/imageGenerationConfig";

export function GET() {
  const config = getImageGenerationConfig();

  return NextResponse.json(
    {
      ok: true,
      previewModelConfigured: Boolean(config.preview.model),
      finalModelConfigured: Boolean(config.final.model),
      previewQuality: config.preview.quality,
      previewOutputFormat: config.preview.outputFormat,
      finalQuality: config.final.quality,
      finalOutputFormat: config.final.outputFormat,
      supportsBackgroundGeneration: true,
    },
    {
      headers: {
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      },
    },
  );
}
