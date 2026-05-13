import type { VisualOnlyDreamProfile } from "@/lib/visualDreamProfile";
import { getDreamProfileSections } from "@/lib/visualDreamProfile";
import type { VisualMapping } from "@/lib/prompting/visualMappingEngine";

export type DreamPriority = {
  primaryGoals: string[];
  secondaryGoals: string[];
  accentDetails: string[];
  emotionalDirection: string[];
};

const priorityLabels = {
  SUCCESS: "calm successful future life",
  FREEDOM: "peaceful freedom and open possibility",
  LOVE: "warm lasting love and home belonging",
  HEALTH: "balanced health and grounded strength",
  PEACE: "quiet peace and emotional safety",
  CONFIDENCE: "focused confidence and clean structure",
} as const;

export function buildDreamPriority(
  profile: VisualOnlyDreamProfile,
  mapping: VisualMapping,
): DreamPriority {
  const sections = getDreamProfileSections(profile);
  const categoryGoals = mapping.categories.map((category) => priorityLabels[category]);
  const sceneHints = splitSection(sections.futureEnvironment || sections.dreamScenes);
  const feelingHints = splitSection(sections.desiredFeelings);
  const personalHints = splitSection(sections.personalDetails);

  return {
    primaryGoals: unique([...categoryGoals, ...sceneHints]).slice(0, 2),
    secondaryGoals: unique([...categoryGoals.slice(2), ...feelingHints]).slice(0, 3),
    accentDetails: unique([...personalHints, ...mapping.subtleDetails]).slice(0, 5),
    emotionalDirection: unique([...feelingHints, ...mapping.atmosphere]).slice(0, 5),
  };
}

function splitSection(value: string) {
  return value
    .split(",")
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean)
    .slice(0, 6);
}

function unique(values: string[]) {
  return Array.from(new Set(values.filter(Boolean)));
}
