import {
  ResumeDocumentSchema,
  type ResumeDocument,
  type ResumeSettings,
  type SectionId,
} from "@/lib/schema";
import { getTemplateDescriptor } from "@/lib/templates/registry";
import { isSectionEmpty } from "@/lib/templates/style-context";
import { extractTerms, normalizeTerm, stem } from "./keywords";
import { canonicalize, canonicalizePhrase, hasVariant } from "./lexicon";

export { tokenize } from "./keywords";

export interface AtsCheck {
  label: string;
  passed: boolean;
  points: number;
  /** One sentence: why this check exists. */
  why: string;
  /** Section the user should edit, when the failure is actionable. */
  fixSection?: SectionId;
}

export interface AtsCategoryScore {
  id: string;
  label: string;
  score: number;
  max: number;
  checks: AtsCheck[];
}

export interface AtsSuggestion {
  keyword: string;
  recommendedSection: SectionId;
}

export interface AtsResult {
  total: number;
  categories: AtsCategoryScore[];
  missingKeywords: AtsSuggestion[];
  hasJobDescription: boolean;
}

/**
 * Comparison key for a term. Whole-phrase lexicon entries win ("machine
 * learning" → machinelearning); otherwise each token is stemmed and mapped.
 */
function canonicalKey(term: string): string {
  const normalized = normalizeTerm(term);
  if (!normalized) return "";
  const whole = canonicalizePhrase(normalized);
  if (whole !== normalized) return whole;
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => canonicalize(stem(token)))
    .join(" ");
}

export function resumeToText(doc: ResumeDocument): string {
  const parts: string[] = [
    doc.contact.name,
    doc.contact.headline ?? "",
    doc.contact.email ?? "",
    doc.contact.phone ?? "",
    doc.contact.location ?? "",
    doc.contact.website ?? "",
    doc.contact.linkedin ?? "",
    doc.contact.github ?? "",
    doc.summary,
    ...doc.experience.flatMap((e) => [
      e.role,
      e.company,
      e.location ?? "",
      e.bullets.join(" "),
    ]),
    ...doc.education.flatMap((e) => [
      e.school,
      e.degree ?? "",
      e.field ?? "",
      e.cgpa ?? "",
      e.bullets.join(" "),
    ]),
    ...doc.projects.flatMap((p) => [p.name, p.description ?? "", p.bullets.join(" ")]),
    ...doc.skills.flatMap((g) => [g.category, ...g.items]),
    ...doc.certifications.map((c) => `${c.name} ${c.issuer ?? ""}`),
    ...doc.extracurriculars.flatMap((e) => [
      e.organization,
      e.role ?? "",
      e.bullets.join(" "),
    ]),
    doc.additional.heading,
    ...doc.additional.entries.flatMap((e) => [
      e.title,
      e.subtitle ?? "",
      e.bullets.join(" "),
    ]),
    ...doc.references.flatMap((r) => [r.name, r.role ?? "", r.company ?? ""]),
    doc.languages.join(" "),
    doc.interests.join(" "),
  ];
  return parts.join("\n");
}

/** Every canonical form the resume can offer, phrases included. */
function resumeCanonicalSet(doc: ResumeDocument): Set<string> {
  const keys = new Set<string>();
  for (const term of extractTerms(resumeToText(doc))) {
    const key = canonicalKey(term);
    if (key) keys.add(key);
  }
  return keys;
}

interface Keyword {
  /** Form shown to the user: the job description's own wording. */
  surface: string;
  canonical: string;
  weight: number;
}

const LEXICON_WEIGHT_BONUS = 2;
const PHRASE_WEIGHT_BONUS = 2;
const KEYWORD_LIMIT = 40;

/** Locale-independent so ordering is deterministic on every machine. */
function compareSurface(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}

function countOccurrences(tokens: string[], phrase: string[]): number {
  let count = 0;
  for (let i = 0; i + phrase.length <= tokens.length; i++) {
    if (phrase.every((part, offset) => tokens[i + offset] === part)) count++;
  }
  return count;
}

