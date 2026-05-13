export type CleanedCustomAnswer = {
  question: string;
  cleanGoal: string;
  visualTranslation: {
    environment: string;
    atmosphere: string;
    subtleDetails: string[];
    lighting: string;
  };
  emotionalTone: string[];
  importance: "primary" | "secondary" | "accent";
};

export const cleanCustomAnswerPrompt = `Convert the user's custom text into clean cinematic visual language.

Rules:
- preserve emotional meaning
- preserve user intention
- remove clutter
- remove excessive wording
- convert abstract goals into visual atmosphere
- no visible faces
- no text in image

Question:
{question_name}

User custom text:
{custom_text}

Return JSON:
{
  "cleanGoal": "...",
  "visualTranslation": {
    "environment": "...",
    "atmosphere": "...",
    "subtleDetails": ["...", "..."],
    "lighting": "..."
  },
  "emotionalTone": ["...", "..."],
  "importance": "primary | secondary | accent"
}

If the custom answer is empty or low-quality, return a minimal safe interpretation.`;

export function cleanCustomAnswer(
  question: string,
  value: string | undefined,
  importance: CleanedCustomAnswer["importance"] = "accent",
): CleanedCustomAnswer {
  const cleaned = sanitize(value);
  const words = cleaned.split(/\s+/).filter(Boolean);
  const cleanGoal = words.length
    ? words.slice(0, 14).join(" ")
    : "personal calm future-life detail";
  const lower = cleanGoal.toLowerCase();

  return {
    question,
    cleanGoal,
    visualTranslation: {
      environment: inferEnvironment(lower),
      atmosphere: inferAtmosphere(lower),
      subtleDetails: inferSubtleDetails(lower),
      lighting: inferLighting(lower),
    },
    emotionalTone: inferEmotionalTone(lower),
    importance,
  };
}

function sanitize(value: string | undefined) {
  return (value || "")
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/[<>]/g, "")
    .trim()
    .slice(0, 180);
}

function inferEnvironment(value: string) {
  if (contains(value, ["farm", "garden", "ranch", "nature", "lake", "forest"])) {
    return "peaceful home connected to nature";
  }
  if (contains(value, ["business", "office", "ceo", "career", "shop", "income"])) {
    return "refined workspace within a calm premium environment";
  }
  if (contains(value, ["travel", "ocean", "beach", "armenia", "paris", "world"])) {
    return "open horizon or terrace with a subtle travel atmosphere";
  }
  if (contains(value, ["family", "sons", "children", "husband", "partner", "mother"])) {
    return "warm lived-in home atmosphere";
  }
  return "one beautiful cinematic future-life environment";
}

function inferAtmosphere(value: string) {
  if (contains(value, ["peace", "calm", "safe", "healing"])) return "quiet, safe, restorative";
  if (contains(value, ["power", "ceo", "career", "success"])) return "focused, elevated, composed";
  if (contains(value, ["love", "family", "romantic"])) return "warm, intimate, emotionally grounded";
  return "calming, personal, aspirational";
}

function inferSubtleDetails(value: string) {
  const details: string[] = [];
  if (contains(value, ["garden", "farm", "ranch"])) details.push("garden greenery");
  if (contains(value, ["business", "office", "ceo", "shop"])) details.push("organized workspace detail");
  if (contains(value, ["travel", "ocean", "beach"])) details.push("open horizon view");
  if (contains(value, ["family", "sons", "children", "partner", "husband"])) {
    details.push("implied shared living space");
  }
  if (contains(value, ["faith", "spiritual"])) details.push("soft contemplative corner");
  return details.slice(0, 3).length ? details.slice(0, 3) : ["subtle lived-in personal detail"];
}

function inferLighting(value: string) {
  if (contains(value, ["night", "dark"])) return "warm cinematic low light";
  if (contains(value, ["morning", "health", "healing"])) return "soft morning light";
  return "natural cinematic light";
}

function inferEmotionalTone(value: string) {
  const tones: string[] = [];
  if (contains(value, ["calm", "peace", "safe", "healing"])) tones.push("peaceful");
  if (contains(value, ["business", "money", "ceo", "career"])) tones.push("focused");
  if (contains(value, ["family", "love", "mother", "partner"])) tones.push("warm");
  if (contains(value, ["travel", "freedom"])) tones.push("free");
  return tones.length ? tones.slice(0, 3) : ["calm", "hopeful"];
}

function contains(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}
