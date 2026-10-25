"use client";

import {
  buildExportEnvelope,
  ExportEnvelopeSchema,
  ResumeSettingsSchema,
  sanitizeCoverLetter,
  sanitizeDocument,
  type CoverLetter,
  type ResumeDocument,
  type ResumeSettings,
} from "@/lib/schema";

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = window.document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJson(
  document: ResumeDocument,
  settings: ResumeSettings,
  coverLetter?: CoverLetter,
): void {
  const envelope = buildExportEnvelope(document, settings, coverLetter);
  const blob = new Blob([JSON.stringify(envelope, null, 2)], {
    type: "application/json",
  });
  downloadBlob(blob, "resume.json");
}

export interface ImportJsonResult {
  ok: boolean;
  error?: string;
  document?: ResumeDocument;
  settings?: ResumeSettings;
  /** Present only when the backup carried a letter. */
  coverLetter?: CoverLetter;
}

export async function importJson(file: File): Promise<ImportJsonResult> {
  let raw: unknown;
  try {
    raw = JSON.parse(await file.text());
  } catch {
    return { ok: false, error: "Not a valid JSON file." };
  }
  const parsed = ExportEnvelopeSchema.safeParse(raw);
  if (parsed.success) {
    return {
      ok: true,
      document: sanitizeDocument(parsed.data.document),
      settings: parsed.data.settings,
      coverLetter: parsed.data.coverLetter
        ? sanitizeCoverLetter(parsed.data.coverLetter)
        : undefined,
    };
  }

  // Legacy or slightly malformed backups (e.g. blank optional URL fields):
  // salvage the document rather than rejecting the whole file.
  const loose = raw as {
    format?: unknown;
    version?: unknown;
    document?: unknown;
    settings?: unknown;
    coverLetter?: unknown;
  };
  if (loose && loose.format === "resume-maker" && loose.version === 1 && loose.document) {
    return {
      ok: true,
      document: sanitizeDocument(loose.document),
      settings: loose.settings ? safeSettings(loose.settings) : undefined,
      coverLetter: loose.coverLetter ? sanitizeCoverLetter(loose.coverLetter) : undefined,
    };
  }

  return {
    ok: false,
    error:
      'Unrecognized format. Expected a "resume-maker" export (format: "resume-maker", version: 1).',
  };
}

function safeSettings(input: unknown): ResumeSettings | undefined {
  const parsed = ResumeSettingsSchema.safeParse(input);
  return parsed.success ? parsed.data : undefined;
}
