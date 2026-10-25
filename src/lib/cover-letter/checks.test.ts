import { describe, expect, it } from "vitest";
import { createEmptyDocument, sanitizeCoverLetter, type ResumeDocument } from "@/lib/schema";
import {
  MAX_WORDS,
  MIN_WORDS,
  estimateHeightPt,
  namesRole,
  runCoverLetterChecks,
  unsupportedNumbers,
  wordCount,
} from "@/lib/cover-letter/checks";
import { generateCoverLetter } from "@/lib/cover-letter/generate";

function resume(): ResumeDocument {
  const doc = createEmptyDocument();
  doc.contact = {
    name: "Priya Raman",
    email: "priya.raman@example.com",
    phone: "+60 12-345 6789",
    location: "Kuala Lumpur, Malaysia",
  };
  doc.summary =
    "Backend engineer with four years building payment systems in Go and Postgres, " +
    "mostly on the parts where correctness matters more than throughput.";
  doc.experience = [
    {
      id: "exp-1",
      role: "Backend Engineer",
      company: "PayHarbour",
      isCurrent: true,
      bullets: [
        "Migrated settlement jobs to a queue, cutting failed payouts by 38%.",
        "Owned the Postgres schema for merchant balances.",
        "Led the migration from a single Postgres primary to a partitioned setup, which carried the team through two seasonal peaks without an incident.",
        "Wrote the runbook the on-call rotation still uses, and ran the incident reviews that followed each outage.",
        "Introduced contract tests between the settlement service and the ledger, which removed the weekly reconciliation meeting entirely.",
      ],
    },
    {
      id: "exp-2",
      role: "Junior Developer",
      company: "Kopi Digital",
      isCurrent: false,
      bullets: [
        "Built the order service in Go and reduced checkout latency from 900ms to 240ms over one quarter.",
        "Wrote the integration suite for the payment gateway, which caught two currency-rounding bugs before release.",
        "Moved the nightly reporting job off the primary database, which stopped the morning slowdown during month-end close.",
        "Reviewed every schema change before it reached production, and wrote the migration checklist the team still follows.",
      ],
    },
  ];
  doc.education = [
    {
      id: "edu-1",
      school: "Universiti Malaya",
      degree: "BSc",
      field: "Computer Science",
      isCurrent: false,
      bullets: [],
    },
  ];
  doc.projects = [
    { id: "proj-1", name: "Ledger", bullets: ["A ledger in Go with 1200 monthly users."] },
  ];
  doc.skills = [
    { id: "skill-1", category: "Languages", items: ["Go", "SQL", "TypeScript"] },
    { id: "skill-2", category: "Infrastructure", items: ["Docker", "Kubernetes"] },
  ];
  return doc;
}

const FILLER =
  "I built payment infrastructure in Go and Postgres, and I have spent four years " +
  "close to the parts of a system where money moves and failures are expensive. " +
  "Much of that work has been unglamorous: reconciling ledgers, untangling a queue " +
  "that had drifted out of order, and writing the migration that nobody wanted to " +
  "own. I like that work. It rewards patience and a tolerance for detail, and it " +
  "means the people downstream can trust the numbers they see. I would bring the " +
  "same temperament to Northwind Labs. ";

const FILLER_TWO =
  "On the technical side I work mostly in Go and SQL, with TypeScript where the " +
  "product needs a surface. I have run Postgres in production long enough to have " +
  "opinions about indexes, and I have debugged enough queue backlogs to know that " +
  "the fix is usually upstream of where the alarm fires. I read code before I " +
  "change it, I write the test that would have caught the bug, and I would rather " +
  "ship something small on Friday than something large on Monday. ";

/** A letter that passes every rule. */
function passingLetter() {
  return sanitizeCoverLetter({
    version: 1,
    recipient: { name: "Ms Priya Chen", title: "Engineering Manager" },
    jobTitle: "Senior Backend Engineer",
    company: "Northwind Labs",
    date: "2026-10-24",
    subject: "Application for Senior Backend Engineer",
    greeting: "Dear Ms Chen,",
    paragraphs: [
      `I am applying for the Senior Backend Engineer role at Northwind Labs. ${FILLER}`,
      FILLER_TWO,
      "Much of the value I would bring is in how I approach a system rather than in " +
        "any single tool. I start by reading the code and the incident history, then " +
        "work out where the next failure is most likely to come from. That habit has " +
        "saved more hours than any optimisation I have written, and it is the part of " +
        "the job I would want to keep doing here.",
      "I would welcome the chance to talk through any of this at your convenience.",
    ],
    signOff: "Sincerely,",
    signature: "Priya Raman",
    tone: "direct",
  });
}

