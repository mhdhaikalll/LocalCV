import { describe, expect, it } from "vitest";
import {
  DEFAULT_SECTION_ORDER,
  SectionIdSchema,
  createDefaultSettings,
  createEmptyDocument,
  type ResumeDocument,
} from "@/lib/schema";
import { computeAtsScore, extractKeywords, resumeToText } from "@/lib/ats/scoring";

function fullDocument(): ResumeDocument {
  const doc = createEmptyDocument();
  doc.contact = {
    name: "Ada Lovelace",
    email: "ada@example.com",
    phone: "+44 20 7946 0000",
    location: "London, UK",
    website: "https://ada.example.com",
  };
  doc.summary = "Mathematician and first programmer.";
  doc.experience = [
    {
      id: "e1",
      role: "Analyst",
      company: "Analytical Engine",
      isCurrent: true,
      bullets: ["Wrote the first algorithm"],
    },
  ];
  doc.education = [
    { id: "ed1", school: "Private tuition", isCurrent: false, bullets: [] },
  ];
  doc.projects = [{ id: "p1", name: "Bernoulli notes", bullets: [] }];
  doc.skills = [{ id: "s1", category: "Mathematics", items: ["Calculus"] }];
  doc.certifications = [{ id: "c1", name: "Fellow of the Society" }];
  doc.extracurriculars = [
    { id: "x1", organization: "Salon", bullets: [] },
  ];
  doc.additional = { heading: "Publications", entries: [{ id: "a1", title: "Notes", bullets: [] }] };
  doc.references = [{ id: "r1", name: "Charles Babbage" }];
  doc.languages = ["English"];
  doc.interests = ["Chess"];
  return doc;
}

describe("computeAtsScore", () => {
  it("is deterministic", () => {
    const doc = fullDocument();
    const settings = createDefaultSettings();
    const jd = "Python engineer with machine learning, kubernetes and postgres experience";

    const first = computeAtsScore(doc, settings, jd);
    const second = computeAtsScore(doc, settings, jd);

    expect(second).toEqual(first);
    expect(second.missingKeywords).toEqual(first.missingKeywords);
  });

  it("keeps the total between 0 and 100", () => {
    const empty = computeAtsScore(createEmptyDocument(), createDefaultSettings(), "");
    const full = computeAtsScore(fullDocument(), createDefaultSettings(), "");
    const withJd = computeAtsScore(
      fullDocument(),
      createDefaultSettings(),
      "kubernetes terraform golang rust",
    );

    for (const result of [empty, full, withJd]) {
      expect(result.total).toBeGreaterThanOrEqual(0);
      expect(result.total).toBeLessThanOrEqual(100);
    }
  });

  it("totals 100 without a job description when everything passes", () => {
    const result = computeAtsScore(fullDocument(), createDefaultSettings(), "");
    expect(result.hasJobDescription).toBe(false);
    expect(result.total).toBe(100);
    expect(result.categories.reduce((a, c) => a + c.max, 0)).toBe(100);
  });

  it("totals 100 with a job description when everything passes", () => {
    const doc = fullDocument();
    const result = computeAtsScore(
      doc,
      createDefaultSettings(),
      "mathematician analytical engine algorithm calculus",
    );

    expect(result.hasJobDescription).toBe(true);
    expect(result.total).toBe(100);
    expect(result.categories.reduce((a, c) => a + c.max, 0)).toBe(100);
    expect(result.missingKeywords).toEqual([]);
  });

  it("caps missingKeywords at 15", () => {
    const jd = Array.from({ length: 60 }, (_, i) => `term${String.fromCharCode(97 + (i % 26))}x${i}`).join(" ");
    const result = computeAtsScore(createEmptyDocument(), createDefaultSettings(), jd);

    expect(result.missingKeywords.length).toBeLessThanOrEqual(15);
    expect(result.missingKeywords.length).toBeGreaterThan(0);
  });

  it("recommends a valid section for every missing keyword", () => {
    const result = computeAtsScore(
      createEmptyDocument(),
      createDefaultSettings(),
      "certified kubernetes administrator with volunteer leadership and university degree",
    );

    expect(result.missingKeywords.length).toBeGreaterThan(0);
    for (const suggestion of result.missingKeywords) {
      expect(SectionIdSchema.safeParse(suggestion.recommendedSection).success).toBe(true);
      expect(DEFAULT_SECTION_ORDER).toContain(suggestion.recommendedSection);
    }
  });

  it("includes text from every section in resumeToText", () => {
    const doc = fullDocument();
    const text = resumeToText(doc);

    expect(text).toContain("Publications");
    expect(text).toContain("Notes");
    expect(text).toContain("Salon");
    expect(text).toContain("Chess");
    expect(text).toContain("English");
    expect(text).toContain("Calculus");
    expect(text).toContain("Charles Babbage");
  });
});

