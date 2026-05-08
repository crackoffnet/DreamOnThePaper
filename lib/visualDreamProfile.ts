export type VisualOnlyDreamProfile = {
  futureLife: string[];
  futureLifeOther?: string;
  currentGoals: string[];
  currentGoalsOther?: string;
  desiredFeelings: string[];
  desiredFeelingsOther?: string;
  dreamScenes: string[];
  dreamScenesOther?: string;
  dreamEnvironment: string[];
  dreamEnvironmentOther?: string;
  successType: string[];
  successTypeOther?: string;
  colorMood: string[];
  colorMoodOther?: string;
  visualStyle: string[];
  visualStyleOther?: string;
  compositionStyle: string[];
  compositionStyleOther?: string;
  deviceType: string[];
  deviceTypeOther?: string;
  customNotes?: string;
};

export type DreamProfileField =
  | "futureLife"
  | "currentGoals"
  | "desiredFeelings"
  | "dreamScenes"
  | "dreamEnvironment"
  | "successType"
  | "colorMood"
  | "visualStyle"
  | "compositionStyle"
  | "deviceType";

export type DreamProfileQuestion = {
  id: DreamProfileField;
  title: string;
  minSelections: number;
  maxSelections: number;
  options: string[];
  otherKey: keyof VisualOnlyDreamProfile;
};

const otherOption = "Other";

export const dreamProfileQuestions: DreamProfileQuestion[] = [
  {
    id: "futureLife",
    title: "What future life are you visualizing for yourself?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "futureLifeOther",
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
    id: "currentGoals",
    title: "What are you working toward right now?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "currentGoalsOther",
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
    id: "dreamEnvironment",
    title: "What kind of home or environment feels like your dream?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "dreamEnvironmentOther",
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
    id: "successType",
    title: "What kind of success do you want to attract?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "successTypeOther",
    options: [
      "More money",
      "Profitable business",
      "Dream career",
      "Freedom with my time",
      "Recognition and respect",
      "Passive income",
      "Confidence in myself",
      "Strong discipline",
      "Creative success",
      "Stability and security",
      "Leadership and influence",
      "A life I do not need to escape from",
      otherOption,
    ],
  },
  {
    id: "colorMood",
    title: "What color mood do you prefer?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "colorMoodOther",
    options: [
      "Soft beige and cream",
      "Warm golden tones",
      "Blush pink and nude",
      "White and minimal",
      "Earthy green and brown",
      "Ocean blue and sand",
      "Dark elegant luxury",
      "Lavender and soft purple",
      "Black, gold, and champagne",
      "Pastel dreamy colors",
      "Neutral aesthetic tones",
      "Warm sunset colors",
      otherOption,
    ],
  },
  {
    id: "visualStyle",
    title: "What visual style do you want?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "visualStyleOther",
    options: [
      "Minimal and clean",
      "Luxury aesthetic",
      "Soft feminine",
      "Cinematic realistic",
      "Cozy warm lifestyle",
      "Dreamy and magical",
      "Modern editorial",
      "Nature-inspired",
      "Elegant vision board collage",
      "Calm spiritual aesthetic",
      "High-end Pinterest style",
      "Soft luxury realism",
      otherOption,
    ],
  },
  {
    id: "compositionStyle",
    title: "How should the wallpaper be composed?",
    minSelections: 2,
    maxSelections: 6,
    otherKey: "compositionStyleOther",
    options: [
      "Soft blended scenes",
      "Clean and spacious",
      "Dreamy collage style",
      "Realistic lifestyle scene",
      "Minimal with few elements",
      "Rich but not crowded",
      "Nature-focused composition",
      "Home and lifestyle focused",
      "Success and business focused",
      "Travel and freedom focused",
      "Balanced mix of everything",
      otherOption,
    ],
  },
  {
    id: "deviceType",
    title: "What device is this wallpaper for?",
    minSelections: 1,
    maxSelections: 3,
    otherKey: "deviceTypeOther",
    options: [
      "iPhone wallpaper",
      "Android phone wallpaper",
      "Desktop wallpaper",
      "Laptop wallpaper",
      "iPad or tablet wallpaper",
      "Lock screen wallpaper",
      "Home screen wallpaper",
      "Wide monitor wallpaper",
      "Square printable vision board",
      "I want both phone and desktop",
      "I want custom size",
      otherOption,
    ],
  },
];

export const launchHiddenDreamProfileOptions: Partial<Record<DreamProfileField, string[]>> = {
  deviceType: ["I want both phone and desktop"],
};

