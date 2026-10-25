import type { CoverLetter } from "@/lib/schema";

/**
 * Plain-text rendering of a letter, for portals that want a paste.
 *
 * Blank lines are deliberate: paragraphs are separated by one empty line, and
 * the sender/date/recipient block by the same, so a paste into a textarea keeps
 * the reading rhythm the PDF has.
 */
export function coverLetterToText(letter: CoverLetter, signatureFallback: string): string {
  const signature = letter.signature.trim() || signatureFallback.trim();

  const header = [
    letter.recipient.name,
    letter.recipient.title,
    letter.recipient.address,
  ]
    .filter((line): line is string => Boolean(line && line.trim()))
    .join("\n");

  const blocks: string[] = [];

  if (header) blocks.push(header);
  if (letter.date) blocks.push(formatDate(letter.date));
  if (letter.subject) blocks.push(letter.subject);
  if (letter.greeting) blocks.push(letter.greeting);

  for (const paragraph of letter.paragraphs) {
    const text = paragraph.trim();
    if (text) blocks.push(text);
  }

  const closing = [letter.signOff, signature]
    .filter((line) => line.trim())
    .join("\n");
  if (closing) blocks.push(closing);

  return blocks.join("\n\n");
}

/**
 * Format an ISO date for display. Kept locale-independent on purpose: a letter
 * dated "24 October 2026" reads the same everywhere, whereas
 * `toLocaleDateString` can render 10/24/2026 or 24/10/2026 depending on the
 * machine, which would make the printed letter vary by browser.
 */
export function formatDate(iso: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!match) return iso;
  const [, year, month, day] = match;
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const name = months[Number(month) - 1];
  if (!name) return iso;
  return `${Number(day)} ${name} ${year}`;
}
