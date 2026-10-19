"use client";

import {
  buildExportEnvelope,
  ExportEnvelopeSchema,
  ResumeSettingsSchema,
  sanitizeDocument,
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

export function exportJson(document: ResumeDocument, settings: ResumeSettings): void {
  const envelope = buildExportEnvelope(document, settings);
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
    };
  }

  // Legacy or slightly malformed backups (e.g. blank optional URL fields):
  // salvage the document rather than rejecting the whole file.
  const loose = raw as { format?: unknown; version?: unknown; document?: unknown; settings?: unknown };
  if (loose && loose.format === "resume-maker" && loose.version === 1 && loose.document) {
    return {
      ok: true,
      document: sanitizeDocument(loose.document),
      settings: loose.settings ? safeSettings(loose.settings) : undefined,
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
