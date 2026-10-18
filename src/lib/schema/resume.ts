import { z } from "zod";

// ---- Contact ----
export const ContactSchema = z.object({
  name: z.string(),
  headline: z.string().optional(),
  email: z.string().email().optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  website: z.string().url().optional(),
  linkedin: z.string().url().optional(),
  github: z.string().url().optional(),
  /** Optional profile photo as a data URL (resized client-side before saving). */
  photo: z.string().optional(),
  /** Photo framing: zoom factor (1 = fit, 3 = 3x closer). */
  photoZoom: z.number().min(1).max(3).optional(),
  /** Photo framing: horizontal offset in percent (-100..100). */
  photoOffsetX: z.number().min(-100).max(100).optional(),
  /** Photo framing: vertical offset in percent (-100..100). */
  photoOffsetY: z.number().min(-100).max(100).optional(),
});
export type Contact = z.infer<typeof ContactSchema>;

// ---- Work Experience ----
export const WorkExperienceSchema = z.object({
  id: z.string(),
  role: z.string(),
  company: z.string(),
  location: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  isCurrent: z.boolean().default(false),
  bullets: z.array(z.string()).default([]),
});
export type WorkExperience = z.infer<typeof WorkExperienceSchema>;

// ---- Education ----
export const EducationSchema = z.object({
  id: z.string(),
  school: z.string(),
  degree: z.string().optional(),
  field: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  bullets: z.array(z.string()).default([]),
});
export type Education = z.infer<typeof EducationSchema>;

// ---- Project ----
export const ProjectSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  link: z.string().url().optional(),
  bullets: z.array(z.string()).default([]),
});
export type Project = z.infer<typeof ProjectSchema>;

// ---- Skill Group ----
export const SkillGroupSchema = z.object({
  id: z.string(),
  category: z.string(),
  items: z.array(z.string()).default([]),
});
export type SkillGroup = z.infer<typeof SkillGroupSchema>;

// ---- Certificate ----
export const CertificateSchema = z.object({
  id: z.string(),
  name: z.string(),
  issuer: z.string().optional(),
  date: z.string().optional(),
  link: z.string().url().optional(),
});
export type Certificate = z.infer<typeof CertificateSchema>;

// ---- Reference ----
export const ReferenceSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: z.string().optional(),
  company: z.string().optional(),
  email: z.string().email().optional(),
});
export type Reference = z.infer<typeof ReferenceSchema>;

// ---- Section visibility / order ----
export const SectionIdSchema = z.enum([
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "references",
  "languages",
  "interests",
]);
export type SectionId = z.infer<typeof SectionIdSchema>;

export const DEFAULT_SECTION_ORDER: SectionId[] = [
  "summary",
  "experience",
  "education",
  "projects",
  "skills",
  "certifications",
  "references",
  "languages",
  "interests",
];

// ---- ResumeDocument ----
export const ResumeDocumentSchema = z.object({
  version: z.literal(1),
  contact: ContactSchema,
  summary: z.string().default(""),
  experience: z.array(WorkExperienceSchema).default([]),
  education: z.array(EducationSchema).default([]),
  projects: z.array(ProjectSchema).default([]),
  skills: z.array(SkillGroupSchema).default([]),
  certifications: z.array(CertificateSchema).default([]),
  references: z.array(ReferenceSchema).max(2).default([]),
  languages: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
  sectionOrder: z.array(SectionIdSchema),
  sectionVisibility: z.record(SectionIdSchema, z.boolean()),
});
export type ResumeDocument = z.infer<typeof ResumeDocumentSchema>;

export function createEmptyDocument(): ResumeDocument {
  return {
    version: 1,
    contact: { name: "" },
    summary: "",
    experience: [],
    education: [],
    projects: [],
    skills: [],
    certifications: [],
    references: [],
    languages: [],
    interests: [],
    sectionOrder: [...DEFAULT_SECTION_ORDER],
    sectionVisibility: {
      summary: true,
      experience: true,
      education: true,
      projects: true,
      skills: true,
      certifications: true,
      references: true,
      languages: true,
      interests: true,
    },
  };
}
