import type { PageUnit } from "./paginate";

/** Marks a spacer the preview inserted to start a new page. */
export const PAGE_SPACER_ATTR = "data-page-spacer";

/**
 * Height of a resume's actual content, ignoring the page box's `min-height`.
 *
 * `#resume-preview` is floored at one page so short resumes still look like
 * paper, which means its own height says nothing about how full the page is.
 */
export function measureResumeContentHeight(root: HTMLElement | null): number {
  if (!root) return 0;

  const style = window.getComputedStyle(root);
  const padding =
    (Number.parseFloat(style.paddingTop) || 0) +
    (Number.parseFloat(style.paddingBottom) || 0);

  const children = Array.from(root.children).filter(
    (child): child is HTMLElement => child instanceof HTMLElement,
  );

  let height = padding;
  children.forEach((child, index) => {
    const childStyle = window.getComputedStyle(child);
    height += child.offsetHeight;
    if (index > 0) height += Number.parseFloat(childStyle.marginTop) || 0;
    if (index < children.length - 1) {
      height += Number.parseFloat(childStyle.marginBottom) || 0;
    }
  });

  return Math.round(height);
}

/**
 * Read section geometry out of a rendered resume as pagination units.
 *
 * Two things make this stable across re-renders:
 *
 * - Page spacers inserted by the previous pass are subtracted, so each unit is
 *   reported at its *natural* position. Otherwise every re-measure would count
 *   last pass's spacers and the breaks would drift.
 * - Heights come from `offsetHeight`, which is layout space and so unaffected by
 *   the preview's CSS transform; only `top` needs the scale divided out.
 *
 * Offsets are measured from the page's content top (inside the padding).
 */
export function measurePageUnits(root: HTMLElement, scale: number): PageUnit[] {
  const safeScale = scale > 0 ? scale : 1;
  const rootRect = root.getBoundingClientRect();
  const style = window.getComputedStyle(root);
  const paddingTop = Number.parseFloat(style.paddingTop) || 0;
  const originY = rootRect.top + paddingTop * safeScale;

  const units: PageUnit[] = [];
  let spacerTotal = 0;

  for (const child of Array.from(root.children)) {
    if (!(child instanceof HTMLElement)) continue;

    if (child.hasAttribute(PAGE_SPACER_ATTR)) {
      spacerTotal += child.offsetHeight;
      continue;
    }

    const displayTop = (child.getBoundingClientRect().top - originY) / safeScale;
    const top = displayTop - spacerTotal;

    if (child.hasAttribute("data-page-block")) {
      units.push({ id: "header", kind: "header", top, bottom: top + child.offsetHeight });
      continue;
    }

    if (child.hasAttribute("data-page-section")) {
      const id = child.dataset.pageSection ?? "section";
      units.push({ id, kind: "section", top, bottom: top + child.offsetHeight });
    }
  }

  return units;
}
