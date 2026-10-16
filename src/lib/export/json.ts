"use client";

import {
  buildExportEnvelope,
  ExportEnvelopeSchema,
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
  if (!parsed.success) {
    return {
      ok: false,
      error:
        'Unrecognized format. Expected a "resume-maker" export (format: "resume-maker", version: 1).',
    };
  }
  return {
    ok: true,
    document: sanitizeDocument(parsed.data.document),
    settings: parsed.data.settings,
  };
}
