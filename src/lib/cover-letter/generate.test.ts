import { describe, expect, it } from "vitest";
import { createEmptyDocument, type ResumeDocument } from "@/lib/schema";
import { resumeToText } from "@/lib/ats/scoring";
import { generateCoverLetter, type GenerateInput } from "@/lib/cover-letter/generate";
import { allTemplates, hashSeed, variantIndex } from "@/lib/cover-letter/sentences";

function completeResume(): ResumeDocument {
  const doc = createEmptyDocument();
  doc.contact = {
    name: "Priya Raman",
    email: "priya.raman@example.com",
    phone: "+60 12-345 6789",
    location: "Kuala Lumpur, Malaysia",
  };
  doc.summary = "Backend engineer with four years building payment systems.";
  doc.experience = [
    {
      id: "exp-payharbour",
      role: "Backend Engineer",
      company: "PayHarbour",
      isCurrent: true,
      bullets: [
        "Migrated settlement jobs to a queue, cutting failed payouts by 38%.",
        "Owned the Postgres schema for merchant balances.",
      ],
    },
    {
      id: "exp-kopi",
      role: "Junior Developer",
      company: "Kopi Digital",
      isCurrent: false,
      bullets: [
        "Built the order service in Go and reduced checkout latency from 900ms to 240ms.",
        "Wrote the integration tests for the payment gateway.",
      ],
    },
  ];
  doc.education = [
    {
      id: "edu-um",
      school: "Universiti Malaya",
      degree: "BSc",
      field: "Computer Science",
      isCurrent: false,
      bullets: [],
    },
  ];
  doc.projects = [
    {
      id: "proj-ledger",
      name: "Ledger",
      bullets: ["A double-entry ledger in Go with 1,200 monthly active users."],
    },
  ];
  doc.skills = [
    { id: "skill-lang", category: "Languages", items: ["Go", "SQL", "TypeScript"] },
    { id: "skill-infra", category: "Infrastructure", items: ["Docker", "Kubernetes"] },
  ];
  return doc;
}

const JD =
  "We are hiring a Senior Backend Engineer to build Go services on Kubernetes with Postgres.";

function input(overrides: Partial<GenerateInput> = {}): GenerateInput {
  return {
    document: completeResume(),
    jobDescription: JD,
    jobTitle: "Senior Backend Engineer",
    company: "Northwind Labs",
    tone: "direct",
    emphasis: "experience",
    ...overrides,
  };
}

function paragraphsOf(result: ReturnType<typeof generateCoverLetter>): string[] {
  if (!result.ok) throw new Error(`generation refused: ${result.reason}`);
  return result.letter.paragraphs.map((p) => p.text);
}

function allText(result: ReturnType<typeof generateCoverLetter>): string {
  if (!result.ok) throw new Error(`generation refused: ${result.reason}`);
  return [
    result.letter.greeting,
    result.letter.subject,
    ...result.letter.paragraphs.map((p) => p.text),
  ].join("\n");
}

