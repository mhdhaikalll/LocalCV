"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useResumeStore } from "@/lib/store/resume-store";
import { PAGE_HEIGHT_PX } from "@/lib/layout/page-fit";
import { paginateBlocks, type PageUnit } from "@/lib/layout/paginate";

interface PreviewMeasurement {
  /** Height of the content, ignoring the page box's one-page floor. */
  contentHeight: number;
  setContentHeight: (height: number) => void;
  /** CSS transform applied to the preview, needed to undo scaled rects. */
  scale: number;
  setScale: (scale: number) => void;
  units: PageUnit[];
  setUnits: (units: PageUnit[]) => void;
  /** Planned page count; 1 until the first measurement lands. */
  pages: number;
  /** Whitespace to insert before each section that starts a new page. */
  pageStarts: { sectionId: string; spacerPx: number }[];
  /** Height used on the final page, in unscaled px. */
  lastPageHeight: number;
  /** Page height minus both margins. */
  usablePageHeight: number;
  /** Sections too tall to keep on one page. */
  oversizedSections: string[];
  /** False for layouts whose columns flow independently. */
  pageBreaksPlanned: boolean;
}

const PreviewMeasurementContext = createContext<PreviewMeasurement | null>(null);

export function PreviewMeasurementProvider({ children }: { children: React.ReactNode }) {
  const settings = useResumeStore((s) => s.settings);
  const [contentHeight, setContentHeight] = useState(0);
  const [scale, setScale] = useState(1);
  const [units, setUnitsState] = useState<PageUnit[]>([]);

  // Re-measuring runs after every render; only a real geometry change should
  // cause another one, otherwise the inserted page spacers feed back in.
  const setUnits = useCallback((next: PageUnit[]) => {
    setUnitsState((current) => (pageUnitsEqual(current, next) ? current : next));
  }, []);

  const pageHeight = PAGE_HEIGHT_PX[settings.pageSize] ?? PAGE_HEIGHT_PX.Letter;
  const paddingPx = (settings.margins * 96) / 72;

  // A two-column rail flows independently of the main column, so there is no
  // single source order to break on. Those templates report the measured height
  // instead of a planned break layout.
  const pageBreaksPlanned =
    settings.templateId !== "two-column" && settings.templateId !== "photo-sidebar";

  const pagination = useMemo(() => {
    if (!pageBreaksPlanned || !units.length) {
      return {
        pages: 1,
        pageStarts: [] as { sectionId: string; spacerPx: number }[],
        lastPageHeightPx: 0,
        oversizedSections: [] as string[],
        usableHeightPx: Math.max(1, pageHeight - paddingPx * 2),
      };
    }
    return paginateBlocks(units, {
      pageHeightPx: pageHeight,
      paddingTopPx: paddingPx,
      paddingBottomPx: paddingPx,
    });
  }, [units, pageBreaksPlanned, pageHeight, paddingPx]);

  const value = useMemo(
    () => ({
      contentHeight,
      setContentHeight,
      scale,
      setScale,
      units,
      setUnits,
      pages: pagination.pages,
      pageStarts: pagination.pageStarts,
      lastPageHeight: pagination.lastPageHeightPx,
      usablePageHeight: pagination.usableHeightPx,
      oversizedSections: pagination.oversizedSections,
      pageBreaksPlanned,
    }),
    [contentHeight, scale, units, pagination, pageBreaksPlanned, setUnits],
  );

  return (
    <PreviewMeasurementContext.Provider value={value}>
      {children}
    </PreviewMeasurementContext.Provider>
  );
}

export function usePreviewMeasurement(): PreviewMeasurement {
  const context = useContext(PreviewMeasurementContext);
  if (!context) {
    throw new Error("usePreviewMeasurement must be used inside PreviewMeasurementProvider");
  }
  return context;
}

function pageUnitsEqual(a: PageUnit[], b: PageUnit[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every((unit, index) => {
    const other = b[index];
    return (
      unit.id === other.id &&
      unit.kind === other.kind &&
      Math.abs(unit.top - other.top) < 0.5 &&
      Math.abs(unit.bottom - other.bottom) < 0.5
    );
  });
}