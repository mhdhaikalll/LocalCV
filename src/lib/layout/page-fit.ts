/** Letter is 11in; A4 is 297mm. Both at the CSS reference 96dpi. */
export const PAGE_HEIGHT_PX = {
  Letter: 1056,
  A4: Math.round((297 / 25.4) * 96),
} as const;

export const SHORT_THRESHOLD = 45;
export const GOOD_THRESHOLD = 90;

/** Below this, a final page holds so little that the layout looks unbalanced. */
export const THIN_PAGE_PERCENT = 15;

/**
 * Copy for a resume whose pages were planned by `paginate.ts`. Multi-page
 * resumes are legitimate, so a second page is not framed as an error — only a
 * final page with almost nothing on it is called out, because that is the
 * layout problem worth rebalancing.
 */
export function describePagination(
  pages: number,
  lastPageHeightPx: number,
  usablePageHeightPx: number,
): string {
  const safePages = Math.max(1, Math.round(pages));
  const usable = Math.max(1, usablePageHeightPx);
  const fill = Math.max(
    0,
    Math.min(100, Math.round((lastPageHeightPx / usable) * 100)),
  );

  if (safePages === 1) {
    return `1 page · ${fill}% full${fill >= GOOD_THRESHOLD ? " — tight" : ""}`;
  }

  if (fill < THIN_PAGE_PERCENT) {
    return `${safePages} pages · page ${safePages} only ${fill}% full`;
  }
  return `${safePages} pages · last page ${fill}% full`;
}