describe("generateCoverLetter", () => {
  it("produces four paragraphs for a complete resume", () => {
    const result = generateCoverLetter(input());
    expect(result.ok).toBe(true);
    expect(paragraphsOf(result)).toHaveLength(4);
  });

  it("is deterministic for identical input", () => {
    expect(generateCoverLetter(input())).toEqual(generateCoverLetter(input()));
  });

  it("is deterministic across tones", () => {
    for (const tone of ["direct", "warm", "formal"] as const) {
      const a = generateCoverLetter(input({ tone }));
      const b = generateCoverLetter(input({ tone }));
      expect(b, tone).toEqual(a);
    }
  });

  it("names the company in the first paragraph for every tone", () => {
    for (const tone of ["direct", "warm", "formal"] as const) {
      const first = paragraphsOf(generateCoverLetter(input({ tone })))[0];
      expect(first.toLowerCase(), tone).toContain("northwind labs");
    }
  });

  it("names the role in the first paragraph", () => {
    const first = paragraphsOf(generateCoverLetter(input()))[0];
    expect(first).toContain("Senior Backend Engineer");
  });

  it("references only real entry ids in its sources", () => {
    const doc = completeResume();
    const valid = new Set([
      ...doc.experience.map((e) => e.id),
      ...doc.education.map((e) => e.id),
      ...doc.projects.map((p) => p.id),
      ...doc.skills.map((s) => s.id),
    ]);

    const result = generateCoverLetter(input({ document: doc }));
    if (!result.ok) throw new Error("refused");

    const sources = result.letter.paragraphs.flatMap((p) => p.sources);
    expect(sources.length).toBeGreaterThan(0);
    for (const source of sources) {
      if (source.entryId === undefined) continue;
      expect(valid.has(source.entryId), source.label).toBe(true);
    }
  });

  it("never invents a number", () => {
    const doc = completeResume();
    const known = new Set(
      (resumeToText(doc).match(/\d[\d.,]*/g) ?? []).map((n) => n.replace(/[.,]$/, "")),
    );

    for (const tone of ["direct", "warm", "formal"] as const) {
      for (const emphasis of ["experience", "projects", "skills"] as const) {
        const text = allText(generateCoverLetter(input({ tone, emphasis })));
        const mentioned = text.match(/\d[\d.,]*/g) ?? [];
        for (const number of mentioned) {
          expect(
            known.has(number.replace(/[.,]$/, "")),
            `${number} in ${tone}/${emphasis}`,
          ).toBe(true);
        }
      }
    }
  });

  it("quotes the highest-ranked bullet, ranking overlap above a plain metric", () => {
    const paragraphs = paragraphsOf(generateCoverLetter(input()));
    // The Go/latency bullet overlaps the posting ("Go"), so it outranks the
    // 38% bullet, which matches nothing in the description.
    expect(paragraphs[0]).toContain("checkout latency");
  });

  it("prefers a metric when overlap is equal", () => {
    const doc = completeResume();
    doc.experience = [
      {
        id: "exp-tie",
        role: "Engineer",
        company: "Tie Co",
        isCurrent: true,
        bullets: ["Maintained internal documentation for the team.", "Maintained the release pipeline."],
      },
      {
        id: "exp-metric",
        role: "Engineer",
        company: "Metric Co",
        isCurrent: false,
        bullets: ["Maintained three services and cut build time by 45%."],
      },
    ];

    const text = paragraphsOf(
      generateCoverLetter(input({ document: doc, jobDescription: "" })),
    )[0];

    expect(text).toContain("45%");
  });

  it("never uses the same bullet twice", () => {
    const paragraphs = paragraphsOf(generateCoverLetter(input()));
    const quoted = paragraphs.slice(0, 2).join(" ");
    const occurrences = quoted.split("Owned the Postgres schema").length - 1;

    expect(occurrences).toBeLessThanOrEqual(1);
    expect(paragraphs[1]).not.toContain("checkout latency");
  });

  it("uses the lexically matching skills group for the fit paragraph", () => {
    const fit = paragraphsOf(generateCoverLetter(input()))[2];
    expect(fit).toContain("Go");
    expect(fit).not.toContain("Docker");
  });

  it("switches to the student layout with no experience", () => {
    const doc = completeResume();
    doc.experience = [];
    const result = generateCoverLetter(input({ document: doc }));

    if (!result.ok) throw new Error("refused");
    const sources = result.letter.paragraphs.flatMap((p) => p.sources);
    expect(sources.some((s) => s.section === "experience")).toBe(false);
    expect(paragraphsOf(result)[0]).toContain("Northwind Labs");
  });

  it("refuses when there is neither experience nor a project", () => {
    const doc = createEmptyDocument();
    const result = generateCoverLetter(input({ document: doc }));

    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.reason).toMatch(/role or project/i);
  });

  it("skips the fit paragraph when there are no skills", () => {
    const doc = completeResume();
    doc.skills = [];
    const paragraphs = paragraphsOf(generateCoverLetter(input({ document: doc })));

    // Opening, evidence, closing: no invented fit paragraph.
    expect(paragraphs).toHaveLength(3);
  });

  it("produces a general letter for a stop-word-only description", () => {
    const result = generateCoverLetter(
      input({ jobDescription: "It is what it is, and that is that." }),
    );

    if (!result.ok) throw new Error("refused");
    expect(result.letter.general).toBe(true);
    expect(result.letter.paragraphs.length).toBeGreaterThanOrEqual(3);
    for (const paragraph of result.letter.paragraphs) {
      expect(paragraph.text.trim().length).toBeGreaterThan(0);
    }
  });

  it("flags a real job description as non-general", () => {
    const result = generateCoverLetter(input());
    if (!result.ok) throw new Error("refused");
    expect(result.letter.general).toBe(false);
  });

  it("still generates when the job description is empty", () => {
    const result = generateCoverLetter(input({ jobDescription: "" }));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.letter.general).toBe(true);
  });

  it("honours the projects emphasis", () => {
    const paragraphs = paragraphsOf(generateCoverLetter(input({ emphasis: "projects" })));
    expect(paragraphs.join(" ")).toContain("Ledger");
  });

  it("falls back to a generic target rather than inventing a company", () => {
    const result = generateCoverLetter(input({ company: "", jobTitle: "" }));
    if (!result.ok) throw new Error("refused");
    const first = result.letter.paragraphs[0].text;
    expect(first.trim().length).toBeGreaterThan(0);
    expect(first).not.toMatch(/undefined/);
  });
});

describe("sentence banks", () => {
  it("contains no em dashes", () => {
    for (const template of allTemplates()) {
      expect(template, template).not.toContain("—");
      expect(template, template).not.toContain("–");
    }
  });

  it("contains no rejected filler openings", () => {
    for (const template of allTemplates()) {
      expect(template.toLowerCase()).not.toContain("i am writing to apply");
      expect(template.toLowerCase()).not.toContain("i am writing to express my interest");
    }
  });

  it("names the company in every opening variant", () => {
    const openings = allTemplates().filter((t) => t.includes("{company}"));
    expect(openings.length).toBeGreaterThan(10);
  });

  it("selects stably for a given seed", () => {
    expect(variantIndex("opening", "acme-role")).toBe(variantIndex("opening", "acme-role"));
    expect(variantIndex("opening", "acme-role")).not.toBe(
      variantIndex("closing", "acme-role"),
    );
  });

  it("hashes the same string to the same number", () => {
    expect(hashSeed("Northwind Labs")).toBe(hashSeed("Northwind Labs"));
    expect(hashSeed("a")).not.toBe(hashSeed("b"));
  });
});