describe("check explanations", () => {
  const inputs: [string, ResumeDocument, string][] = [
    ["empty document, no JD", createEmptyDocument(), ""],
    ["full document, no JD", fullDocument(), ""],
    ["empty document, with JD", createEmptyDocument(), "kubernetes terraform"],
    ["full document, with JD", fullDocument(), "kubernetes terraform"],
  ];

  it.each(inputs)("gives every check a non-empty why (%s)", (_name, doc, jd) => {
    const result = computeAtsScore(doc, createDefaultSettings(), jd);
    const checks = result.categories.flatMap((c) => c.checks);

    expect(checks.length).toBeGreaterThan(0);
    for (const check of checks) {
      expect(check.why.trim().length, check.label).toBeGreaterThan(10);
    }
  });

  it.each(inputs)("only anchors fixSection to real sections (%s)", (_name, doc, jd) => {
    const result = computeAtsScore(doc, createDefaultSettings(), jd);

    for (const check of result.categories.flatMap((c) => c.checks)) {
      if (check.fixSection === undefined) continue;
      expect(SectionIdSchema.safeParse(check.fixSection).success, check.label).toBe(true);
    }
  });

  it("does not offer a fix on informational formatting checks", () => {
    const result = computeAtsScore(fullDocument(), createDefaultSettings(), "");
    const formatting = result.categories.find((c) => c.id === "formatting");

    expect(formatting?.checks.every((c) => c.fixSection === undefined)).toBe(true);
  });

  it("anchors each section check to the section it grades", () => {
    const result = computeAtsScore(createEmptyDocument(), createDefaultSettings(), "");
    const sections = result.categories.find((c) => c.id === "sections");

    expect(sections?.checks.map((c) => c.fixSection)).toEqual([
      "summary",
      "experience",
      "education",
      "skills",
      "projects",
      "languages",
    ]);
  });

  it("offers no keyword fix when nothing is missing", () => {
    const doc = fullDocument();
    const result = computeAtsScore(
      doc,
      createDefaultSettings(),
      "mathematician analytical engine algorithm calculus",
    );
    const keywords = result.categories.find((c) => c.id === "keywords");

    expect(result.missingKeywords).toEqual([]);
    expect(keywords?.checks[0].fixSection).toBeUndefined();
  });
});

describe("keyword matching", () => {
  function docWith(text: string): ResumeDocument {
    const doc = createEmptyDocument();
    doc.contact.name = "Test Candidate";
    doc.skills = [{ id: "s1", category: "Skills", items: [text] }];
    return doc;
  }

  it("matches a stemmed verb across tenses", () => {
    const result = computeAtsScore(
      docWith("managed a team"),
      createDefaultSettings(),
      "manage a team of engineers",
    );
    expect(result.missingKeywords.map((k) => k.keyword)).not.toContain("manage");
  });

  it("extracts 'machine learning' as one keyword, not two", () => {
    const keywords = extractKeywords("Experience with machine learning models");
    const surfaces = keywords.map((k) => k.surface);

    expect(surfaces).toContain("machine learning");
    expect(surfaces).not.toContain("machine");
    expect(surfaces).not.toContain("learning");
  });

  it("matches React.js in the job description against React in the resume", () => {
    const result = computeAtsScore(
      docWith("React"),
      createDefaultSettings(),
      "Build interfaces with React.js and TypeScript",
    );
    expect(result.missingKeywords.map((k) => k.keyword)).not.toContain("react.js");
  });

  it("collapses K8s and Kubernetes onto one canonical term", () => {
    const keywords = extractKeywords("Kubernetes clusters and K8s operators");
    const kubernetes = keywords.filter((k) => k.canonical === "kubernetes");

    expect(kubernetes).toHaveLength(1);
    expect(kubernetes[0].weight).toBeGreaterThan(2);
  });

  it("reports the job description's own surface form for missing keywords", () => {
    const result = computeAtsScore(
      createEmptyDocument(),
      createDefaultSettings(),
      "We use PostgreSQL for storage",
    );
    const keyword = result.missingKeywords.find((k) => /postgres/i.test(k.keyword));
    expect(keyword?.keyword).toBe("postgresql");
  });

  it("produces no missing keywords for a stop-word-only description", () => {
    const result = computeAtsScore(
      createEmptyDocument(),
      createDefaultSettings(),
      "It is what it is, and that is that.",
    );

    expect(result.hasJobDescription).toBe(true);
    expect(result.missingKeywords).toEqual([]);
    expect(result.categories.find((c) => c.id === "keywords")?.score).toBe(0);
  });

  it("orders missing keywords by weight, then alphabetically", () => {
    const result = computeAtsScore(
      createEmptyDocument(),
      createDefaultSettings(),
      "terraform terraform terraform ansible docker docker",
    );
    const surfaces = result.missingKeywords.map((k) => k.keyword);

    expect(surfaces[0]).toBe("terraform");
    expect(surfaces.slice(1)).toEqual(["docker", "ansible"]);
  });
});
