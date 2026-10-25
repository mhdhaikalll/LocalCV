import type { CoverLetter, ResumeDocument, SectionId } from "@/lib/schema";
import { resumeToText } from "@/lib/ats/scoring";
import { normalizeTerm, stem, tokenize } from "@/lib/ats/keywords";

export interface CheckResult {
  id: string;
  label: string;
  passed: boolean;
  /** One sentence explaining why the rule matters. */
  why: string;
  /** Section the user should edit, for a jump-to-fix affordance. */
  fixSection?: SectionId;
  /** What was measured, e.g. "268 words". */
  detail?: string;
}

export const MIN_WORDS = 220;
export const MAX_WORDS = 420;

/** Banned greetings: they address nobody in particular. */
const GENERIC_GREETINGS = [/to whom it may concern/i, /dear\s+sir\s*\/?\s*madam/i];

/** Banned openings, per the product's own house style. */
const FILLER_OPENINGS = [
  /i am writing to apply/i,
  /i am writing to express my interest/i,
];

const PLACEHOLDERS = [/\[company\]/i, /\{\{/, /lorem ipsum/i, /\[role\]/i, /xxx/i];

export function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

/** Every paragraph joined, which is what the prose checks read. */
export function letterBody(letter: CoverLetter): string {
  return letter.paragraphs.join("\n\n");
}

/**
 * Digits mentioned in the letter that do not appear anywhere in the resume.
 *
 * This is the check that matters most: an AI-drafted metric the candidate
 * cannot defend in an interview is the failure mode a cover letter generator
 * has to prevent. Percentages and plain numbers are compared by their digits,
 * so "38%" in the letter is satisfied by "38%" in a bullet.
 */
export function unsupportedNumbers(letter: CoverLetter, doc: ResumeDocument): string[] {
  const source = resumeToText(doc);
  const known = new Set(
    (source.match(/\d[\d.,]*/g) ?? []).map((value) => value.replace(/[.,]+$/, "")),
  );

  const mentioned = letterBody(letter).match(/\d[\d.,]*/g) ?? [];
  const missing: string[] = [];
  for (const value of mentioned) {
    const digits = value.replace(/[.,]+$/, "");
    if (!known.has(digits) && !missing.includes(digits)) missing.push(digits);
  }
  return missing;
}

/**
 * Does the letter name the role, allowing for light stemming?
 *
 * "Senior Backend Engineer" matches "backend engineering" because both reduce
 * to the same stems; a plain substring test would reject a legitimate rewording.
 */
export function namesRole(letter: CoverLetter, role: string): boolean {
  const wanted = tokenize(role).map(stem);
  if (!wanted.length) return true;

  const body = letterBody(letter);
  // Fast path: the posting's own wording appears verbatim.
  if (body.toLowerCase().includes(role.trim().toLowerCase())) return true;

  const present = new Set(tokenize(body).map(stem));
  // Every content word of the role must appear somewhere; order is not required,
  // because a sentence may legitimately reorder them.
  return wanted.every((token) => present.has(token));
}

/**
 * Estimate the letter's height in points, for the one-page check.
 *
 * A character-width approximation, not a layout engine: it exists so the check
 * works in a test without a DOM. The panel passes the real measured height when
 * it has one, and that value wins.
 */
export function estimateHeightPt(letter: CoverLetter): number {
  const pageWidthPt = letter.layout.pageSize === "A4" ? 595.28 : 612;
  const usableWidth = Math.max(80, pageWidthPt - letter.layout.margins * 2);
  const fontSize = letter.layout.fontSize;
  const lineHeight = fontSize * letter.layout.lineHeight;

  // Roughly half an em per character for a proportional sans-serif face.
  const charsPerLine = Math.max(20, Math.floor(usableWidth / (fontSize * 0.5)));

  const lines = (text: string) =>
    Math.max(1, Math.ceil(text.length / charsPerLine));

  let lineTotal = 0;
  lineTotal += lines(letter.date) + 2; // date plus its gap
  lineTotal += 3 + // sender block
    (letter.recipient.name ? 1 : 0) +
    (letter.recipient.title ? 1 : 0) +
    (letter.recipient.address ? letter.recipient.address.split("\n").length : 0) +
    1;
  if (letter.subject) lineTotal += lines(letter.subject) + 1;
  if (letter.greeting) lineTotal += 2;
  for (const paragraph of letter.paragraphs) {
    if (paragraph.trim()) lineTotal += lines(paragraph) + 1;
  }
  lineTotal += 4; // sign-off, signature and their spacing


  return lineTotal * lineHeight;
}

export interface RunChecksOptions {
  /**
   * Measured height of the rendered letter, in points. When present it replaces
   * the character-width estimate, so the one-page check reflects real layout.
   */
  measuredHeightPt?: number;
}

export function runCoverLetterChecks(
  letter: CoverLetter,
  doc: ResumeDocument,
  options: RunChecksOptions = {},
): CheckResult[] {
  const body = letterBody(letter);
  const words = wordCount(body);
  const company = letter.company.trim();
  const role = letter.jobTitle.trim();

  const usableHeightPt =
    (letter.layout.pageSize === "A4" ? 841.89 : 792) - letter.layout.margins * 2;
  const heightPt = options.measuredHeightPt ?? estimateHeightPt(letter);
  const pages = Math.max(1, Math.ceil(heightPt / usableHeightPt));

  const missingNumbers = unsupportedNumbers(letter, doc);
  const badGreeting = GENERIC_GREETINGS.some((pattern) => pattern.test(letter.greeting));
  const filler = FILLER_OPENINGS.find((pattern) => pattern.test(body));
  const placeholder = PLACEHOLDERS.find((pattern) => pattern.test(body));

  return [
    {
      id: "company",
      label: "Company named",
      passed: company === "" ? false : body.toLowerCase().includes(company.toLowerCase()),
      why: "A letter that never names the employer reads as a mail merge.",
      detail: company ? `Looking for "${company}"` : "No company entered",
    },
    {
      id: "role",
      label: "Role named",
      passed: role === "" ? false : namesRole(letter, role),
      why: "Naming the role shows the letter was written for this posting, not the last one.",
      detail: role ? `Looking for "${role}"` : "No job title entered",
    },
    {
      id: "length",
      label: `Length ${MIN_WORDS}-${MAX_WORDS} words`,
      passed: words >= MIN_WORDS && words <= MAX_WORDS,
      why: "Under 220 words reads as a note; over 420 stops being read at all.",
      detail: `${words} words`,
    },
    {
      id: "greeting",
      label: "Specific greeting",
      passed: !badGreeting,
      why: "\"To whom it may concern\" signals a letter sent to everyone.",
      detail: letter.greeting || "No greeting",
    },
    {
      id: "opening",
      label: "No filler opening",
      passed: !filler,
      why: "\"I am writing to apply\" spends the most valuable sentence saying nothing.",
      detail: filler ? "Remove the opening phrase" : undefined,
    },
    {
      id: "page",
      label: "One page",
      passed: pages === 1,
      why: "A cover letter that spills to a second page competes with the resume for attention.",
      detail: pages === 1 ? "Fits one page" : `About ${pages} pages`,
    },
    {
      id: "claims",
      label: "No unsupported numbers",
      passed: missingNumbers.length === 0,
      why: "Every figure here has to be one you can defend in the interview.",
      detail: missingNumbers.length
        ? `Not in your resume: ${missingNumbers.slice(0, 5).join(", ")}`
        : undefined,
      fixSection: "experience",
    },
    {
      id: "placeholders",
      label: "No placeholder text",
      passed: !placeholder,
      why: "A leftover placeholder is the most visible possible mistake.",
      detail: placeholder ? `Found "${placeholder.source}"` : undefined,
    },
  ];
}

/** Convenience for the panel's compact header. */
export function checkSummary(results: CheckResult[]): { passed: number; total: number } {
  return {
    passed: results.filter((result) => result.passed).length,
    total: results.length,
  };
}

export { normalizeTerm };
