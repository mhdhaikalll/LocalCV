import { describe, expect, it } from "vitest";
import { moveItem, POINTER_DRAG_THRESHOLD } from "@/components/templates/use-pointer-sort";

describe("moveItem", () => {
  const items = ["a", "b", "c", "d"];

  it("moves an item down", () => {
    expect(moveItem(items, 0, 2)).toEqual(["b", "c", "a", "d"]);
  });

  it("moves an item up", () => {
    expect(moveItem(items, 3, 1)).toEqual(["a", "d", "b", "c"]);
  });

  it("returns an equal copy when the position does not change", () => {
    const next = moveItem(items, 1, 1);
    expect(next).toEqual(items);
    expect(next).not.toBe(items);
  });

  it("clamps out-of-range destinations", () => {
    expect(moveItem(items, 1, 99)).toEqual(["a", "c", "d", "b"]);
    expect(moveItem(items, 1, -5)).toEqual(["b", "a", "c", "d"]);
  });

  it("does not mutate the source array", () => {
    const source = ["a", "b", "c"];
    moveItem(source, 0, 2);
    expect(source).toEqual(["a", "b", "c"]);
  });

  it("keeps the drag threshold small enough to still allow a tap", () => {
    expect(POINTER_DRAG_THRESHOLD).toBe(6);
  });
});
