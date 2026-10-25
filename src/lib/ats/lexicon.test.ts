import { describe, expect, it } from "vitest";
import {
  MIN_VARIANT_LENGTH,
  SKILL_VARIANTS,
  canonicalize,
  canonicalizePhrase,
  hasVariant,
} from "@/lib/ats/lexicon";

describe("lexicon", () => {
  it("maps every variant to its canonical term", () => {
    expect(canonicalize("React.js")).toBe("react");
    expect(canonicalize("reactjs")).toBe("react");
    expect(canonicalize("K8s")).toBe("kubernetes");
    expect(canonicalize("Kubernetes")).toBe("kubernetes");
    expect(canonicalize("PostgreSQL")).toBe("postgres");
    expect(canonicalize("psql")).toBe("postgres");
    expect(canonicalize("Node.js")).toBe("node");
  });

  it("does not expand variants shorter than the minimum length", () => {
    expect(MIN_VARIANT_LENGTH).toBe(3);
    expect(canonicalize("ts")).toBe("ts");
    expect(canonicalize("js")).toBe("js");
  });

  it("passes unknown terms through, normalized", () => {
    expect(canonicalize("Elixir")).toBe("elixir");
    expect(canonicalize("  weird   spacing  ")).toBe("weird spacing");
    expect(canonicalize("")).toBe("");
  });

  it("reports whether a term is known", () => {
    expect(hasVariant("k8s")).toBe(true);
    expect(hasVariant("machine learning")).toBe(true);
    expect(hasVariant("elixir")).toBe(false);
  });

  it("canonicalizes whole phrases before token-by-token", () => {
    expect(canonicalizePhrase("machine learning")).toBe("machinelearning");
    expect(canonicalizePhrase("React.js and Node")).toBe("react and node");
  });

  it("keeps every canonical key free of duplicates across entries", () => {
    const seen = new Map<string, string>();
    for (const [canonical, variants] of Object.entries(SKILL_VARIANTS)) {
      expect(canonicalize(canonical)).toBe(canonical);
      for (const variant of variants) {
        const previous = seen.get(canonicalize(variant));
        if (previous !== undefined) {
          expect(previous, variant).toBe(canonical);
        }
        seen.set(canonicalize(variant), canonical);
      }
    }
  });
});
