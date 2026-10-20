import {
  ResumeDocumentSchema as ResumeDocumentSchema_impl,
  createEmptyDocument as createEmptyDocument_impl,
  DEFAULT_SECTION_ORDER as DEFAULT_SECTION_ORDER_impl,
  DEFAULT_ADDITIONAL_HEADING as DEFAULT_ADDITIONAL_HEADING_impl,
} from "./resume";
import type {
  ResumeDocument as ResumeDocument_impl,
  SectionId as SectionId_impl,
} from "./resume";
import { uuid } from "@/lib/uuid";
import { z } from "zod";

export {
  ContactSchema,
  WorkExperienceSchema,
  EducationSchema,
  ProjectSchema,
  ExtracurricularSchema,
  AdditionalEntrySchema,
  AdditionalSectionSchema,
  ADDITIONAL_HEADINGS,
  DEFAULT_ADDITIONAL_HEADING,
  SkillGroupSchema,
  CertificateSchema,
  ReferenceSchema,
  SectionIdSchema,
  ResumeDocumentSchema,
  DEFAULT_SECTION_ORDER,
  SECTION_LABELS,
  getSectionLabel,
  createEmptyDocument,
} from "./resume";
export type {
  Contact,
  WorkExperience,
  Education,
  Project,
  Extracurricular,
  AdditionalEntry,
  AdditionalSection,
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

const SECTION_IDS = DEFAULT_SECTION_ORDER_impl;

const emailSchema = z.string().email();
const urlSchema = z.string().url();

function text(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed === "" ? undefined : trimmed;
}

function plainText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

function email(value: unknown): string | undefined {
  const candidate = text(value);
  return candidate && emailSchema.safeParse(candidate).success ? candidate : undefined;
}

/**
 * Accept bare domains from user input ("linkedin.com/in/x") by adding a
 * scheme before validating. Invalid values are dropped rather than causing the
 * whole document to be rejected.
 */
function url(value: unknown): string | undefined {
  const candidate = text(value);
  if (!candidate) return undefined;
  if (urlSchema.safeParse(candidate).success) return candidate;
  const prefixed = `https://${candidate}`;
  return urlSchema.safeParse(prefixed).success ? prefixed : undefined;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function strings(value: unknown): string[] {
  return list(value)
    .map((item) => (typeof item === "string" ? item : ""))
    .filter((item) => item.trim() !== "");
}

function bool(value: unknown, fallback = false): boolean {
  return typeof value === "boolean" ? value : fallback;
}

function id(value: unknown): string {
  return typeof value === "string" && value ? value : uuid();
}

function clamp(value: unknown, min: number, max: number): number | undefined {
  if (typeof value !== "number" || Number.isNaN(value)) return undefined;
  return Math.min(max, Math.max(min, value));
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function sanitizeContact(value: unknown) {
  const c = record(value);
  return {
    name: plainText(c.name),
    headline: text(c.headline),
    email: email(c.email),
    phone: text(c.phone),
    location: text(c.location),
    website: url(c.website),
    linkedin: url(c.linkedin),
    github: url(c.github),
    photo: text(c.photo),
    photoZoom: clamp(c.photoZoom, 1, 3),
    photoOffsetX: clamp(c.photoOffsetX, -100, 100),
    photoOffsetY: clamp(c.photoOffsetY, -100, 100),
  };
}

function sanitizeExperience(value: unknown) {
  const e = record(value);
  return {
    id: id(e.id),
    role: plainText(e.role),
    company: plainText(e.company),
    location: text(e.location),
    startDate: text(e.startDate),
    endDate: text(e.endDate),
    isCurrent: bool(e.isCurrent),
    bullets: strings(e.bullets),
  };
}

function sanitizeEducation(value: unknown) {
  const e = record(value);
  return {
    id: id(e.id),
    school: plainText(e.school),
    degree: text(e.degree),
    field: text(e.field),
    startDate: text(e.startDate),
    endDate: text(e.endDate),
    isCurrent: bool(e.isCurrent),
    bullets: strings(e.bullets),
  };
}

function sanitizeProject(value: unknown) {
  const p = record(value);
  return {
    id: id(p.id),
    name: plainText(p.name),
    description: text(p.description),
    link: url(p.link),
    bullets: strings(p.bullets),
  };
}

function sanitizeExtracurricular(value: unknown) {
  const e = record(value);
  const legacyRange = [text(e.startDate), text(e.endDate)].filter(Boolean).join(" – ");
  return {
    id: id(e.id),
    organization: plainText(e.organization ?? e.name ?? e.company),
    role: text(e.role),
    date: text(e.date) ?? (legacyRange || undefined),
    bullets: strings(e.bullets),
  };
}

function sanitizeSkillGroup(value: unknown) {
  const s = record(value);
  return {
    id: id(s.id),
    category: plainText(s.category),
    items: strings(s.items),
  };
}

function sanitizeCertificate(value: unknown) {
  const c = record(value);
  return {
    id: id(c.id),
    name: plainText(c.name),
    issuer: text(c.issuer),
    date: text(c.date),
    link: url(c.link),
  };
}

function sanitizeReference(value: unknown) {
  const r = record(value);
  return {
    id: id(r.id),
    name: plainText(r.name),
    role: text(r.role),
    company: text(r.company),
    email: email(r.email),
  };
}

function sanitizeAdditionalEntry(value: unknown) {
  const e = record(value);
  return {
    id: id(e.id),
    title: plainText(e.title),
    subtitle: text(e.subtitle),
    date: text(e.date),
    bullets: strings(e.bullets),
  };
}

function sanitizeAdditional(value: unknown) {
  const a = record(value);
  const heading = text(a.heading);
  return {
    heading: heading ? heading.slice(0, 40) : DEFAULT_ADDITIONAL_HEADING_impl,
    entries: list(a.entries).map(sanitizeAdditionalEntry),
  };
}

function sanitizeSectionOrder(value: unknown): SectionId_impl[] {  const requested = list(value).filter((section): section is SectionId_impl =>
    SECTION_IDS.includes(section as SectionId_impl),
  );
  const unique = Array.from(new Set(requested));
  return unique.concat(SECTION_IDS.filter((section) => !unique.includes(section)));
}

function sanitizeSectionVisibility(value: unknown): Record<SectionId_impl, boolean> {
  const visibility = record(value);
  return Object.fromEntries(
    SECTION_IDS.map((section) => [section, bool(visibility[section], true)]),
  ) as Record<SectionId_impl, boolean>;
}

/**
 * Sanitize arbitrary persisted/imported data into a valid ResumeDocument.
 *
 * Repairs field by field instead of discarding the document when one field is
 * invalid (e.g. a blank email, a URL without a scheme, or a missing section
 * visibility flag), so an import never silently produces an empty resume.
 */
export function sanitizeDocument(input: unknown): ResumeDocument_impl {
  const parsed = ResumeDocumentSchema_impl.safeParse(input);
  if (parsed.success) {
    // Older saved documents predate newer sections, so their sectionOrder and
    // visibility records may be missing entries. Normalize both every time.
    const normalized = ResumeDocumentSchema_impl.safeParse({
      ...parsed.data,
      sectionOrder: sanitizeSectionOrder(parsed.data.sectionOrder),
      sectionVisibility: sanitizeSectionVisibility(parsed.data.sectionVisibility),
    });
    return normalized.success ? normalized.data : parsed.data;
  }

  const raw = record(input);
  const candidate = {
    version: 1 as const,
    contact: sanitizeContact(raw.contact),
    summary: plainText(raw.summary),
    experience: list(raw.experience).map(sanitizeExperience),
    education: list(raw.education).map(sanitizeEducation),
    projects: list(raw.projects).map(sanitizeProject),
    skills: list(raw.skills).map(sanitizeSkillGroup),
    certifications: list(raw.certifications).map(sanitizeCertificate),
    extracurriculars: list(raw.extracurriculars).map(sanitizeExtracurricular),
    additional: sanitizeAdditional(raw.additional),
    references: list(raw.references).map(sanitizeReference).slice(0, 2),
    languages: strings(raw.languages),
    interests: strings(raw.interests),
    sectionOrder: sanitizeSectionOrder(raw.sectionOrder),
    sectionVisibility: sanitizeSectionVisibility(raw.sectionVisibility),
  };

  const fixed = ResumeDocumentSchema_impl.safeParse(candidate);
  return fixed.success ? fixed.data : createEmptyDocument_impl();
}