function failing(overrides: Record<string, unknown>) {
  return sanitizeCoverLetter({ ...passingLetter(), ...overrides });
}

describe("wordCount", () => {
  it("counts words across lines", () => {
    expect(wordCount("one two\nthree")).toBe(3);
    expect(wordCount("   ")).toBe(0);
  });
});

describe("runCoverLetterChecks", () => {
  it("passes every rule for a well-formed letter", () => {
    const results = runCoverLetterChecks(passingLetter(), resume());

    for (const result of results) {
      expect(result.passed, `${result.id}: ${result.detail ?? ""}`).toBe(true);
    }
  });

  it("gives every check a label, a why and an id", () => {
    const results = runCoverLetterChecks(passingLetter(), resume());
    const ids = results.map((result) => result.id);

    expect(new Set(ids).size).toBe(ids.length);
    for (const result of results) {
      expect(result.label.trim().length).toBeGreaterThan(3);
      expect(result.why.trim().length).toBeGreaterThan(15);
    }
  });

  // ---- One failing fixture per rule ----
  it("fails when the company is never named", () => {
    const letter = failing({
      company: "Northwind Labs",
      paragraphs: passingLetter().paragraphs.map((p) =>
        p.replaceAll("Northwind Labs", "the company"),
      ),
    });
    const check = runCoverLetterChecks(letter, resume()).find((r) => r.id === "company");

    expect(check?.passed).toBe(false);
  });

  it("fails when the role is never named", () => {
    const letter = failing({
      jobTitle: "Staff Platform Engineer",
      paragraphs: passingLetter().paragraphs.map((p) =>
        p.replaceAll("Senior Backend Engineer", "this position"),
      ),
    });
    const check = runCoverLetterChecks(letter, resume()).find((r) => r.id === "role");

    expect(check?.passed).toBe(false);
  });

  it("fails when the letter is too short", () => {
    const letter = failing({ paragraphs: ["Too short."] });
    const check = runCoverLetterChecks(letter, resume()).find((r) => r.id === "length");

    expect(check?.passed).toBe(false);
    expect(wordCount(letter.paragraphs.join(" "))).toBeLessThan(MIN_WORDS);
  });

  it("fails when the letter is too long", () => {
    const long = Array.from({ length: 20 }, () => FILLER).join(" ");
    const letter = failing({ paragraphs: [long] });
    const check = runCoverLetterChecks(letter, resume()).find((r) => r.id === "length");

    expect(check?.passed).toBe(false);
    expect(wordCount(long)).toBeGreaterThan(MAX_WORDS);
  });

  it("fails on 'To whom it may concern'", () => {
    const letter = failing({ greeting: "To whom it may concern," });
    const check = runCoverLetterChecks(letter, resume()).find((r) => r.id === "greeting");

    expect(check?.passed).toBe(false);
  });

  it("fails on 'Dear Sir/Madam'", () => {
    for (const greeting of ["Dear Sir/Madam,", "Dear Sir / Madam,", "dear sir/madam,"]) {
      const letter = failing({ greeting });
      const check = runCoverLetterChecks(letter, resume()).find((r) => r.id === "greeting");
      expect(check?.passed, greeting).toBe(false);
    }
  });

  it("fails on a filler opening", () => {
    for (const opening of [
      "I am writing to apply for the role. ",
      "I am writing to express my interest in this position. ",
    ]) {
      const letter = failing({
        paragraphs: [opening + passingLetter().paragraphs.join(" ")],
      });
      const check = runCoverLetterChecks(letter, resume()).find((r) => r.id === "opening");
      expect(check?.passed, opening).toBe(false);
    }
  });

  it("fails when the text does not fit one page", () => {
    const letter = failing({ paragraphs: [FILLER, FILLER, FILLER, FILLER, FILLER] });
    const results = runCoverLetterChecks(letter, resume());
    const check = results.find((r) => r.id === "page");

    // Force the measurement rather than trusting the estimate.
    const forced = runCoverLetterChecks(letter, resume(), { measuredHeightPt: 2000 });
    expect(forced.find((r) => r.id === "page")?.passed).toBe(false);
    expect(check).toBeDefined();
  });

  it("passes the one-page check when the measured height fits", () => {
    const results = runCoverLetterChecks(passingLetter(), resume(), {
      measuredHeightPt: 400,
    });
    expect(results.find((r) => r.id === "page")?.passed).toBe(true);
  });

  it("fails when the letter invents a number", () => {
    const letter = failing({
      paragraphs: [...passingLetter().paragraphs, "I cut costs by 87% in one quarter."],
    });
    const check = runCoverLetterChecks(letter, resume()).find((r) => r.id === "claims");

    expect(check?.passed).toBe(false);
    expect(check?.detail).toContain("87");
  });

  it("passes when a number matches the resume", () => {
    const letter = failing({
      paragraphs: [...passingLetter().paragraphs, "One migration cut failed payouts by 38%."],
    });
    const check = runCoverLetterChecks(letter, resume()).find((r) => r.id === "claims");
    expect(check?.passed).toBe(true);
  });

  it("fails on placeholder text", () => {
    for (const placeholder of ["[Company]", "{{role}}", "Lorem ipsum dolor"]) {
      const letter = failing({
        paragraphs: [...passingLetter().paragraphs, placeholder],
      });
      const check = runCoverLetterChecks(letter, resume()).find(
        (r) => r.id === "placeholders",
      );
      expect(check?.passed, placeholder).toBe(false);
    }
  });

  it("fails the role check when no job title is entered", () => {
    const check = runCoverLetterChecks(failing({ jobTitle: "" }), resume()).find(
      (r) => r.id === "role",
    );
    expect(check?.passed).toBe(false);
  });
});

