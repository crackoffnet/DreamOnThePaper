export type CinematicDreamProfile = {
  futureLife: string[];
  futureLifeOther?: string;
  currentCreation: string[];
  currentCreationOther?: string;
  desiredFeelings: string[];
  desiredFeelingsOther?: string;
  dreamScenes: string[];
  dreamScenesOther?: string;
  futureEnvironment: string[];
  futureEnvironmentOther?: string;
  personalDetails: string[];
  personalDetailsOther?: string;
  finalCustomDetail?: string;
};

export type VisualOnlyDreamProfile = CinematicDreamProfile & {
  currentGoals?: string[];
  currentGoalsOther?: string;
  dreamEnvironment?: string[];
  dreamEnvironmentOther?: string;
  successType?: string[];
  successTypeOther?: string;
  colorMood?: string[];
  colorMoodOther?: string;
  visualStyle?: string[];
  visualStyleOther?: string;
  compositionStyle?: string[];
  compositionStyleOther?: string;
  deviceType?: string[];
  deviceTypeOther?: string;
  customNotes?: string;
};

export type DreamProfileField =
  | "futureLife"
  | "currentCreation"
  | "desiredFeelings"
  | "dreamScenes"
  | "futureEnvironment"
  | "personalDetails";

export type DreamProfileQuestion = {
  id: DreamProfileField;
  title: string;
  minSelections: number;
  maxSelections: number;
  options: string[];
  otherKey: keyof CinematicDreamProfile;
  otherPlaceholder: string;
};

const otherOption = "Other";

export const dreamProfileQuestions: DreamProfileQuestion[] = [
  {
    id: "futureLife",
    title: "What future life are you building?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "futureLifeOther",
    otherPlaceholder: "Example: peaceful farm, CEO, calm motherhood",
    options: [
      "A peaceful home in nature",
      "A luxury modern home",
      "Financial freedom",
      "A successful business",
      "A loving family life",
      "Traveling the world",
      "A healthy strong body",
      "A calm balanced mind",
      "Creative freedom",
      "A romantic beautiful life",
      "A powerful career",
      "A spiritually aligned life",
      otherOption,
    ],
  },
  {
    id: "currentCreation",
    title: "What are you creating in your life right now?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "currentCreationOther",
    otherPlaceholder: "Example: bakery, Etsy shop, law career",
    options: [
      "Building my own business",
      "Growing my income",
      "Buying or creating my dream home",
      "Becoming healthier and stronger",
      "Healing and becoming peaceful",
      "Finding my purpose",
      "Becoming more confident",
      "Creating better relationships",
      "Traveling more",
      "Becoming disciplined",
      "Becoming the best version of myself",
      "Creating more time freedom",
      otherOption,
    ],
  },
  {
    id: "desiredFeelings",
    title: "How do you want to feel when you look at this wallpaper?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "desiredFeelingsOther",
    otherPlaceholder: "Example: safe, unstoppable, soft",
    options: [
      "Calm",
      "Motivated",
      "Powerful",
      "Loved",
      "Focused",
      "Grateful",
      "Hopeful",
      "Abundant",
      "Free",
      "Feminine and soft",
      "Strong and unstoppable",
      "Peaceful",
      otherOption,
    ],
  },
  {
    id: "dreamScenes",
    title: "What dream-life scenes should appear in your wallpaper?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "dreamScenesOther",
    otherPlaceholder: "Example: garden, ocean balcony, cozy library",
    options: [
      "Beautiful home",
      "Family moments",
      "Travel scenery",
      "Business success",
      "Financial abundance",
      "Healthy lifestyle",
      "Nature and peace",
      "Romantic relationship energy",
      "Fitness and wellness",
      "Luxury details",
      "Calm morning routine",
      "Creative lifestyle",
      otherOption,
    ],
  },
  {
    id: "futureEnvironment",
    title: "Which environment feels most like your future?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "futureEnvironmentOther",
    otherPlaceholder: "Example: ranch house, Armenia, lake cabin",
    options: [
      "Cozy house in nature",
      "Modern luxury house",
      "Beach house",
      "Apartment with city view",
      "Farmhouse with garden",
      "House with pool",
      "Warm family kitchen",
      "Peaceful bedroom",
      "Terrace with sunset view",
      "Elegant home office",
      "Forest or mountain retreat",
      "Minimal calm space",
      otherOption,
    ],
  },
  {
    id: "personalDetails",
    title: "What personal detail should we reflect?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "personalDetailsOther",
    otherPlaceholder: "Example: my sons, husband, faith",
    options: [
      "My family",
      "My partner",
      "My children",
      "My business",
      "My future home",
      "My health journey",
      "My travels",
      "My creativity",
      "My peace",
      "My confidence",
      "My spiritual side",
      "My independence",
      otherOption,
    ],
  },
];

export const emptyVisualOnlyDreamProfile: VisualOnlyDreamProfile = {
  futureLife: [],
  futureLifeOther: "",
  currentCreation: [],
  currentCreationOther: "",
  desiredFeelings: [],
  desiredFeelingsOther: "",
  dreamScenes: [],
  dreamScenesOther: "",
  futureEnvironment: [],
  futureEnvironmentOther: "",
  personalDetails: [],
  personalDetailsOther: "",
  finalCustomDetail: "",
};

export const emptyCinematicDreamProfile = emptyVisualOnlyDreamProfile;

export function getLaunchDreamProfileQuestions() {
  return dreamProfileQuestions;
}

