import { z } from "zod";
import { ResumeDocumentSchema, type ResumeDocument } from "./resume";
import { CoverLetterSchema, type CoverLetter } from "./cover-letter";

// ---- Template ----
export const TemplateIdSchema = z.enum([
  "classic",
  "modern",
  "minimal",
  "professional",
  "executive",
  "creative",
  "two-column",
  "timeline",
  "compact",
  "academic",
  "photo-sidebar",
  "photo-header",
]);
export type TemplateId = z.infer<typeof TemplateIdSchema>;

export const TemplateDescriptorSchema = z.object({
  id: TemplateIdSchema,
  name: z.string(),
  description: z.string(),
  atsSafe: z.boolean().default(true),
  customizable: z.object({
    font: z.boolean().default(true),
    color: z.boolean().default(true),
    spacing: z.boolean().default(true),
  }),
  columns: z.number().int().min(1).max(2).default(1),
});
export type TemplateDescriptor = z.infer<typeof TemplateDescriptorSchema>;

// ---- Settings ----
export const ResumeSettingsSchema = z.object({
  templateId: TemplateIdSchema.default("classic"),
  fontSize: z.number().min(8).max(16).default(10.5),
  fontFamily: z.string().default("Inter"),
  primaryColor: z.string().default("#111827"),
  accentColor: z.string().default("#2563eb"),
  lineHeight: z.number().min(1).max(2).default(1.4),
  pageSize: z.enum(["A4", "Letter"]).default("Letter"),
  margins: z.number().min(0).max(48).default(18),
  spacing: z.enum(["compact", "normal", "spacious"]).default("normal"),
});
export type ResumeSettings = z.infer<typeof ResumeSettingsSchema>;

export function createDefaultSettings(): ResumeSettings {
  return ResumeSettingsSchema.parse({});
}

// ---- Job Description ----
export const JobDescriptionSchema = z.object({
  text: z.string(),
  title: z.string().optional(),
});
export type JobDescription = z.infer<typeof JobDescriptionSchema>;

// ---- JSON export envelope ----
export const ExportEnvelopeSchema = z.object({
  format: z.literal("resume-maker"),
  version: z.literal(1),
  document: ResumeDocumentSchema,
  settings: ResumeSettingsSchema,
  /**
   * Optional, and the envelope version is deliberately not bumped. Zod strips
   * unknown keys, so an older build opening a newer file ignores this field
   * instead of rejecting the envelope, and this build accepts an older envelope
   * that lacks it.
   */
  coverLetter: CoverLetterSchema.optional(),
  exportedAt: z.string(),
});
export type ExportEnvelope = z.infer<typeof ExportEnvelopeSchema>;
export function buildExportEnvelope(
  document: ResumeDocument,
  settings: ResumeSettings,
  coverLetter?: CoverLetter,
): ExportEnvelope {
  return {
    format: "resume-maker",
    version: 1,
    document,
    settings,
    ...(coverLetter ? { coverLetter } : {}),
    exportedAt: new Date().toISOString(),
  };
}
