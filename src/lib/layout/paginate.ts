/**
 * Page-break planning for the resume preview.
 *
 * Browsers paginate for real only when printing, and their decisions are
 * invisible while editing. This module plans the same breaks from measured
 * section geometry so the editor can show real pages, the badge can count them,
 * and the printed output breaks in the same places.
 *
 * Rules:
 *  1. A section is atomic. If it does not fit above the bottom margin, the whole
 *     section starts on the next page — it never bleeds into the margin.
 *  2. Every page keeps the same top and bottom margin, so content always resumes
 *     at that page's content top rather than at the paper edge.
 *  3. A section taller than a whole page cannot be kept whole; it gets a page of
 *     its own and is listed in `oversizedSections`.
 *
 * Coordinates are *display* pixels measured from the first page's content top
 * (i.e. inside the top margin). Page k's content therefore begins at
 * `k * pageHeight`, and its usable area runs to `k * pageHeight + usableHeight`.
 */

export interface PageUnit {
  /** Section id, or "header" for the name and contact block. */
  id: string;
  kind: "header" | "section";
  /** Natural offset from the first page's content top. */
  top: number;
  /** Natural offset just past the unit's last line. */
  bottom: number;
}

export interface PaginationOptions {
  pageHeightPx: number;
  paddingTopPx?: number;
  paddingBottomPx?: number;
}

export interface PageStart {
  /** Section that begins the new page. */
  sectionId: string;
  /**
   * Whitespace to insert before the section, in unscaled px: enough to run out
   * the previous page's remaining space and then add the next page's top margin,
   * so the section's first line lands at that page's content top.
   */
  spacerPx: number;
}

export interface PaginationResult {
  /** Never less than 1. */
  pages: number;
  /** One entry per page after the first, in order. */
  pageStarts: PageStart[];
  /** Height of the flow including inserted spacers. */
  totalHeightPx: number;
  /** Height used on the final page, for the fill readout. */
  lastPageHeightPx: number;
  /** Sections taller than a whole page, which cannot be kept whole. */
  oversizedSections: string[];
  /** Usable height of one page: page height minus both margins. */
  usableHeightPx: number;
}

const EPSILON = 0.5;
const MAX_PAGES = 500;

export function paginateBlocks(
  units: readonly PageUnit[],
  options: PaginationOptions,
): PaginationResult {
  const pageHeight = Math.max(1, options.pageHeightPx);
  const paddingTop = Math.max(0, options.paddingTopPx ?? 0);
  const paddingBottom = Math.max(0, options.paddingBottomPx ?? 0);
  const usable = Math.max(1, pageHeight - paddingTop - paddingBottom);

  if (!units.length) {
    return {
      pages: 1,
      pageStarts: [],
      totalHeightPx: 0,
      lastPageHeightPx: 0,
      oversizedSections: [],
      usableHeightPx: usable,
    };
  }

  const pageStarts: PageStart[] = [];
  const oversizedSections: string[] = [];

  let page = 0;
  /** Display bottom edge of the last placed unit. */
  let cursor = 0;
  /** Display top of the last placed unit (for gap arithmetic). */
  let previousNaturalBottom = units[0].top;

  units.forEach((unit, index) => {
    const height = Math.max(0, unit.bottom - unit.top);
    if (height > usable + EPSILON) oversizedSections.push(unit.id);

    // Section spacing comes from the natural flow, not from our placements.
    const gap = index === 0 ? 0 : Math.max(0, unit.top - previousNaturalBottom);
    let displayTop = index === 0 ? 0 : cursor + gap;

    const contentTop = page * pageHeight;
    const limit = contentTop + usable;

    if (index > 0 && displayTop + height > limit + EPSILON && page + 1 < MAX_PAGES) {
      page += 1;
      const nextContentTop = page * pageHeight;
      const inserted = Math.max(0, nextContentTop - displayTop);
      pageStarts.push({ sectionId: unit.id, spacerPx: inserted });
      displayTop = nextContentTop;
    }

    cursor = displayTop + height;
    previousNaturalBottom = unit.bottom;
  });

  return {
    pages: page + 1,
    pageStarts,
    totalHeightPx: cursor,
    lastPageHeightPx: cursor - page * pageHeight,
    oversizedSections,
    usableHeightPx: usable,
  };
}

/** Paper-edge offsets to draw, in display coordinates. */
export function pageBoundaryOffsets(pages: number, pageHeightPx: number): number[] {
  const offsets: number[] = [];
  for (let index = 1; index < pages; index++) offsets.push(index * pageHeightPx);
  return offsets;
}
