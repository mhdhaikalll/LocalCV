import { describe, expect, it } from "vitest";
import { createEmptyCoverLetter, sanitizeCoverLetter } from "@/lib/schema";
import { coverLetterToText, formatDate } from "@/lib/cover-letter/to-text";

function letter(overrides: Record<string, unknown> = {}) {
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
    ...overrides,
  });
}

describe("coverLetterToText", () => {
  it("separates blocks with one blank line", () => {
    const text = coverLetterToText(letter(), "Priya Raman");
    expect(text).toContain("First paragraph.\n\nSecond paragraph.");
  });

  it("includes the recipient, date, subject and greeting", () => {
    const text = coverLetterToText(letter(), "Priya Raman");

    expect(text).toContain("Ms Priya Chen");
    expect(text).toContain("Engineering Manager");
    expect(text).toContain("12 Harbour Road");
    expect(text).toContain("Singapore 049213");
    expect(text).toContain("24 October 2026");
    expect(text).toContain("Application for Senior Backend Engineer");
    expect(text).toContain("Dear Ms Chen,");
  });

  it("ends with the sign-off and signature on consecutive lines", () => {
    const text = coverLetterToText(letter(), "Priya Raman");
    expect(text.trimEnd().endsWith("Sincerely,\nPriya Raman")).toBe(true);
  });

  it("falls back to the contact name when signature is blank", () => {
    const text = coverLetterToText(letter({ signature: "" }), "Priya Raman");
    expect(text.trimEnd().endsWith("Priya Raman")).toBe(true);
  });

  it("omits an absent recipient block rather than leaving a gap", () => {
    const bare = createEmptyCoverLetter();
    bare.paragraphs = ["Only paragraph."];
    bare.greeting = "Hello,";

    const text = coverLetterToText(bare, "Priya Raman");
    // The sender block has no name on an empty contact, so the greeting opens.
    expect(text).toContain("Hello,");
    expect(text.indexOf("Hello,")).toBeLessThan(text.indexOf("Only paragraph."));
    expect(text).not.toContain("\n\n\n");
  });

  it("skips blank paragraphs", () => {
    const text = coverLetterToText(
      letter({ paragraphs: ["One.", "", "   ", "Two."] }),
      "Priya Raman",
    );

    expect(text).toContain("One.\n\nTwo.");
    expect(text).not.toContain("\n\n\n");
  });

  it("never leaves three consecutive newlines", () => {
    const text = coverLetterToText(letter(), "Priya Raman");
    expect(text).not.toMatch(/\n{3,}/);
  });

  it("round-trips paragraph breaks through a textarea-shaped string", () => {
    const text = coverLetterToText(letter(), "Priya Raman");
    const paragraphs = text.split("\n\n").filter((block) => block.includes("paragraph."));

    expect(paragraphs).toEqual(["First paragraph.", "Second paragraph."]);
  });
});

describe("formatDate", () => {
  it("formats an ISO date without locale dependence", () => {
    expect(formatDate("2026-10-24")).toBe("24 October 2026");
    expect(formatDate("2024-02-29")).toBe("29 February 2024");
    expect(formatDate("2026-01-01")).toBe("1 January 2026");
  });

  it("returns the input unchanged when it is not an ISO date", () => {
    expect(formatDate("24/10/2026")).toBe("24/10/2026");
    expect(formatDate("")).toBe("");
  });

  it("does not roll an out-of-range month over", () => {
    expect(formatDate("2026-13-01")).toBe("2026-13-01");
  });
});