/** Ranked, de-duplicated job-description terms. */
export function extractKeywords(jobDescription: string): Keyword[] {
  const terms = extractTerms(jobDescription);
  if (!terms.length) return [];

  const tokens = normalizeTerm(jobDescription).split(" ").filter(Boolean);
  const byCanonical = new Map<string, Keyword>();
  /** Unigrams swallowed by a known multi-word skill ("machine learning"). */
  const absorbed = new Set<string>();

  const consider = (term: string) => {
    const occurrences = countOccurrences(tokens, term.split(" "));
    if (occurrences === 0) return;
    const canonical = canonicalKey(term);
    if (!canonical) return;

    const weight =
      occurrences +
      (hasVariant(term) ? LEXICON_WEIGHT_BONUS : 0) +
      (term.includes(" ") ? PHRASE_WEIGHT_BONUS : 0);

    const existing = byCanonical.get(canonical);
    if (
      !existing ||
      weight > existing.weight ||
      (weight === existing.weight && compareSurface(term, existing.surface) < 0)
    ) {
      byCanonical.set(canonical, { surface: term, canonical, weight });
    }
  };

  // Known multi-word skills are matched whole; bare n-grams are noise, because
  // they mostly straddle clause boundaries ("design for", "team and").
  for (const term of terms) {
    if (!term.includes(" ") || !hasVariant(term)) continue;
    consider(term);
    for (const token of term.split(" ")) absorbed.add(token);
  }

  for (const term of terms) {
    if (term.includes(" ")) continue;
    if (absorbed.has(term)) continue;
    consider(term);
  }

  return [...byCanonical.values()]
    .sort((a, b) => b.weight - a.weight || compareSurface(a.surface, b.surface))
    .slice(0, KEYWORD_LIMIT);
}

const SECTION_FOR_KEYWORD: { test: RegExp; section: SectionId }[] = [
  { test: /^(led|managed|built|designed|developed|delivered|improved|increased|reduced)/i, section: "experience" },
  { test: /(certif|certificate|pmp|cisa|cpa|license)/i, section: "certifications" },
  {
    test: /(volunteer|community|club|society|committee|mentor|leadership)/i,
    section: "extracurriculars",
  },
  {
    test: /(award|honou?r|publication|patent|research|coursework|fellowship|scholarship)/i,
    section: "additional",
  },
  { test: /(university|college|bachelor|master|phd|degree|school)/i, section: "education" },
];

function suggestSection(keyword: string): SectionId {
  for (const { test, section } of SECTION_FOR_KEYWORD) {
    if (test.test(keyword)) return section;
  }
  return "skills";
}

