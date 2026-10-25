import { z } from "zod";

/**
 * A cover letter is deliberately *not* part of `ResumeDocument`.
 *
 * It has no section order or visibility, and folding it into the document would
 * force a migration on every saved resume plus every `sanitizeDocument` call.
 * It is stored beside the document with its own key and its own sanitizer.
 */

/** Blank optional inputs arrive as "" from text inputs; treat them as absent. */
function blankToUndefined(value: unknown): unknown {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed === "" ? undefined : trimmed;
  }
  return value;
}

const optionalText = z.preprocess(blankToUndefined, z.string().optional());

export const COVER_LETTER_TONES = ["direct", "warm", "formal"] as const;
export const CoverLetterToneSchema = z.enum(COVER_LETTER_TONES);
export type CoverLetterTone = z.infer<typeof CoverLetterToneSchema>;

export const CoverLetterLayoutSchema = z.object({
  fontFamily: z.string().default("Inter"),
  fontSize: z.number().min(8).max(16).default(10.5),
  lineHeight: z.number().min(1).max(2).default(1.4),
  pageSize: z.enum(["A4", "Letter"]).default("Letter"),
  margins: z.number().min(0).max(48).default(18),
});
export type CoverLetterLayout = z.infer<typeof CoverLetterLayoutSchema>;

export const CoverLetterRecipientSchema = z.object({
  name: optionalText,
  title: optionalText,
  company: optionalText,
  /** One to three lines, newline separated. */
  address: optionalText,
});
export type CoverLetterRecipient = z.infer<typeof CoverLetterRecipientSchema>;

export const MAX_PARAGRAPHS = 12;
export const MAX_PARAGRAPH_LENGTH = 3000;

export const CoverLetterSchema = z.object({
  version: z.literal(1),
  recipient: z.preprocess((v) => v ?? {}, CoverLetterRecipientSchema),
  jobTitle: z.string().default(""),
  company: z.string().default(""),
  /** ISO date, formatted for display at render time. */
  date: z.string().default(""),
  subject: optionalText,
  greeting: z.string().default(""),
  paragraphs: z.array(z.string()).max(MAX_PARAGRAPHS).default([]),
  signOff: z.string().default("Sincerely,"),
  /** Defaults to the resume's contact name at render time. */
  signature: z.string().default(""),
  tone: CoverLetterToneSchema.default("direct"),
  layout: z.preprocess((v) => v ?? {}, CoverLetterLayoutSchema),
});
export type CoverLetter = z.infer<typeof CoverLetterSchema>;

/** `YYYY-MM-DD` with real calendar values (rejects 2026-02-31). */
export function isValidIsoDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return false;
  return parsed.toISOString().slice(0, 10) === value;
}

/** Local (not UTC) today, so the letter is not dated tomorrow near midnight. */
export function todayIso(): string {
  const now = new Date();
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

export function createEmptyCoverLetter(): CoverLetter {
  return CoverLetterSchema.parse({
    version: 1,
    date: todayIso(),
  });
}

function str(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function clampNumber(value: unknown, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || Number.isNaN(value)) return fallback;
  return Math.min(max, Math.max(min, value));
}

function optional(value: unknown): string | undefined {
  const candidate = str(value).trim();
  return candidate === "" ? undefined : candidate;
}

/**
 * Repair arbitrary persisted or imported data into a valid cover letter.
 *
 * Mirrors `sanitizeDocument`: field-by-field repair rather than all-or-nothing,
 * so one bad field never discards a drafted letter.
 */
export function sanitizeCoverLetter(input: unknown): CoverLetter {
  const raw = record(input);

  const paragraphs = (Array.isArray(raw.paragraphs) ? raw.paragraphs : [])
    .filter((p): p is string => typeof p === "string")
    .map((p) => p.slice(0, MAX_PARAGRAPH_LENGTH))
    .slice(0, MAX_PARAGRAPHS);

  const recipientRaw = record(raw.recipient);
  const layoutRaw = record(raw.layout);

  const date = str(raw.date).trim();
  const tone = CoverLetterToneSchema.safeParse(raw.tone);

  const candidate = {
    version: 1 as const,
    recipient: {
      name: optional(recipientRaw.name),
      title: optional(recipientRaw.title),
      company: optional(recipientRaw.company),
      address: optional(recipientRaw.address),
    },
    jobTitle: str(raw.jobTitle),
    company: str(raw.company),
    date: isValidIsoDate(date) ? date : todayIso(),
    subject: optional(raw.subject),
    greeting: str(raw.greeting),
    paragraphs,
    // A blank sign-off leaves the letter without a closing, so it falls back.

    signOff: str(raw.signOff).trim() || "Sincerely,",
    signature: str(raw.signature),
    tone: tone.success ? tone.data : "direct",
    layout: {
      fontFamily: str(layoutRaw.fontFamily) || "Inter",
      fontSize: clampNumber(layoutRaw.fontSize, 8, 16, 10.5),
      lineHeight: clampNumber(layoutRaw.lineHeight, 1, 2, 1.4),
      pageSize: layoutRaw.pageSize === "A4" ? ("A4" as const) : ("Letter" as const),
      margins: clampNumber(layoutRaw.margins, 0, 48, 18),
    },
  };

  const parsed = CoverLetterSchema.safeParse(candidate);
  return parsed.success ? parsed.data : createEmptyCoverLetter();
}

/** Whether the letter has anything worth showing or exporting. */
export function isCoverLetterEmpty(letter: CoverLetter): boolean {
  return (
    letter.company.trim() === "" &&
    letter.jobTitle.trim() === "" &&
    letter.paragraphs.every((p) => p.trim() === "")
  );
}
