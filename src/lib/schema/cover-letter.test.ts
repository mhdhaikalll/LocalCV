import { describe, expect, it } from "vitest";
import {
  CoverLetterSchema,
  MAX_PARAGRAPHS,
  MAX_PARAGRAPH_LENGTH,
  createEmptyCoverLetter,
  isCoverLetterEmpty,
  isValidIsoDate,
  sanitizeCoverLetter,
  todayIso,
} from "@/lib/schema/cover-letter";
import {
  ExportEnvelopeSchema,
  buildExportEnvelope,
  createDefaultSettings,
  createEmptyDocument,
  sanitizeDocument,
} from "@/lib/schema";

function fullLetter() {
  return sanitizeCoverLetter({
    version: 1,
    recipient: {
      name: "Ms Priya Chen",
      title: "Engineering Manager",
      company: "Northwind Labs",
      address: "12 Harbour Road\nSingapore 049213",
    },
    jobTitle: "Senior Backend Engineer",
    company: "Northwind Labs",
    date: "2026-10-24",
    subject: "Application for Senior Backend Engineer",
    greeting: "Dear Ms Chen,",
    paragraphs: ["First paragraph.", "Second paragraph."],
    signOff: "Sincerely,",
    signature: "Priya Raman",
    tone: "formal",
    layout: {
      fontFamily: "Georgia",
      fontSize: 11,
      lineHeight: 1.5,
      pageSize: "A4",
      margins: 24,
    },
  });
}

describe("createEmptyCoverLetter", () => {
  it("produces a usable, valid letter", () => {
    const letter = createEmptyCoverLetter();

    expect(() => CoverLetterSchema.parse(letter)).not.toThrow();
    expect(letter.version).toBe(1);
    expect(letter.paragraphs).toEqual([]);
    expect(letter.signOff).toBe("Sincerely,");
    expect(letter.signature).toBe("");
    expect(letter.tone).toBe("direct");
    expect(letter.layout.pageSize).toBe("Letter");
    expect(letter.layout.fontSize).toBe(10.5);
    expect(isValidIsoDate(letter.date)).toBe(true);
    expect(isCoverLetterEmpty(letter)).toBe(true);
  });
});

describe("sanitizeCoverLetter", () => {
  it("fills defaults for a missing or nonsense input", () => {
    for (const input of [undefined, null, 42, "nope", {}, []]) {
      const letter = sanitizeCoverLetter(input);
      expect(letter.version, String(input)).toBe(1);
      expect(letter.paragraphs).toEqual([]);
      expect(letter.recipient).toEqual({
        name: undefined,
        title: undefined,
        company: undefined,
        address: undefined,
      });
      expect(isValidIsoDate(letter.date)).toBe(true);
    }
  });

  it("drops unknown keys instead of failing", () => {
    const letter = sanitizeCoverLetter({ version: 1, nonsense: true, company: "Acme" });
    expect(letter.company).toBe("Acme");
    expect("nonsense" in letter).toBe(false);
  });

  it("accepts empty strings for optional recipient fields", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      recipient: { name: "", title: "  ", company: "", address: "" },
    });

    expect(letter.recipient.name).toBeUndefined();
    expect(letter.recipient.title).toBeUndefined();
    expect(letter.recipient.company).toBeUndefined();
    expect(letter.recipient.address).toBeUndefined();
  });

  it("clamps the paragraph count", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      paragraphs: Array.from({ length: MAX_PARAGRAPHS + 5 }, (_, i) => `p${i}`),
    });

    expect(letter.paragraphs).toHaveLength(MAX_PARAGRAPHS);
  });

  it("clamps each paragraph's length", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      paragraphs: ["x".repeat(MAX_PARAGRAPH_LENGTH + 500)],
    });

    expect(letter.paragraphs[0]).toHaveLength(MAX_PARAGRAPH_LENGTH);
  });

  it("drops non-string paragraphs", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      paragraphs: ["kept", 42, null, { text: "no" }, "also kept"],
    });

    expect(letter.paragraphs).toEqual(["kept", "also kept"]);
  });

  it("falls back to today for a malformed date", () => {
    for (const date of ["", "24/10/2026", "2026-13-01", "2026-02-31", "tomorrow"]) {
      const letter = sanitizeCoverLetter({ version: 1, date });
      expect(isValidIsoDate(letter.date), date).toBe(true);
      expect(letter.date, date).toBe(todayIso());
    }
  });

  it("keeps a valid date verbatim", () => {
    expect(sanitizeCoverLetter({ version: 1, date: "2024-02-29" }).date).toBe("2024-02-29");
  });

  it("clamps typography to the schema's ranges", () => {
    const letter = sanitizeCoverLetter({
      version: 1,
      layout: { fontSize: 99, lineHeight: -3, margins: 500, pageSize: "A3" },
    });

    expect(letter.layout.fontSize).toBe(16);
    expect(letter.layout.lineHeight).toBe(1);
    expect(letter.layout.margins).toBe(48);
    expect(letter.layout.pageSize).toBe("Letter");
  });

  it("falls back to a known tone", () => {
    expect(sanitizeCoverLetter({ version: 1, tone: "sassy" }).tone).toBe("direct");
    expect(sanitizeCoverLetter({ version: 1, tone: "warm" }).tone).toBe("warm");
  });

  it("restores the default sign-off when blank", () => {
    expect(sanitizeCoverLetter({ version: 1, signOff: "   " }).signOff).toBe("Sincerely,");
  });
});