export function sanitizeDreamProfile(
  profile: Partial<VisualOnlyDreamProfile>,
): VisualOnlyDreamProfile {
  const currentCreation = sanitizeStringArray(
    profile.currentCreation || profile.currentGoals,
  );
  const futureEnvironment = sanitizeStringArray(
    profile.futureEnvironment || profile.dreamEnvironment,
  );
  const personalDetails = sanitizeStringArray(
    profile.personalDetails || profile.successType,
  );

  return {
    futureLife: sanitizeStringArray(profile.futureLife),
    futureLifeOther: sanitizeShortCustom(profile.futureLifeOther),
    currentCreation,
    currentCreationOther: sanitizeShortCustom(
      profile.currentCreationOther || profile.currentGoalsOther,
    ),
    desiredFeelings: sanitizeStringArray(profile.desiredFeelings),
    desiredFeelingsOther: sanitizeShortCustom(profile.desiredFeelingsOther),
    dreamScenes: sanitizeStringArray(profile.dreamScenes),
    dreamScenesOther: sanitizeShortCustom(profile.dreamScenesOther),
    futureEnvironment,
    futureEnvironmentOther: sanitizeShortCustom(
      profile.futureEnvironmentOther || profile.dreamEnvironmentOther,
    ),
    personalDetails,
    personalDetailsOther: sanitizeShortCustom(
      profile.personalDetailsOther || profile.successTypeOther,
    ),
    finalCustomDetail: sanitizeText(
      profile.finalCustomDetail || profile.customNotes,
      260,
    ),
  };
}

export function validateDreamProfile(profile: VisualOnlyDreamProfile) {
  const sanitized = sanitizeDreamProfile(profile);
  const issues: string[] = [];

  for (const question of dreamProfileQuestions) {
    const values = sanitized[question.id];
    const count = Array.isArray(values) ? values.length : 0;
    if (count < question.minSelections || count > question.maxSelections) {
      issues.push(
        `${question.title} requires ${question.minSelections}-${question.maxSelections} selections.`,
      );
    }

    if (
      values.includes(otherOption) &&
      !stringValue(sanitized[question.otherKey] as string | undefined)
    ) {
      issues.push(`${question.title} needs a short note for Other.`);
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    profile: sanitized,
  };
}

export function hasMeaningfulDreamProfile(profile: VisualOnlyDreamProfile) {
  return validateDreamProfile(profile).valid;
}

export function getDreamProfileSections(profile: VisualOnlyDreamProfile) {
  const sanitized = sanitizeDreamProfile(profile);
  return {
    futureLife: formatSection(sanitized.futureLife, sanitized.futureLifeOther),
    currentCreation: formatSection(
      sanitized.currentCreation,
      sanitized.currentCreationOther,
    ),
    desiredFeelings: formatSection(
      sanitized.desiredFeelings,
      sanitized.desiredFeelingsOther,
    ),
    dreamScenes: formatSection(sanitized.dreamScenes, sanitized.dreamScenesOther),
    futureEnvironment: formatSection(
      sanitized.futureEnvironment,
      sanitized.futureEnvironmentOther,
    ),
    personalDetails: formatSection(
      sanitized.personalDetails,
      sanitized.personalDetailsOther,
    ),
    finalCustomDetail: stringValue(sanitized.finalCustomDetail),
  };
}

export function buildLegacyWallpaperFields(profile: VisualOnlyDreamProfile) {
  const sections = getDreamProfileSections(profile);
  return {
    goals: sections.futureLife,
    lifestyle: [sections.currentCreation, sections.dreamScenes].filter(Boolean).join(" | "),
    career: sections.currentCreation,
    personalLife: sections.personalDetails,
    health: sections.desiredFeelings,
    place: sections.futureEnvironment,
    feelingWords: sections.desiredFeelings,
    reminder: sections.finalCustomDetail || sections.personalDetails,
  };
}

export function profileFromStoredAnswers(value: unknown): VisualOnlyDreamProfile {
  if (!value || typeof value !== "object") {
    return { ...emptyVisualOnlyDreamProfile };
  }

  const profile = value as Partial<VisualOnlyDreamProfile> & {
    goals?: string;
    lifestyle?: string;
    career?: string;
    personalLife?: string;
    health?: string;
    place?: string;
    feelingWords?: string;
    reminder?: string;
  };

  if (!Array.isArray(profile.futureLife) && typeof profile.goals === "string") {
    return sanitizeDreamProfile({
      futureLife: splitLegacyText(profile.goals),
      currentCreation: splitLegacyText(profile.lifestyle || profile.career),
      desiredFeelings: splitLegacyText(profile.feelingWords || profile.health),
      dreamScenes: splitLegacyText(profile.personalLife),
      futureEnvironment: splitLegacyText(profile.place),
      personalDetails: splitLegacyText(profile.personalLife || profile.reminder),
      finalCustomDetail: stringValue(profile.reminder),
    });
  }

  return sanitizeDreamProfile({
    ...emptyVisualOnlyDreamProfile,
    ...profile,
  });
}

function formatSection(values: string[], otherValue?: string) {
  const cleaned = sanitizeStringArray(values).filter((value) => value !== otherOption);
  const other = stringValue(otherValue);
  return [...cleaned, ...(other ? [other] : [])].join(", ");
}

function sanitizeStringArray(values: string[] | undefined) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values || []) {
    const cleaned = stringValue(value);
    if (!cleaned || seen.has(cleaned)) {
      continue;
    }
    seen.add(cleaned);
    result.push(cleaned.slice(0, 120));
  }

  return result.slice(0, 6);
}

function sanitizeShortCustom(value: string | undefined) {
  return sanitizeText(value, 90)
    .split(/\s+/)
    .slice(0, 10)
    .join(" ");
}

function sanitizeText(value: string | undefined, maxLength = 180) {
  return stringValue(value)
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .slice(0, maxLength);
}

function stringValue(value: string | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function splitLegacyText(value: string | undefined) {
  return stringValue(value)
    .split(/[,|·]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 6);
}
