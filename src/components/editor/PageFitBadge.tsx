"use client";

import { Badge, Group, Tooltip } from "@mantine/core";
import { IconAlignLeft, IconAlertTriangle } from "@tabler/icons-react";
import { describePagination } from "@/lib/layout/page-fit";
import { usePreviewMeasurement } from "./preview-measurement";

/**
 * Page-length readout driven by the break planner, so the page count shown is
 * the number of pages the preview draws and the print output produces.
 *
 * A multi-page resume is normal. The case worth flagging is a final page holding
 * almost nothing, or a section too tall to keep whole.
 */
export function PageFitBadge() {
  const {
    pages,
    lastPageHeight,
    usablePageHeight,
    pageBreaksPlanned,
    oversizedSections,
  } = usePreviewMeasurement();

  const fill = Math.max(
    0,
    Math.min(100, Math.round((lastPageHeight / Math.max(1, usablePageHeight)) * 100)),
  );

  const label = pageBreaksPlanned
    ? describePagination(pages, lastPageHeight, usablePageHeight)
    : "Columns flow independently";

  const color = !pageBreaksPlanned
    ? "gray"
    : pages > 1 && fill < 15
      ? "yellow"
      : fill < 45
        ? "gray"
        : "teal";

  const tooltip = pageBreaksPlanned
    ? "Each section is kept whole, so a section that would cross the bottom margin starts on the next page instead. Page size, font size and margins rebalance the result."
    : "This layout's side column flows independently of the main column, so breaks cannot be planned. Every other template paginates.";

  return (
    <Tooltip multiline w={260} withArrow label={tooltip}>
      <Group gap={4} wrap="nowrap">
        <Badge
          size="lg"
          variant="light"
          color={color}
          leftSection={<IconAlignLeft size={12} />}
          style={{ cursor: "default", textTransform: "none" }}
          aria-label={`Page fit: ${label}`}
        >
          {label}
        </Badge>
        {oversizedSections.length > 0 && (
          <Tooltip
            multiline
            w={240}
            withArrow
            label={`${oversizedSections.join(", ")} ${oversizedSections.length === 1 ? "is" : "are"} taller than one page, so ${oversizedSections.length === 1 ? "it" : "they"} cannot be kept whole. Shorten the section or reduce font size.`}
          >
            <Badge
              size="lg"
              variant="light"
              color="orange"
              leftSection={<IconAlertTriangle size={12} />}
              style={{ textTransform: "none" }}
            >
              Section over 1 page
            </Badge>
          </Tooltip>
        )}
      </Group>
    </Tooltip>
  );
}
