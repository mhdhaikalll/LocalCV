import {
  ResumeDocumentSchema,
  type ResumeDocument,
  type ResumeSettings,
  type SectionId,
} from "@/lib/schema";
import { getTemplateDescriptor } from "@/lib/templates/registry";
import { isSectionEmpty } from "@/lib/templates/style-context";

const STOP_WORDS = new Set(
  "a an the and or but if then else for to of in on at by with from as is are was were be been being will would can could should do does did have has had you your we our they their he she it its this that these those not no yes about into over under more most other some such only own same so than too very s t just don now i me my what which who whom when where why how all any both each few nor own too also per via etc across within".split(
    " ",
  ),
);

export interface AtsCategoryScore {
  id: string;
  label: string;
  score: number;
  max: number;
  checks: { label: string; passed: boolean; points: number }[];
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

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9+#.\s-]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
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
    ...doc.education.flatMap((e) => [e.school, e.degree ?? "", e.field ?? "", e.bullets.join(" ")]),
    ...doc.projects.flatMap((p) => [p.name, p.description ?? "", p.bullets.join(" ")]),
    ...doc.skills.flatMap((g) => [g.category, ...g.items]),
    ...doc.certifications.map((c) => `${c.name} ${c.issuer ?? ""}`),
    ...doc.extracurriculars.flatMap((e) => [
      e.organization,
      e.role ?? "",
      e.bullets.join(" "),
    ]),
    ...doc.references.flatMap((r) => [r.name, r.role ?? "", r.company ?? ""]),
    doc.languages.join(" "),
    doc.interests.join(" "),
  ];
  return parts.join("\n");
}

const SECTION_FOR_KEYWORD: { test: RegExp; section: SectionId }[] = [
  { test: /^(led|managed|built|designed|developed|delivered|improved|increased|reduced)/i, section: "experience" },
  { test: /(certif|certificate|pmp|cisa|cpa|license)/i, section: "certifications" },
  {
    test: /(volunteer|community|club|society|committee|mentor|leadership)/i,
    section: "extracurriculars",
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
  const contactChecks = [
    { label: "Name present", passed: Boolean(doc.contact.name.trim()), points: 4 },
    { label: "Email present & valid", passed: emailOk, points: 3 },
    { label: "Phone present", passed: Boolean(doc.contact.phone?.trim()), points: 3 },
    { label: "Location present", passed: Boolean(doc.contact.location?.trim()), points: 2 },
    {
      label: "LinkedIn, website, or GitHub",
      passed: Boolean(
        doc.contact.linkedin?.trim() || doc.contact.website?.trim() || doc.contact.github?.trim(),
      ),
      points: 3,
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
  const sectionPoints: { label: string; present: boolean; points: number }[] = [
    { label: "Summary", present: !isSectionEmpty(doc, "summary"), points: 6 },
    { label: "Experience", present: !isSectionEmpty(doc, "experience"), points: 8 },
    { label: "Education", present: !isSectionEmpty(doc, "education"), points: 5 },
    { label: "Skills", present: !isSectionEmpty(doc, "skills"), points: 5 },
    {
      label: "Projects or certifications",
      present: !isSectionEmpty(doc, "projects") || !isSectionEmpty(doc, "certifications"),
      points: 3,
    },
    {
      label: "Languages or interests",
      present: !isSectionEmpty(doc, "languages") || !isSectionEmpty(doc, "interests"),
      points: 3,
    },
  ];
  const sectionScore = sectionPoints.filter((s) => s.present).reduce((a, s) => a + s.points, 0);

  const hasJd = jobDescription.trim().length > 0;

  // 3. Keyword match (weight 35)
  let keywordScore = 0;
  let missingKeywords: AtsSuggestion[] = [];
  if (hasJd) {
    const jdTokens = tokenize(jobDescription);
    const freq = new Map<string, number>();
    for (const t of jdTokens) freq.set(t, (freq.get(t) ?? 0) + 1);
    const keywords = [...freq.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 40)
      .map(([k]) => k);
    const resumeText = resumeToText(doc).toLowerCase();
    const matched = keywords.filter((k) => resumeText.includes(k));
    const coverage = keywords.length ? matched.length / keywords.length : 0;
    keywordScore = Math.round(coverage * 35);
    missingKeywords = keywords
      .filter((k) => !matched.includes(k))
      .slice(0, 15)
      .map((k) => ({ keyword: k, recommendedSection: suggestSection(k) }));
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
    checks: sectionPoints.map((s) => ({
      label: s.label,
      passed: s.present,
      points: s.points,
    })),
  });

  // 4. Formatting / ATS-safety (weight 20)
  const descriptor = getTemplateDescriptor(settings.templateId);
  const formatChecks = [
    { label: "ATS-safe template", passed: descriptor.atsSafe, points: 8 },
    { label: "Single reading order layout", passed: descriptor.columns <= 2, points: 4 },
    {
      label: "No empty sections forced visible",
      passed: (Object.keys(doc.sectionVisibility) as SectionId[]).every(
        (id) => !doc.sectionVisibility[id] || !isSectionEmpty(doc, id),
      ),
      points: 4,
    },
    { label: "Semantic bullet lists", passed: true, points: 4 },
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
