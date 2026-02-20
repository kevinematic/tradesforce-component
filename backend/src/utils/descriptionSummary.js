const HTML_ENTITY_MAP = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&nbsp;": " ",
};

const STOPWORDS = new Set([
  "the",
  "and",
  "for",
  "with",
  "from",
  "that",
  "this",
  "your",
  "you",
  "our",
  "are",
  "was",
  "were",
  "has",
  "have",
  "had",
  "will",
  "can",
  "all",
  "but",
  "not",
  "job",
  "role",
  "position",
  "work",
  "who",
  "why",
  "what",
  "when",
  "where",
  "how",
  "their",
  "them",
  "they",
  "its",
  "into",
  "onto",
  "than",
  "then",
  "there",
  "here",
  "about",
  "after",
  "before",
  "while",
  "also",
]);

function decodeHtmlEntities(text) {
  return text.replace(/&(?:amp|lt|gt|quot|#39|nbsp);/g, (entity) => {
    return HTML_ENTITY_MAP[entity] || entity;
  });
}

function normalizeText(rawText) {
  if (!rawText) return "";

  return decodeHtmlEntities(
    rawText
      .replace(/<[^>]*>/g, " ")
      .replace(/\s+/g, " ")
      .trim(),
  );
}

function normalizeForCompare(text) {
  return normalizeText(text)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function extractTokens(text) {
  return new Set(
    normalizeForCompare(text)
      .split(" ")
      .map((token) => token.trim())
      .filter((token) => token.length >= 3 && !STOPWORDS.has(token)),
  );
}

function splitSentences(text) {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
}

function sentenceScore(sentence) {
  const lower = sentence.toLowerCase();

  let score = 0;

  if (/(responsib|duties|role|you will|day-to-day|tasks?)/.test(lower))
    score += 3;
  if (/(require|experience|skills?|qualif|certif|license)/.test(lower))
    score += 3;
  if (/(benefits?|pay|salary|hour|rate|compensation)/.test(lower)) score += 2;
  if (/(team|safety|customer|projects?)/.test(lower)) score += 1;

  if (lower.includes("apply now")) score -= 2;
  if (lower.includes("equal opportunity")) score -= 2;
  if (lower.includes("click here")) score -= 2;

  if (sentence.length < 40) score -= 1;
  if (sentence.length > 260) score -= 1;

  return score;
}

function clampToLength(text, maxChars) {
  if (text.length <= maxChars) return text;

  const trimmed = text.slice(0, maxChars - 1);
  const lastSpace = trimmed.lastIndexOf(" ");
  if (lastSpace > 80) {
    return `${trimmed.slice(0, lastSpace)}…`;
  }
  return `${trimmed}…`;
}

function buildFieldProfiles(title, context = {}) {
  const values = [
    { key: "title", value: title },
    { key: "company_name", value: context.company_name },
    { key: "location_display", value: context.location_display },
    { key: "category_label", value: context.category_label },
    { key: "derived_trade", value: context.derived_trade },
    { key: "contract_type", value: context.contract_type },
    { key: "contract_time", value: context.contract_time },
  ].filter((item) => item.value);

  return values
    .map((item) => ({
      key: item.key,
      norm: normalizeForCompare(item.value),
      tokens: extractTokens(item.value),
    }))
    .filter((profile) => profile.norm.length > 0 && profile.tokens.size > 0);
}

function sentenceOverlapsCardFields(sentence, profiles, context = {}) {
  const sentenceNorm = normalizeForCompare(sentence);
  const sentenceTokens = extractTokens(sentence);

  if (sentenceNorm.length === 0 || sentenceTokens.size === 0) {
    return false;
  }

  for (const profile of profiles) {
    if (profile.norm.length >= 4 && sentenceNorm.includes(profile.norm)) {
      return true;
    }

    let overlap = 0;
    for (const token of profile.tokens) {
      if (sentenceTokens.has(token)) overlap++;
    }

    const overlapRatio =
      overlap / Math.min(profile.tokens.size, sentenceTokens.size);
    if (overlap >= 3 && overlapRatio >= 0.6) {
      return true;
    }
  }

  const hasSalaryOnCard =
    context.salary_min != null || context.salary_max != null;
  if (
    hasSalaryOnCard &&
    /(\$|salary|pay|hour|hr|annually|yearly|weekly)/i.test(sentence)
  ) {
    return true;
  }

  return false;
}

export function summarizeJobDescription(description, title = "", context = {}) {
  const normalized = normalizeText(description);
  if (!normalized) return null;

  const sentences = splitSentences(normalized);
  if (sentences.length === 0) return null;

  const fieldProfiles = buildFieldProfiles(title, context);
  const candidateSentences = sentences.filter(
    (sentence) => !sentenceOverlapsCardFields(sentence, fieldProfiles, context),
  );

  const sourceSentences =
    candidateSentences.length > 0 ? candidateSentences : sentences;

  const ranked = sourceSentences
    .map((sentence, index) => ({
      sentence,
      index,
      score: sentenceScore(sentence),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);

  const selected = ranked
    .slice(0, 2)
    .sort((a, b) => a.index - b.index)
    .map((item) => item.sentence);

  const summaryBase = selected.length > 0 ? selected.join(" ") : sentences[0];
  const summary = clampToLength(summaryBase, 240);

  if (title && summary.toLowerCase().startsWith(title.toLowerCase())) {
    return clampToLength(
      summary.replace(title, "").replace(/^[-:,\s]+/, ""),
      240,
    );
  }

  if (candidateSentences.length === 0) {
    return "Review the listing for role responsibilities, requirements, and day-to-day scope.";
  }

  return (
    summary ||
    "Review the listing for role responsibilities, requirements, and day-to-day scope."
  );
}
