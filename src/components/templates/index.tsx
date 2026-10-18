"use client";

import type { Ref } from "react";
import { TemplateRenderer } from "./TemplateRenderer";
import type { ResumeDocument, ResumeSettings, TemplateId } from "@/lib/schema";
import type { TemplateStyleVariant } from "@/lib/templates/style-context";

export interface ResumeTemplateProps {
  document: ResumeDocument;
  settings: ResumeSettings;
  innerRef?: Ref<HTMLDivElement>;
}

function makeTemplate(variant: TemplateStyleVariant, layout?: "two-column" | "timeline") {
  return function ResumeTemplate({ document, settings, innerRef }: ResumeTemplateProps) {
    return (
      <TemplateRenderer
        document={document}
        settings={settings}
        innerRef={innerRef}
        variant={variant}
        layout={layout}
      />
    );
  };
}

export const ClassicTemplate = makeTemplate("classic");
export const ModernTemplate = makeTemplate("modern");
export const MinimalTemplate = makeTemplate("minimal");
export const ProfessionalTemplate = makeTemplate("dense");
export const ExecutiveTemplate = makeTemplate("executive");
export const CreativeTemplate = makeTemplate("creative");
export const TwoColumnTemplate = makeTemplate("default", "two-column");
export const TimelineTemplate = makeTemplate("default", "timeline");
export const CompactTemplate = makeTemplate("compact");
export const AcademicTemplate = makeTemplate("academic");
export const PhotoSidebarTemplate = makeTemplate("photo-sidebar");
export const PhotoHeaderTemplate = makeTemplate("photo-header");

export const TEMPLATE_COMPONENTS: Record<
  TemplateId,
  (props: ResumeTemplateProps) => React.JSX.Element
> = {
  classic: ClassicTemplate,
  modern: ModernTemplate,
  minimal: MinimalTemplate,
  professional: ProfessionalTemplate,
  executive: ExecutiveTemplate,
  creative: CreativeTemplate,
  "two-column": TwoColumnTemplate,
  timeline: TimelineTemplate,
  compact: CompactTemplate,
  academic: AcademicTemplate,
  "photo-sidebar": PhotoSidebarTemplate,
  "photo-header": PhotoHeaderTemplate,
};

export function ResumePreview({
  document,
  settings,
  innerRef,
}: ResumeTemplateProps) {
  const Template = TEMPLATE_COMPONENTS[settings.templateId] ?? ClassicTemplate;
  return <Template document={document} settings={settings} innerRef={innerRef} />;
}
