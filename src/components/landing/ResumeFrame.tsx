"use client";

import { useEffect, useRef, useState } from "react";
import { Box } from "@mantine/core";
import { useElementSize } from "@mantine/hooks";
import { ResumePreview } from "@/components/templates";
import type { ResumeDocument, ResumeSettings } from "@/lib/schema";

const PAGE_WIDTH_PX = 816;
const PAGE_HEIGHT_PX = 1056;

interface ResumeFrameProps {
  document: ResumeDocument;
  settings: ResumeSettings;
  ariaLabel: string;
}

/**
 * Renders the real resume template at page width and scales it down to fit the
 * available space. Measuring both the container and the rendered document keeps
 * the frame height correct for one-page and two-page resumes.
 */
export function ResumeFrame({ document, settings, ariaLabel }: ResumeFrameProps) {
  const { ref: containerRef, width } = useElementSize();
  const contentRef = useRef<HTMLDivElement>(null);
  const [contentHeight, setContentHeight] = useState(PAGE_HEIGHT_PX);

  useEffect(() => {
    const node = contentRef.current;
    if (!node) return;
    const update = () => setContentHeight(node.scrollHeight);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const scale = width > 0 ? Math.min(1, width / PAGE_WIDTH_PX) : 0.5;

  return (
    <Box
      ref={containerRef}
      role="img"
      aria-label={ariaLabel}
      className="resume-frame"
      style={{ height: Math.ceil(contentHeight * scale) }}
    >
      <Box
        ref={contentRef}
        className="resume-frame-inner"
        inert
        style={{
          width: PAGE_WIDTH_PX,
          transform: `scale(${scale})`,
          transformOrigin: "top left",
        }}
      >
        <ResumePreview document={document} settings={settings} decorative />
      </Box>
    </Box>
  );
}
