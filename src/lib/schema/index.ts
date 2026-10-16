import {
  ResumeDocumentSchema as ResumeDocumentSchema_impl,
  createEmptyDocument as createEmptyDocument_impl,
  DEFAULT_SECTION_ORDER as DEFAULT_SECTION_ORDER_impl,
} from "./resume";
import type {
  ResumeDocument as ResumeDocument_impl,
  SectionId as SectionId_impl,
} from "./resume";
import { uuid } from "@/lib/uuid";

export {
  ContactSchema,
  WorkExperienceSchema,
  EducationSchema,
  ProjectSchema,
  SkillGroupSchema,
  CertificateSchema,
  ReferenceSchema,
  SectionIdSchema,
  ResumeDocumentSchema,
  DEFAULT_SECTION_ORDER,
  createEmptyDocument,
} from "./resume";
export type {
  Contact,
  WorkExperience,
  Education,
  Project,
  SkillGroup,
  Certificate,
  Reference,
  SectionId,
  ResumeDocument,
} from "./resume";
export {
  TemplateIdSchema,
  TemplateDescriptorSchema,
  ResumeSettingsSchema,
  JobDescriptionSchema,
  ExportEnvelopeSchema,
  createDefaultSettings,
  buildExportEnvelope,
} from "./settings";
export type {
  TemplateId,
  TemplateDescriptor,
  ResumeSettings,
  JobDescription,
  ExportEnvelope,
} from "./settings";

export const STORAGE_KEYS = {
  resume: "rm.resume.v1",
  settings: "rm.settings.v1",
  jobDescription: "rm.jobdescription.v1",
} as const;

/** Sanitize arbitrary persisted/imported data into a valid ResumeDocument. */
export function sanitizeDocument(input: unknown): ResumeDocument_impl {
  const parsed = ResumeDocumentSchema_impl.safeParse(input);
  if (parsed.success) return parsed.data;
  // Best-effort: ensure required IDs and defaults for legacy/partial data.
  const base = createEmptyDocument_impl();
  const raw = (typeof input === "object" && input !== null ? input : {}) as Record<
    string,
    unknown
  >;
  const merged = { ...base, ...(raw as object) } as ResumeDocument_impl;
  const fixed = ResumeDocumentSchema_impl.safeParse({
    ...merged,
    version: 1,
    experience: (merged.experience ?? []).map((e: { id?: string }) => ({
      ...e,
      id: typeof e.id === "string" && e.id ? e.id : uuid(),
    })),
    education: (merged.education ?? []).map((e: { id?: string }) => ({
      ...e,
      id: typeof e.id === "string" && e.id ? e.id : uuid(),
    })),
    projects: (merged.projects ?? []).map((e: { id?: string }) => ({
      ...e,
      id: typeof e.id === "string" && e.id ? e.id : uuid(),
    })),
    skills: (merged.skills ?? []).map((e: { id?: string }) => ({
      ...e,
      id: typeof e.id === "string" && e.id ? e.id : uuid(),
    })),
    certifications: (merged.certifications ?? []).map((e: { id?: string }) => ({
      ...e,
      id: typeof e.id === "string" && e.id ? e.id : uuid(),
    })),
    references: (merged.references ?? []).map((e: { id?: string }) => ({
      ...e,
      id: typeof e.id === "string" && e.id ? e.id : uuid(),
    })),
    sectionOrder:
      Array.isArray(merged.sectionOrder) && merged.sectionOrder.length
        ? ([...merged.sectionOrder] as SectionId_impl[]).concat(
            DEFAULT_SECTION_ORDER_impl.filter(
              (s) => !(merged.sectionOrder as string[]).includes(s),
            ),
          )
        : base.sectionOrder,
    sectionVisibility: merged.sectionVisibility ?? base.sectionVisibility,
  });
  return fixed.success ? fixed.data : base;
}
