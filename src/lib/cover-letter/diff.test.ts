import { describe, expect, it } from "vitest";
import { diffWords, hasChanges } from "@/lib/cover-letter/diff";

function reconstruct(ops: ReturnType<typeof diffWords>, side: "before" | "after"): string {
  return ops
    .filter((op) => op.op === "same" || op.op === (side === "before" ? "remove" : "add"))
    .map((op) => op.text)
    .join(" ");
}

describe("diffWords", () => {
  it("reports no changes for identical text", () => {
    const ops = diffWords("the quick brown fox", "the quick brown fox");
    expect(ops).toEqual([{ op: "same", text: "the quick brown fox" }]);
    expect(hasChanges(ops)).toBe(false);
  });

  it("reconstructs both sides exactly", () => {
    const before = "I built payment systems in Go and Postgres.";
    const after = "I have built payment systems in Go, Postgres and SQL.";
    const ops = diffWords(before, after);

    expect(reconstruct(ops, "before")).toBe(before);
    expect(reconstruct(ops, "after")).toBe(after);
  });

  it("marks a pure insertion", () => {
    const ops = diffWords("one two", "one two three");
    expect(ops.find((op) => op.op === "add")?.text).toBe("three");
    expect(ops.some((op) => op.op === "remove")).toBe(false);
  });

  it("marks a pure deletion", () => {
    const ops = diffWords("one two three", "one two");
    expect(ops.find((op) => op.op === "remove")?.text).toBe("three");
    expect(ops.some((op) => op.op === "add")).toBe(false);
  });

  it("merges adjacent runs of the same operation", () => {
    const ops = diffWords("a b c", "x y z");
    // At most one remove and one add, rather than six single-word tokens.
    expect(ops.filter((op) => op.op === "remove")).toHaveLength(1);
    expect(ops.filter((op) => op.op === "add")).toHaveLength(1);
  });

  it("handles one side being empty", () => {
    expect(diffWords("", "added text")).toEqual([{ op: "add", text: "added text" }]);
    expect(diffWords("removed text", "")).toEqual([
      { op: "remove", text: "removed text" },
    ]);
    expect(diffWords("", "")).toEqual([]);
  });

  it("treats whitespace runs as a single separator", () => {
    const ops = diffWords("one   two\n\nthree", "one two three");
    expect(ops).toEqual([{ op: "same", text: "one two three" }]);
  });

  it("is symmetric in length for a single replacement", () => {
    const ops = diffWords("alpha beta", "alpha gamma");
    expect(ops.filter((op) => op.op === "same")).toHaveLength(1);
    expect(ops.filter((op) => op.op === "remove")).toHaveLength(1);
    expect(ops.filter((op) => op.op === "add")).toHaveLength(1);
  });

  it("falls back to a whole-text replacement for a pathological input", () => {
    const huge = Array.from({ length: 5000 }, (_, i) => `w${i}`).join(" ");
    const other = Array.from({ length: 5000 }, (_, i) => `x${i}`).join(" ");

    const ops = diffWords(huge, other);
    expect(ops).toEqual([
      { op: "remove", text: huge },
      { op: "add", text: other },
    ]);
  });
});

describe("hasChanges", () => {
  it("is false for an unchanged diff", () => {
    expect(hasChanges(diffWords("same", "same"))).toBe(false);
  });

  it("is true when anything differs", () => {
    expect(hasChanges(diffWords("same", "same but longer"))).toBe(true);
  });
});
