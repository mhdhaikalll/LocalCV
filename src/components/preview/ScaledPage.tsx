"use client";

import { useEffect, useRef, useState } from "react";
import { Box } from "@mantine/core";

export interface ScaledPageProps {
  /** Unscaled page width in CSS pixels. */
  pageWidthPx: number;
  children: React.ReactNode;
  /** Extra content below the last page, e.g. drawn page edges. */
  overlay?: (scale: number) => React.ReactNode;
  /** Reported on mount and on every resize, in unscaled pixels. */
  onMeasured?: (measurement: { scale: number; contentHeight: number }) => void;
  /** Receives the inner content element, for callers that measure children. */
  onContentRef?: (element: HTMLDivElement | null) => void;
  /** Padding inside the scroll container. */
  padding?: number;
  background?: string;
}

/**
 * A page-shaped preview that scales down to the available width without
 * reflowing the document, so printed output matches what was measured.
 *
 * The content is measured with `offsetHeight` (layout space) while the visible
 * size comes from a CSS transform, which keeps the two independent: a narrow
 * pane changes `scale` only, never the layout the page-fit and pagination logic
 * reasons about.
 */
export function ScaledPage({
  pageWidthPx,
  children,
  overlay,
  onMeasured,
  onContentRef,
  padding = 8,
  background = "var(--color-backdrop)",
}: ScaledPageProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [contentHeight, setContentHeight] = useState(0);

  useEffect(() => {
    const container = containerRef.current;
    const content = contentRef.current;
    if (!container || !content) return;

    const update = () => {
      const available = container.clientWidth - padding * 2;
      const nextScale = Math.min(1, available / pageWidthPx);
      setScale(nextScale);
      const nextHeight = content.offsetHeight;
      setContentHeight(nextHeight);
      onMeasured?.({ scale: nextScale, contentHeight: nextHeight });
    };

    const observer = new ResizeObserver(update);
    observer.observe(container);
    observer.observe(content);
    update();
    return () => observer.disconnect();
    // `onMeasured` is intentionally not a dependency: callers pass an inline
    // callback, and re-subscribing on every render would thrash the observer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageWidthPx, padding]);

  return (
    <Box
      ref={containerRef}
      h="100%"
      w="100%"
      style={{ overflow: "auto", background, padding }}
    >
      <div
        style={{
          margin: "0 auto",
          width: Math.ceil(pageWidthPx * scale),
          height: Math.ceil(Math.max(contentHeight, 1) * scale),
          position: "relative",
        }}
      >
        <div
          ref={(element) => {
            contentRef.current = element;
            onContentRef?.(element);
          }}
          className="preview-scaler"
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: pageWidthPx,
            position: "absolute",
            top: 0,
            left: 0,
          }}
        >
          {children}
          {overlay?.(scale)}
        </div>
      </div>
    </Box>
  );
}