describe("isCoverLetterEmpty", () => {
  it("is false once any paragraph exists", () => {
    const letter = createEmptyCoverLetter();
    letter.paragraphs = ["One line."];
    expect(isCoverLetterEmpty(letter)).toBe(false);
  });

  it("is false once a company is set", () => {
    const letter = createEmptyCoverLetter();
    letter.company = "Acme";
    expect(isCoverLetterEmpty(letter)).toBe(false);
  });

  it("ignores blank paragraphs", () => {
    const letter = createEmptyCoverLetter();
    letter.paragraphs = ["", "   "];
    expect(isCoverLetterEmpty(letter)).toBe(true);
  });
});

describe("envelope round trip", () => {
  it("imports an envelope without a cover letter", () => {
    const envelope = buildExportEnvelope(createEmptyDocument(), createDefaultSettings());

    expect("coverLetter" in envelope).toBe(false);
    const parsed = ExportEnvelopeSchema.parse(JSON.parse(JSON.stringify(envelope)));
    expect(parsed.coverLetter).toBeUndefined();
  });

  it("preserves a cover letter exactly across export and import", () => {
    const letter = fullLetter();
    const envelope = buildExportEnvelope(createEmptyDocument(), createDefaultSettings(), letter);
    const parsed = ExportEnvelopeSchema.parse(JSON.parse(JSON.stringify(envelope)));

    expect(parsed.coverLetter).toEqual(letter);
    expect(sanitizeDocument(parsed.document)).toEqual(createEmptyDocument());
  });

  it("accepts a newer envelope whose extra keys it does not know", () => {
    const envelope = {
      ...buildExportEnvelope(createEmptyDocument(), createDefaultSettings(), fullLetter()),
      somethingNew: { nested: true },
    };

    expect(ExportEnvelopeSchema.safeParse(envelope).success).toBe(true);
  });

  it("keeps the envelope version at 1 so older builds still open new files", () => {
    const envelope = buildExportEnvelope(
      createEmptyDocument(),
      createDefaultSettings(),
      fullLetter(),
    );
    expect(envelope.version).toBe(1);
  });
});

describe("store restore", () => {
  it("yields the empty letter for a payload saved before letters existed", () => {
    // Mirrors the `merge` branch in resume-store.ts.
    const restored = sanitizeCoverLetter(undefined);

    expect(restored).toEqual(createEmptyCoverLetter());
    expect(isCoverLetterEmpty(restored)).toBe(true);
  });

  it("restores a persisted letter through the sanitizer", () => {
    const letter = fullLetter();
    const restored = sanitizeCoverLetter(JSON.parse(JSON.stringify(letter)));
    expect(restored).toEqual(letter);
  });
});
