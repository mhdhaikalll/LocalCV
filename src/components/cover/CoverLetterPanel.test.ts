import { describe, expect, it } from "vitest";
import { extractTarget, splitPolishedParagraphs } from "@/components/cover/CoverLetterPanel";

describe("extractTarget", () => {
  it("pulls a role from 'hiring a <Role>' and a company from 'at <Company>'", () => {
    const target = extractTarget(
      "We are hiring a Senior Backend Engineer at Northwind Labs to build Go services.",
    );

    expect(target.role).toBe("Senior Backend Engineer");
    expect(target.company).toBe("Northwind Labs");
  });

  it("handles 'hiring an'", () => {
    const target = extractTarget("Our team is hiring an Engineering Manager in Kuala Lumpur.");
    expect(target.role).toBe("Engineering Manager");
  });

  it("reads an explicit job title line", () => {
    const target = extractTarget("Job Title: Product Designer\nLocation: Remote");
    expect(target.role).toBe("Product Designer");
  });

  it("reads a position line", () => {
    expect(extractTarget("Position: Data Analyst").role).toBe("Data Analyst");
  });

  it("extracts a company ending in punctuation", () => {
    const target = extractTarget("Join us at Acme Corp.");
    expect(target.company).toBe("Acme Corp");
  });

  it("returns empty strings when nothing can be found", () => {
    const target = extractTarget("A short description with no target details.");

    expect(target.role).toBe("");
    expect(target.company).toBe("");
  });

  it("does not mistake a sentence word for a role", () => {
    const target = extractTarget("We are hiring a team of engineers.");
    expect(target.role).not.toBe("");
    expect(target.role.toLowerCase()).not.toContain("undefined");
  });

  it("survives an empty description", () => {
    expect(extractTarget("")).toEqual({ role: "", company: "" });
  });

  it("normalises newlines before matching", () => {
    const target = extractTarget("Hiring a Frontend Developer\nat Northwind Labs");
    expect(target.role).toBe("Frontend Developer");
  });
});

describe("splitPolishedParagraphs", () => {
  it("splits on blank lines", () => {
    expect(splitPolishedParagraphs("One.\n\nTwo.\n\nThree.", 3)).toEqual([
      "One.",
      "Two.",
      "Three.",
    ]);
  });

  it("treats ragged blank lines as one separator", () => {
    expect(splitPolishedParagraphs("One.\n \n\nTwo.", 2)).toEqual(["One.", "Two."]);
  });

  it("merges surplus blocks into the last paragraph", () => {
    const result = splitPolishedParagraphs("One.\n\nTwo.\n\nThree.\n\nFour.", 2);
    expect(result).toHaveLength(2);
    expect(result[1]).toContain("Two.");
    expect(result[1]).toContain("Four.");
  });

  it("keeps a short result short rather than padding it", () => {
    expect(splitPolishedParagraphs("Only one.", 4)).toEqual(["Only one."]);
  });

  it("returns nothing for empty text", () => {
    expect(splitPolishedParagraphs("   \n\n  ", 3)).toEqual([]);
  });

  it("returns the blocks unchanged when no count is expected", () => {
    expect(splitPolishedParagraphs("One.\n\nTwo.", 0)).toEqual(["One.", "Two."]);
  });
});