export function computeAtsScore(
  doc: ResumeDocument,
  settings: ResumeSettings,
  jobDescription: string,
): AtsResult {
  const categories: AtsCategoryScore[] = [];

  // 1. Contact completeness (weight 15)
  const emailOk = (() => {
    try {
      const e = doc.contact.email;
      return Boolean(e && ResumeDocumentSchema.shape.contact.shape.email.safeParse(e).success);
    } catch {
      return false;
    }
  })();
  const contactChecks: AtsCheck[] = [
    {
      label: "Name present",
      passed: Boolean(doc.contact.name.trim()),
      points: 4,
      why: "A parser needs a name to attach the document to a candidate record.",
    },
    {
      label: "Email present & valid",
      passed: emailOk,
      points: 3,
      why: "Email is how a recruiter replies, and a malformed address is silently unusable.",
    },
    {
      label: "Phone present",
      passed: Boolean(doc.contact.phone?.trim()),
      points: 3,
      why: "Many agencies still screen by phone, so a missing number removes a whole contact path.",
    },
    {
      label: "Location present",
      passed: Boolean(doc.contact.location?.trim()),
      points: 2,
      why: "Location drives work-authorisation and relocation questions before any interview.",
    },
    {
      label: "LinkedIn, website, or GitHub",
      passed: Boolean(
        doc.contact.linkedin?.trim() || doc.contact.website?.trim() || doc.contact.github?.trim(),
      ),
      points: 3,
      why: "One corroborating link lets a reviewer check your work beyond the resume.",
    },
  ];
  categories.push({
    id: "contact",
    label: "Contact",
    score: contactChecks.filter((c) => c.passed).reduce((a, c) => a + c.points, 0),
    max: 15,
    checks: contactChecks,
  });

  // 2. Section completeness (weight 30)
  const sectionPoints: AtsCheck[] = [
    {
      label: "Summary",
      passed: !isSectionEmpty(doc, "summary"),
      points: 6,
      why: "A short summary tells a screener what role you are targeting before any detail.",
      fixSection: "summary",
    },
    {
      label: "Experience",
      passed: !isSectionEmpty(doc, "experience"),
      points: 8,
      why: "Experience is what screening decisions mostly rest on, so an empty one is fatal.",
      fixSection: "experience",
    },
    {
      label: "Education",
      passed: !isSectionEmpty(doc, "education"),
      points: 5,
      why: "Education answers the degree or institution filter many postings apply mechanically.",
      fixSection: "education",
    },
    {
      label: "Skills",
      passed: !isSectionEmpty(doc, "skills"),
      points: 5,
      why: "A skills list is where keyword searches look first, even for career changers.",
      fixSection: "skills",
    },
    {
      label: "Projects or certifications",
      passed: !isSectionEmpty(doc, "projects") || !isSectionEmpty(doc, "certifications"),
      points: 3,
      why: "Projects and certifications carry a resume whose work history is still short.",
      fixSection: "projects",
    },
    {
      label: "Languages or interests",
      passed: !isSectionEmpty(doc, "languages") || !isSectionEmpty(doc, "interests"),
      points: 3,
      why: "Languages matter for cross-border roles, and interests give an interviewer a human opener.",
      fixSection: "languages",
    },
  ];
  const sectionScore = sectionPoints.filter((s) => s.passed).reduce((a, s) => a + s.points, 0);

  const hasJd = jobDescription.trim().length > 0;

  // 3. Keyword match (weight 35)
  let keywordScore = 0;
  let missingKeywords: AtsSuggestion[] = [];
  if (hasJd) {
    const keywords = extractKeywords(jobDescription);
    const resumeKeys = resumeCanonicalSet(doc);
    const matched = keywords.filter((keyword) => resumeKeys.has(keyword.canonical));
    const coverage = keywords.length ? matched.length / keywords.length : 0;
    keywordScore = Math.round(coverage * 35);
    missingKeywords = keywords
      .filter((keyword) => !resumeKeys.has(keyword.canonical))
      .sort((a, b) => b.weight - a.weight || compareSurface(a.surface, b.surface))
      .slice(0, 15)
      .map((keyword) => ({
        keyword: keyword.surface,
        recommendedSection: suggestSection(keyword.surface),
      }));
    categories.push({
      id: "keywords",
      label: "Keyword match",
      score: keywordScore,
      max: 35,
      checks: [
        {
          label: `${matched.length}/${keywords.length} job keywords present`,
          passed: coverage > 0.5,
          points: keywordScore,
          why: "Most applicants are filtered on whether the posting's own vocabulary appears at all.",
          // Only jump when there is somewhere concrete to add the top missing term.
          fixSection: missingKeywords[0]?.recommendedSection,
        },
      ],
    });
  }

  // Without JD, reallocate keyword weight to sections (scaled 30 -> 65).
  const sectionScaled = hasJd ? sectionScore : Math.round((sectionScore / 30) * 65);
  categories.splice(1, 0, {
    id: "sections",
    label: "Sections",
    score: sectionScaled,
    max: hasJd ? 30 : 65,
    checks: sectionPoints,
  });

  // 4. Formatting / ATS-safety (weight 20)
  const descriptor = getTemplateDescriptor(settings.templateId);
  const formatChecks: AtsCheck[] = [
    {
      label: "ATS-safe template",
      passed: descriptor.atsSafe,
      points: 8,
      why: "Parsers read plain single-flow text most reliably, so visual layouts lose information.",
    },
    {
      label: "Single reading order layout",
      passed: descriptor.columns <= 2,
      points: 4,
      why: "Text extraction follows source order, and more than two columns scrambles it.",
    },
    {
      label: "No empty sections forced visible",
      passed: (Object.keys(doc.sectionVisibility) as SectionId[]).every(
        (id) => !doc.sectionVisibility[id] || !isSectionEmpty(doc, id),
      ),
      points: 4,
      why: "A heading with nothing under it reads as a gap in your history rather than a choice.",
    },
    {
      label: "Semantic bullet lists",
      passed: true,
      points: 4,
      why: "Real list markup keeps each bullet a separate line instead of one run-on block.",
    },
  ];
  categories.push({
    id: "formatting",
    label: "Formatting",
    score: formatChecks.filter((c) => c.passed).reduce((a, c) => a + c.points, 0),
    max: 20,
    checks: formatChecks,
  });

  const total = categories.reduce((a, c) => a + c.score, 0);

  return {
    total: Math.min(100, total),
    categories,
    missingKeywords,
    hasJobDescription: hasJd,
  };
}