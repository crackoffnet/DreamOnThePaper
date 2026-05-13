import type { VisualOnlyDreamProfile } from "@/lib/visualDreamProfile";
import { getDreamProfileSections } from "@/lib/visualDreamProfile";

export type VisualCategory = "SUCCESS" | "FREEDOM" | "LOVE" | "HEALTH" | "PEACE" | "CONFIDENCE";

export type VisualMapping = {
  categories: VisualCategory[];
  architecture: string[];
  lighting: string[];
  atmosphere: string[];
  textures: string[];
  subtleDetails: string[];
};

const categoryMap: Record<VisualCategory, Omit<VisualMapping, "categories">> = {
  SUCCESS: {
    architecture: ["elegant workspace", "organized environment", "premium architecture"],
    lighting: ["warm highlights", "composed editorial shadows"],
    atmosphere: ["calm luxury", "focused ambition"],
    textures: ["stone", "dark wood", "brushed metal"],
    subtleDetails: ["closed laptop", "neatly placed notebook", "refined desk detail"],
  },
  FREEDOM: {
    architecture: ["terrace", "open horizon", "wide architectural opening"],
    lighting: ["golden hour", "expansive natural light"],
    atmosphere: ["open life movement", "quiet possibility"],
    textures: ["linen", "sea air haze", "sun-warmed stone"],
    subtleDetails: ["distant ocean", "mountain view", "travel hint"],
  },
  LOVE: {
    architecture: ["warm home atmosphere", "shared living space", "soft kitchen light"],
    lighting: ["gentle window light", "warm interior glow"],
    atmosphere: ["emotional warmth", "lasting belonging"],
    textures: ["soft upholstery", "wood", "ceramic"],
    subtleDetails: ["two cups", "open doorway", "implied family presence"],
  },
  HEALTH: {
    architecture: ["wellness corner", "morning room", "calm open space"],
    lighting: ["morning light", "clean natural highlights"],
    atmosphere: ["balanced strong energy", "restorative movement"],
    textures: ["cotton", "matte stone", "fresh greenery"],
    subtleDetails: ["rolled mat", "water glass", "sunlit floor"],
  },
  PEACE: {
    architecture: ["minimal interior", "quiet room", "natural-light space"],
    lighting: ["soft diffused light", "gentle shadows"],
    atmosphere: ["quiet calm", "breathing room"],
    textures: ["linen", "limewash", "soft wool"],
    subtleDetails: ["curtains moving softly", "ceramic vase", "empty restful space"],
  },
  CONFIDENCE: {
    architecture: ["strong clean structure", "elevated perspective", "orderly composition"],
    lighting: ["clear directional light", "warm dimensional highlights"],
    atmosphere: ["self-possessed", "steady"],
    textures: ["smooth stone", "glass", "tailored fabric"],
    subtleDetails: ["clean architectural lines", "open pathway", "intentional symmetry"],
  },
};

export function mapProfileToVisualLanguage(
  profile: VisualOnlyDreamProfile,
): VisualMapping {
  const sections = getDreamProfileSections(profile);
  const text = Object.values(sections).join(" ").toLowerCase();
  const categories = inferCategories(text);
  const merged = categories.reduce<Omit<VisualMapping, "categories">>(
    (accumulator, category) => {
      const mapping = categoryMap[category];
      accumulator.architecture.push(...mapping.architecture);
      accumulator.lighting.push(...mapping.lighting);
      accumulator.atmosphere.push(...mapping.atmosphere);
      accumulator.textures.push(...mapping.textures);
      accumulator.subtleDetails.push(...mapping.subtleDetails);
      return accumulator;
    },
    { architecture: [], lighting: [], atmosphere: [], textures: [], subtleDetails: [] },
  );

  return {
    categories,
    architecture: unique(merged.architecture).slice(0, 5),
    lighting: unique(merged.lighting).slice(0, 4),
    atmosphere: unique(merged.atmosphere).slice(0, 5),
    textures: unique(merged.textures).slice(0, 5),
    subtleDetails: unique(merged.subtleDetails).slice(0, 6),
  };
}

function inferCategories(text: string): VisualCategory[] {
  const categories: VisualCategory[] = [];
  addIf(categories, "SUCCESS", text, ["business", "income", "financial", "career", "abundant", "office", "money"]);
  addIf(categories, "FREEDOM", text, ["travel", "freedom", "free", "terrace", "ocean", "mountain", "horizon"]);
  addIf(categories, "LOVE", text, ["family", "loved", "romantic", "partner", "children", "home", "kitchen"]);
  addIf(categories, "HEALTH", text, ["health", "healthy", "strong", "fitness", "wellness", "body"]);
  addIf(categories, "PEACE", text, ["peace", "calm", "balanced", "healing", "mind", "spiritual", "nature"]);
  addIf(categories, "CONFIDENCE", text, ["confident", "powerful", "unstoppable", "disciplined", "purpose"]);

  return categories.length ? categories.slice(0, 4) : ["PEACE", "CONFIDENCE"];
}

function addIf(
  categories: VisualCategory[],
  category: VisualCategory,
  text: string,
  terms: string[],
) {
  if (terms.some((term) => text.includes(term)) && !categories.includes(category)) {
    categories.push(category);
  }
}

function unique(values: string[]) {
  return Array.from(new Set(values));
}
