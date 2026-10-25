import { describe, expect, it } from "vitest";
import { STEM_EXCEPTIONS, extractTerms, normalizeTerm, stem, tokenize } from "@/lib/ats/keywords";

describe("normalizeTerm", () => {
  it("lowercases and collapses punctuation and whitespace", () => {
    expect(normalizeTerm("  Senior   ENGINEER!! ")).toBe("senior engineer");
  });

  it("keeps characters that carry technical meaning", () => {
    expect(normalizeTerm("C++")).toBe("c++");
    expect(normalizeTerm("C#")).toBe("c#");
    expect(normalizeTerm("Node.js")).toBe("node.js");
  });

  it("strips leading and trailing dots", () => {
    expect(normalizeTerm(".NET")).toBe("net");
    expect(normalizeTerm("react.")).toBe("react");
  });
});

describe("stem", () => {
  it("maps -ies to y only when the result is long enough", () => {
    expect(stem("libraries")).toBe("library");
    expect(stem("analyses")).toBe("analys");
    expect(stem("ties")).toBe("tie");
  });

  it("strips -ing, -ed, -es and -s", () => {
    expect(stem("managing")).toBe("manag");
    expect(stem("managed")).toBe("manag");
    expect(stem("manage")).toBe("manag");
    expect(stem("manages")).toBe("manag");
    expect(stem("running")).toBe("run");
    expect(stem("shipped")).toBe("ship");
    expect(stem("engineers")).toBe("engineer");
  });

  it("does not strip a suffix that would leave fewer than three characters", () => {
    expect(stem("is")).toBe("is");
    expect(stem("gas")).toBe("gas");
  });

  it("keeps every exception verbatim", () => {
    for (const word of STEM_EXCEPTIONS) {
      expect(stem(word), word).toBe(word);
    }
  });

  it("leaves double-s words alone", () => {
    expect(stem("css")).toBe("css");
    expect(stem("class")).toBe("class");
  });
});

describe("tokenize", () => {
  it("drops stop words and single characters", () => {
    expect(tokenize("We are hiring a product designer for the team")).toEqual([
      "hiring",
      "product",
      "designer",
      "team",
    ]);
  });
});

describe("extractTerms", () => {
  it("returns unigrams, bigrams and trigrams", () => {
    const terms = extractTerms("machine learning engineer");
    expect(terms).toContain("machine");
    expect(terms).toContain("machine learning");
    expect(terms).toContain("machine learning engineer");
    expect(terms).toContain("learning engineer");
  });

  it("never builds a phrase that contains a stop word", () => {
    const terms = extractTerms("design for reliability");
    expect(terms).toContain("design");
    expect(terms).toContain("reliability");
    expect(terms).not.toContain("design for");
    expect(terms).not.toContain("for reliability");
  });

  it("returns nothing for a stop-word-only description", () => {
    expect(extractTerms("it is what it is")).toEqual([]);
  });
});
