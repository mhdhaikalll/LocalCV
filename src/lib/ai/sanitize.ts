"use client";

/**
 * Defense-in-depth sanitizer for AI-generated strings (V6 in vuln.md).
 *
 * React escapes text nodes by default, so AI output is inert when rendered
 * normally. This sanitizer guarantees the stored strings themselves are
 * HTML-free, so they remain safe even if a future code path renders them
 * outside React (e.g. a print template or a rich-text field).
 */
export function sanitizeAiText(input: string): string {
  return input
    // Neutralize HTML tags and entities.
    .replace(/</g, "\u2039")
    .replace(/>/g, "\u203a")
    .replace(/&/g, "&amp;")
    // Neutralize protocol-relative/absolute URLs commonly used in injections.
    .replace(/\b(javascript|data|vbscript)\s*:/gi, "$1\u2044")
    // Strip control characters except newline/tab.
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, "");
}
