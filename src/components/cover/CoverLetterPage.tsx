"use client";

import type { CSSProperties, Ref } from "react";
import type { CoverLetter, Contact } from "@/lib/schema";
import { FONT_STACKS, PAGE_SIZES } from "@/lib/templates/style-context";
import { contactLine } from "@/lib/cover-letter/contact";
import { formatDate } from "@/lib/cover-letter/to-text";

export interface CoverLetterPageProps {
  letter: CoverLetter;
  contact: Contact;
  innerRef?: Ref<HTMLDivElement>;
  /**
   * Present on whichever surface is currently being printed. Exactly one node
   * in the document may carry it, which is why it is a prop rather than applied
   * unconditionally.
   */
  printable?: boolean;
}

/**
 * A printed cover letter.
 *
 * Structurally the same discipline as `TemplateRenderer`: fixed page size, real
 * text nodes, no images, no tables, nothing a parser has to guess at. The
 * typography comes from the letter's own `layout`, so a letter can match the
 * resume without mutating the resume's settings.
 */
export function CoverLetterPage({
  letter,
  contact,
  innerRef,
  printable = false,
}: CoverLetterPageProps) {
  const page = PAGE_SIZES[letter.layout.pageSize];
  const fontFamily = FONT_STACKS[letter.layout.fontFamily] ?? FONT_STACKS.Inter;
  const signature = letter.signature.trim() || contact.name;
  const contactInfo = contactLine(contact);

  const pageStyle: CSSProperties = {
    width: page.width,
    minHeight: page.height,
    padding: `${letter.layout.margins}pt`,
    fontFamily,
    fontSize: `${letter.layout.fontSize}pt`,
    lineHeight: letter.layout.lineHeight,
    // Literal ink and paper: the letter must not inherit dark mode.
    background: "#ffffff",
    color: "#2c3a3e",
    colorScheme: "light",
    boxSizing: "border-box",
  };

  const tight = { margin: 0 } as const;
  const paragraphStyle: CSSProperties = {
    ...tight,
    marginBottom: "1em",
    textAlign: "left",
  };

  const addressLines = (letter.recipient.address ?? "")
    .split("\n")
    .filter((line) => line.trim());

  return (
    <div
      ref={innerRef}
      id="cover-letter-preview"
      data-print-root={printable ? "" : undefined}
      className="cover-letter-page"
      style={pageStyle}
    >
      <div style={{ marginBottom: "1.6em" }}>
        <p style={{ ...tight, fontWeight: 600 }}>{contact.name || "Your Name"}</p>
        {contactInfo ? (
          <p style={{ ...tight, fontSize: "0.92em" }}>{contactInfo}</p>
        ) : null}
      </div>

      <p style={{ ...tight, marginBottom: "1.4em" }}>{formatDate(letter.date)}</p>

      {(letter.recipient.name || letter.recipient.title || addressLines.length > 0) && (
        <div style={{ marginBottom: "1.6em" }}>
          {letter.recipient.name ? <p style={tight}>{letter.recipient.name}</p> : null}
          {letter.recipient.title ? <p style={tight}>{letter.recipient.title}</p> : null}
          {addressLines.map((line, index) => (
            <p key={index} style={tight}>
              {line}
            </p>
          ))}
        </div>
      )}

      {letter.subject ? (
        <p style={{ ...tight, marginBottom: "1.2em", fontWeight: 600 }}>
          {letter.subject}
        </p>
      ) : null}

      {letter.greeting ? (
        <p style={{ ...tight, marginBottom: "1em" }}>{letter.greeting}</p>
      ) : null}

      <div className="cover-letter-body">
        {letter.paragraphs.map((paragraph, index) =>
          paragraph.trim() ? (
            <p key={index} style={paragraphStyle}>
              {paragraph}
            </p>
          ) : null,
        )}
      </div>

      <div style={{ marginTop: "1.4em" }}>
        {letter.signOff ? <p style={tight}>{letter.signOff}</p> : null}
        {signature ? (
          <p style={{ ...tight, marginTop: "1.4em", fontWeight: 600 }}>{signature}</p>
        ) : null}
      </div>
    </div>
  );
}
