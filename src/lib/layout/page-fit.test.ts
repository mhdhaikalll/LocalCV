import { describe, expect, it } from "vitest";
import {
  GOOD_THRESHOLD,
  PAGE_HEIGHT_PX,
  THIN_PAGE_PERCENT,
  describePagination,
} from "@/lib/layout/page-fit";

const USABLE = PAGE_HEIGHT_PX.Letter - 36 * 2;

describe("describePagination", () => {
  it("reports a single page with its fill", () => {
    expect(describePagination(1, USABLE * 0.72, USABLE)).toBe("1 page · 72% full");
  });

  it("marks a nearly full single page as tight", () => {
    const result = describePagination(1, USABLE * (GOOD_THRESHOLD / 100), USABLE);
    expect(result).toBe(`1 page · ${GOOD_THRESHOLD}% full — tight`);
  });

  it("describes a normal two-page resume without calling it a problem", () => {
    expect(describePagination(2, USABLE * 0.6, USABLE)).toBe(
      "2 pages · last page 60% full",
    );
  });

  it("calls out a final page that holds almost nothing", () => {
    const result = describePagination(3, USABLE * 0.08, USABLE);
    expect(result).toBe("3 pages · page 3 only 8% full");
    expect(THIN_PAGE_PERCENT).toBeGreaterThan(8);
  });

  it("clamps out-of-range fill", () => {
    expect(describePagination(1, -500, USABLE)).toBe("1 page · 0% full");
    expect(describePagination(2, USABLE * 3, USABLE)).toBe(
      "2 pages · last page 100% full",
    );
  });

  it("never reports zero pages", () => {
    expect(describePagination(0, 0, USABLE)).toContain("1 page");
  });

  it("handles a zero usable height without dividing by zero", () => {
    expect(describePagination(2, 100, 0)).toBe("2 pages · last page 100% full");
  });

  it("uses 96dpi page heights", () => {
    expect(PAGE_HEIGHT_PX.Letter).toBe(1056);
    expect(PAGE_HEIGHT_PX.A4).toBe(1123);
  });
});
