import type { Contact } from "@/lib/schema";

/**
 * The single-line contact block used by both the resume and the letter.
 *
 * Lives here rather than in `TemplateRenderer` because the letter needs the same
 * ordering and separators; duplicating it would let the two drift.
 */
export function contactLine(contact: Contact): string {
  return [
    contact.location,
    contact.phone,
    contact.email,
    contact.website,
    contact.linkedin,
    contact.github,
  ]
    .filter((value): value is string => typeof value === "string" && value.trim() !== "")
    .join(" | ");
}