export const emptyVisualOnlyDreamProfile: VisualOnlyDreamProfile = {
  futureLife: [],
  futureLifeOther: "",
  currentGoals: [],
  currentGoalsOther: "",
  desiredFeelings: [],
  desiredFeelingsOther: "",
  dreamScenes: [],
  dreamScenesOther: "",
  dreamEnvironment: [],
  dreamEnvironmentOther: "",
  successType: [],
  successTypeOther: "",
  colorMood: [],
  colorMoodOther: "",
  visualStyle: [],
  visualStyleOther: "",
  compositionStyle: [],
  compositionStyleOther: "",
  deviceType: [],
  deviceTypeOther: "",
  customNotes: "",
};

export function getLaunchDreamProfileQuestions() {
  return dreamProfileQuestions.map((question) => ({
    ...question,
    options: question.options.filter(
      (option) => !launchHiddenDreamProfileOptions[question.id]?.includes(option),
    ),
  }));
}

export function sanitizeDreamProfile(
  profile: VisualOnlyDreamProfile,
): VisualOnlyDreamProfile {
  return {
    futureLife: sanitizeStringArray(profile.futureLife),
    futureLifeOther: sanitizeText(profile.futureLifeOther),
    currentGoals: sanitizeStringArray(profile.currentGoals),
    currentGoalsOther: sanitizeText(profile.currentGoalsOther),
    desiredFeelings: sanitizeStringArray(profile.desiredFeelings),
    desiredFeelingsOther: sanitizeText(profile.desiredFeelingsOther),
    dreamScenes: sanitizeStringArray(profile.dreamScenes),
    dreamScenesOther: sanitizeText(profile.dreamScenesOther),
    dreamEnvironment: sanitizeStringArray(profile.dreamEnvironment),
    dreamEnvironmentOther: sanitizeText(profile.dreamEnvironmentOther),
    successType: sanitizeStringArray(profile.successType),
    successTypeOther: sanitizeText(profile.successTypeOther),
    colorMood: sanitizeStringArray(profile.colorMood),
    colorMoodOther: sanitizeText(profile.colorMoodOther),
    visualStyle: sanitizeStringArray(profile.visualStyle),
    visualStyleOther: sanitizeText(profile.visualStyleOther),
    compositionStyle: sanitizeStringArray(profile.compositionStyle),
    compositionStyleOther: sanitizeText(profile.compositionStyleOther),
    deviceType: sanitizeStringArray(profile.deviceType),
    deviceTypeOther: sanitizeText(profile.deviceTypeOther),
    customNotes: sanitizeText(profile.customNotes, 500),
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
    currentGoals: formatSection(
      sanitized.currentGoals,
      sanitized.currentGoalsOther,
    ),
    desiredFeelings: formatSection(
      sanitized.desiredFeelings,
      sanitized.desiredFeelingsOther,
    ),
    dreamScenes: formatSection(sanitized.dreamScenes, sanitized.dreamScenesOther),
    dreamEnvironment: formatSection(
      sanitized.dreamEnvironment,
      sanitized.dreamEnvironmentOther,
    ),
    successType: formatSection(sanitized.successType, sanitized.successTypeOther),
    colorMood: formatSection(sanitized.colorMood, sanitized.colorMoodOther),
    visualStyle: formatSection(sanitized.visualStyle, sanitized.visualStyleOther),
    compositionStyle: formatSection(
      sanitized.compositionStyle,
      sanitized.compositionStyleOther,
    ),
    deviceType: formatSection(sanitized.deviceType, sanitized.deviceTypeOther),
    customNotes: stringValue(sanitized.customNotes),
  };
}

export function buildLegacyWallpaperFields(profile: VisualOnlyDreamProfile) {
  const sections = getDreamProfileSections(profile);
  return {
    goals: sections.futureLife,
    lifestyle: [sections.currentGoals, sections.dreamScenes].filter(Boolean).join(" · "),
    career: [sections.currentGoals, sections.successType].filter(Boolean).join(" · "),
    personalLife: sections.dreamScenes,
    health: sections.desiredFeelings,
    place: sections.dreamEnvironment,
    feelingWords: [sections.desiredFeelings, sections.colorMood].filter(Boolean).join(" · "),
    reminder:
      sections.customNotes ||
      [sections.visualStyle, sections.compositionStyle, sections.deviceType]
        .filter(Boolean)
        .join(" · "),
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
      ...emptyVisualOnlyDreamProfile,
      futureLife: splitLegacyText(profile.goals),
      currentGoals: splitLegacyText(profile.lifestyle),
      desiredFeelings: splitLegacyText(profile.feelingWords),
      dreamScenes: splitLegacyText(profile.personalLife),
      dreamEnvironment: splitLegacyText(profile.place),
      successType: splitLegacyText(profile.career),
      colorMood: [],
      visualStyle: [],
      compositionStyle: [],
      deviceType: [],
      customNotes: stringValue(profile.reminder),
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

  return result
    .slice(0, 6)
    .sort((left, right) => left.localeCompare(right, undefined, { sensitivity: "base" }));
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
