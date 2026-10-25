import { describe, expect, it } from "vitest";
import {
  pageBoundaryOffsets,
  paginateBlocks,
  type PageUnit,
} from "@/lib/layout/paginate";

const PAGE = 1000;
const MARGIN = 50;

function unit(
  id: string,
  top: number,
  height: number,
  kind: PageUnit["kind"] = "section",
): PageUnit {
  return { id, kind, top, bottom: top + height };
}

const OPTIONS = { pageHeightPx: PAGE, paddingTopPx: MARGIN, paddingBottomPx: MARGIN };

describe("paginateBlocks", () => {
  it("keeps a short resume on one page with no spacers", () => {
    const units = [unit("header", 0, 120, "header"), unit("summary", 120, 200)];
    const result = paginateBlocks(units, OPTIONS);

    expect(result.pages).toBe(1);
    expect(result.pageStarts).toEqual([]);
    expect(result.oversizedSections).toEqual([]);
  });

  it("moves a section that does not fit onto the next page whole", () => {
    // Usable height is 900. Experience ends at 700; skills need 300 more.
    const units = [
      unit("header", 0, 100, "header"),
      unit("experience", 100, 600),
      unit("skills", 700, 300),
    ];
    const result = paginateBlocks(units, OPTIONS);

    expect(result.pages).toBe(2);
    expect(result.pageStarts).toHaveLength(1);
    expect(result.pageStarts[0].sectionId).toBe("skills");
  });

  it("starts the next page at the same content top as the first", () => {
    // Coordinates are relative to page 1's content top, so page 2's content top
    // is exactly one page height down; the margin is applied by the page box.
    const units = [
      unit("header", 0, 100, "header"),
      unit("experience", 100, 700),
      unit("skills", 800, 300),
    ];
    const result = paginateBlocks(units, OPTIONS);
    const start = result.pageStarts[0];

    expect(start.sectionId).toBe("skills");
    // Skills sat at 800 and are pushed to 1000, the top of page 2's content.
    expect(800 + start.spacerPx).toBe(PAGE);
  });

  it("completes the previous page before the new page begins", () => {
    const units = [
      unit("header", 0, 100, "header"),
      unit("a", 100, 500),
      unit("b", 600, 500),
    ];
    const result = paginateBlocks(units, OPTIONS);
    const start = result.pageStarts[0];

    // Page 1's content stops at 600 of its 900 usable px; the spacer runs the
    // flow to page 2's content top so the next section starts on the new page.
    expect(start.spacerPx).toBe(PAGE - 600);
  });

  it("never splits a section that could fit a page on its own", () => {
    const units = [
      unit("header", 0, 100, "header"),
      unit("a", 100, 400),
      unit("b", 500, 500),
    ];
    const result = paginateBlocks(units, OPTIONS);

    expect(result.pages).toBe(2);
    // `b` is exactly 500 tall and starts fresh on page 2.
    expect(result.pageStarts.map((p) => p.sectionId)).toEqual(["b"]);
  });

  it("reports a section taller than a page instead of splitting it silently", () => {
    const units = [unit("header", 0, 100, "header"), unit("huge", 100, 1200)];
    const result = paginateBlocks(units, OPTIONS);

    expect(result.pages).toBe(2);
    expect(result.oversizedSections).toEqual(["huge"]);
  });

  it("counts pages for several pushed sections", () => {
    const units = [
      unit("header", 0, 100, "header"),
      unit("a", 100, 400),
      unit("b", 500, 600),
      unit("c", 1100, 400),
    ];
    const result = paginateBlocks(units, OPTIONS);

    expect(result.pages).toBeGreaterThanOrEqual(2);
    expect(result.pageStarts.length).toBe(result.pages - 1);
  });

  it("handles an empty document", () => {
    expect(paginateBlocks([], OPTIONS)).toEqual({
      pages: 1,
      pageStarts: [],
      totalHeightPx: 0,
      lastPageHeightPx: 0,
      oversizedSections: [],
      usableHeightPx: PAGE - MARGIN * 2,
    });
  });

  it("is deterministic", () => {
    const units = [unit("header", 0, 100, "header"), unit("a", 100, 700), unit("b", 800, 400)];
    expect(paginateBlocks(units, OPTIONS)).toEqual(paginateBlocks(units, OPTIONS));
  });

  it("reports the final page fill", () => {
    const units = [unit("header", 0, 100, "header"), unit("a", 100, 500), unit("b", 600, 500)];
    const result = paginateBlocks(units, OPTIONS);

    expect(result.lastPageHeightPx).toBe(500);
    expect(result.usableHeightPx).toBe(900);
  });
});

describe("pageBoundaryOffsets", () => {
  it("returns one paper edge per additional page", () => {
    expect(pageBoundaryOffsets(3, PAGE)).toEqual([1000, 2000]);
  });

  it("returns nothing for a single page", () => {
    expect(pageBoundaryOffsets(1, PAGE)).toEqual([]);
  });
});
