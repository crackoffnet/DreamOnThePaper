const baseEditorialPrompt =
  "Real professional editorial photography, bright airy luxury lifestyle, warm ivory, cream, champagne beige, warm neutrals, soft morning sunlight, realistic shadows, elegant textures, minimal luxury, cinematic depth, breathable composition, believable premium atmosphere, no visible faces, no text, no logos, no watermarks, no collage blocks, no fantasy, no AI-art styling, no clutter, no neon, no oversaturation.";

export const exampleWallpapers = [
  {
    id: "wealth-business",
    title: "Modern workspace",
    phrase: "Create your future",
    mood: "Calm success",
    image: "/examples/wealth-business.jpg",
    alt: "Bright elegant modern workspace in a luxury apartment with a minimal desk, laptop, notebook, coffee cup, soft city view, and warm sunlight.",
    generationPrompt: `${baseEditorialPrompt} Bright elegant modern workspace inside a luxury apartment or home, large windows with soft city view, minimal desk, laptop, notebook, coffee cup, organized calm success atmosphere, luxury but believable, one main focal point, 2 to 4 subtle supporting elements.`,
  },
  {
    id: "family-home",
    title: "Warm connection",
    phrase: "What truly matters",
    mood: "Comfort and love",
    image: "/examples/family-home.jpg",
    alt: "Warm cozy luxury living room with a couple sitting together from behind, no visible faces, soft beige textures, and natural light.",
    generationPrompt: `${baseEditorialPrompt} Warm emotional family or couple atmosphere, couple sitting together from behind, no visible faces, bright cozy luxury living room, warm natural light, soft beige textures, emotional closeness, comfort and love, premium editorial realism.`,
  },
  {
    id: "nature-reset",
    title: "Peaceful bedroom",
    phrase: "Feel the peace",
    mood: "Quiet wellness",
    image: "/examples/nature-reset.jpg",
    alt: "Bright peaceful bedroom with soft linen bedding, natural morning light, minimal elegant interior, and a calm mountain or lake view.",
    generationPrompt: `${baseEditorialPrompt} Bright peaceful bedroom overlooking mountains, forest, or lake, soft linen bedding, natural morning light, minimal elegant interior, quiet emotional atmosphere, soft calm colors, luxury wellness feeling.`,
  },
  {
    id: "fitness-health",
    title: "Calm strength",
    phrase: "Step into strength",
    mood: "Balanced energy",
    image: "/examples/fitness-health.jpg",
    alt: "Bright luxury wellness space with a minimal yoga mat, light dumbbells, stone textures, natural light, and calm healthy energy.",
    generationPrompt: `${baseEditorialPrompt} Bright luxury wellness or workout atmosphere, minimal yoga mat or dumbbells, soft stone textures, healthy lifestyle energy, natural light, elegant minimal composition, calm strength instead of aggressive fitness mood.`,
  },
  {
    id: "freedom-travel",
    title: "Open horizon",
    phrase: "See more of the world",
    mood: "Freedom and movement",
    image: "/examples/freedom-travel.jpg",
    alt: "Luxury ocean terrace or coastline with an open horizon, elegant suitcase, minimal travel accessories, and warm sunlight.",
    generationPrompt: `${baseEditorialPrompt} Luxury ocean terrace or beautiful coastline, open horizon, travel atmosphere, elegant suitcase, minimal travel accessories, warm sunlight, open emotional composition, freedom and movement feeling.`,
  },
  {
    id: "soft-luxury",
    title: "Dream home",
    phrase: "Make it real",
    mood: "Future-life calm",
    image: "/examples/soft-luxury.jpg",
    alt: "Modern luxury dream home with warm elegant architecture, soft sunlight, minimal interior or outdoor scene, and subtle keys on a table.",
    generationPrompt: `${baseEditorialPrompt} Modern luxury dream home, warm elegant architecture, soft sunlight, minimal beautiful outdoor or indoor luxury scene, subtle keys on table, future-life atmosphere, luxury but believable.`,
  },
] as const;
