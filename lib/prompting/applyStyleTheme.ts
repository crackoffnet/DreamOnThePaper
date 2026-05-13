import type { ThemeType, WallpaperStyle } from "@/lib/types";

export type StyleThemePlan = {
  styleName: string;
  mood: string;
  visualDirection: string;
  palette: string;
  themeModifier: string;
};

const stylePlans: Record<WallpaperStyle, Omit<StyleThemePlan, "themeModifier">> = {
  "soft-luxury": {
    styleName: "Soft Luxury",
    mood: "warm calm abundance",
    visualDirection:
      "cream, ivory, beige, soft sunlight, peaceful luxury interiors",
    palette: "ivory, champagne, warm beige, soft taupe",
  },
  minimal: {
    styleName: "Minimal",
    mood: "quiet modern simplicity",
    visualDirection:
      "clean composition, few objects, breathing room, soft neutrals, calm architecture",
    palette: "ivory, warm gray, muted beige, soft black accents",
  },
  dreamy: {
    styleName: "Dreamy",
    mood: "soft emotional future",
    visualDirection:
      "hazy sunlight, romantic glow, gentle softness, dreamlike calmness",
    palette: "warm ivory, pale gold, muted blush, soft haze",
  },
  nature: {
    styleName: "Nature",
    mood: "grounded peaceful freedom",
    visualDirection: "forest, mountains, ocean, sage green, earth tones",
    palette: "sage, stone, ivory, muted earth tones",
  },
  feminine: {
    styleName: "Feminine",
    mood: "soft elegant beauty",
    visualDirection:
      "champagne, dusty rose, warm mocha, soft textures, editorial elegance",
    palette: "champagne, dusty rose, warm mocha, ivory",
  },
  "wealth-business": {
    styleName: "Wealth / Business",
    mood: "focused elegant ambition",
    visualDirection:
      "refined workspace, organized success, premium office atmosphere, calm luxury",
    palette: "warm black, champagne gold, espresso, ivory",
  },
  "family-home": {
    styleName: "Family / Home",
    mood: "warm lasting love",
    visualDirection: "cozy interiors, family warmth, kitchen light, home atmosphere",
    palette: "cream, honey wood, linen, warm shadow",
  },
  "fitness-health": {
    styleName: "Fitness / Health",
    mood: "balanced strong energy",
    visualDirection:
      "morning light, wellness atmosphere, movement, healthy calmness",
    palette: "ivory, stone, fresh green, warm sunlight",
  },
  "freedom-travel": {
    styleName: "Freedom / Travel",
    mood: "open life movement",
    visualDirection:
      "terrace, ocean, mountains, open horizon, travel atmosphere",
    palette: "sunlit stone, ocean blue, warm ivory, muted sky",
  },
};

export function applyStyleTheme(
  style: WallpaperStyle,
  theme: ThemeType,
): StyleThemePlan {
  const plan = stylePlans[style];
  return {
    ...plan,
    themeModifier:
      theme === "dark"
        ? "cinematic, espresso, charcoal, warm highlights; premium but still calm and readable behind icons"
        : "airy, warm, soft sunlight, bright neutrals; premium but never washed out",
  };
}

export function getStyleMood(style: WallpaperStyle) {
  return stylePlans[style].mood;
}