describe("unsupportedNumbers", () => {
  it("returns the offending values once each", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      paragraphs: ["We saved 87% and 87% again, plus 1234 units."],
    });
    expect(unsupportedNumbers(letter, resume())).toEqual(["87", "1234"]);
  });

  it("accepts numbers present anywhere in the resume", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      paragraphs: ["Failed payouts fell 38% and the ledger served 1200 users."],
    });
    expect(unsupportedNumbers(letter, resume())).toEqual([]);
  });

  it("returns nothing for a letter with no digits", () => {
    const letter = sanitizeCoverLetter({ version: 1, paragraphs: ["No numbers here."] });
    expect(unsupportedNumbers(letter, resume())).toEqual([]);
  });
});

describe("namesRole", () => {
  it("matches the exact role", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      paragraphs: ["Applying for the Senior Backend Engineer role."],
    });
    expect(namesRole(letter, "Senior Backend Engineer")).toBe(true);
  });

  it("matches a stemmed variant", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      paragraphs: ["My backend engineering work and senior responsibilities."],
    });
    expect(namesRole(letter, "Senior Backend Engineering")).toBe(true);
  });

  it("rejects an unrelated role", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      paragraphs: ["Applying for the Graphic Designer role."],
    });
    expect(namesRole(letter, "Senior Backend Engineer")).toBe(false);
  });

  it("passes when no role was supplied", () => {
    const letter = sanitizeCoverLetter({ version: 1, paragraphs: ["Anything."] });
    expect(namesRole(letter, "")).toBe(true);
  });
});

describe("estimateHeightPt", () => {
  it("is deterministic and positive", () => {
    const a = estimateHeightPt(passingLetter());
    expect(a).toBeGreaterThan(0);
    expect(estimateHeightPt(passingLetter())).toBe(a);
  });

  it("grows with more text", () => {
    const short = estimateHeightPt(sanitizeCoverLetter({ version: 1, paragraphs: ["One."] }));
    const long = estimateHeightPt(passingLetter());
    expect(long).toBeGreaterThan(short);
  });
});

describe("generated letter against the checks", () => {
  const doc = resume();
  const result = generateCoverLetter({
    document: doc,
    jobDescription:
      "We are hiring a Senior Backend Engineer to build Go services on Kubernetes with Postgres.",
    jobTitle: "Senior Backend Engineer",
    company: "Northwind Labs",
    tone: "direct",
    emphasis: "experience",
  });

  it("generates successfully", () => {
    expect(result.ok).toBe(true);
  });

  it("passes every check", () => {
    if (!result.ok) throw new Error(result.reason);
    const letter = sanitizeCoverLetter({
      ...result.letter,
      jobTitle: "Senior Backend Engineer",
      company: "Northwind Labs",
      greeting: result.letter.greeting,
      paragraphs: result.letter.paragraphs.map((p) => p.text),
    });

    const checks = runCoverLetterChecks(letter, doc);
    const failed = checks.filter((check) => !check.passed);

    expect(
      failed.map((check) => `${check.id} (${check.detail ?? ""})`),
    ).toEqual([]);
  });
});
