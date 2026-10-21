"use client";

import type { ResumeDocument } from "@/lib/schema";
import { createEmptyDocument } from "@/lib/schema";
import { uuid } from "@/lib/uuid";

const SECTION_HEADERS: Record<string, string> = {
  experience: "experience",
  "work experience": "experience",
  "professional experience": "experience",
  employment: "experience",
  "employment history": "experience",
  education: "education",
  skills: "skills",
  "technical skills": "skills",
  summary: "summary",
  profile: "summary",
  objective: "summary",
  "professional summary": "summary",
  "about me": "summary",
  projects: "projects",
  certifications: "certifications",
  certificates: "certifications",
  extracurriculars: "extracurriculars",
  extracurricular: "extracurriculars",
  "extracurricular activities": "extracurriculars",
  activities: "extracurriculars",
  "leadership": "extracurriculars",
  "leadership experience": "extracurriculars",
  "volunteer experience": "extracurriculars",
  "volunteering": "extracurriculars",
  "community involvement": "extracurriculars",
  awards: "additional",
  "awards and honors": "additional",
  "honors and awards": "additional",
  honours: "additional",
  publications: "additional",
  "selected publications": "additional",
  research: "additional",
  "research experience": "additional",
  coursework: "additional",
  "relevant coursework": "additional",
  memberships: "additional",
  affiliations: "additional",
  "professional affiliations": "additional",
  speaking: "additional",
  "conference talks": "additional",
  languages: "languages",
  interests: "interests",
  hobbies: "interests",
};

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(?:\+?\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)[\s.-]?)?\d{3}[\s.-]?\d{3,4}(?:[\s.-]?\d{2,4})?/;
const URL_RE = /https?:\/\/[^\s)>,]+/gi;

export interface ParseResult {
  document: ResumeDocument;
  extractedItems: number;
  warnings: string[];
}

async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import("pdfjs-dist");
  // The worker is copied to public/ by scripts/copy-pdf-worker.mjs (runs on
  // dev/build) so it is served as a same-origin static asset, in sync with the
  // installed pdfjs-dist version.
  pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
  const data = new Uint8Array(await file.arrayBuffer());
  const pdf = await pdfjs.getDocument({ data }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const lines = new Map<number, { x: number; str: string }[]>();
    for (const item of content.items) {
      if (!("str" in item) || !item.str.trim()) continue;
      const y = Math.round(item.transform[5]);
      if (!lines.has(y)) lines.set(y, []);
      lines.get(y)!.push({ x: item.transform[4], str: item.str });
    }
    const pageLines = [...lines.entries()]
      .sort((a, b) => b[0] - a[0])
      .map(([, parts]) =>
        parts
          .sort((a, b) => a.x - b.x)
          .map((p) => p.str)
          .join(" ")
          .replace(/\s{2,}/g, "  "),
      );
    pages.push(pageLines.join("\n"));
  }
  return pages.join("\n\n");
}

async function extractDocxText(file: File): Promise<string> {
  const mammoth = await import("mammoth/mammoth.browser");
  const arrayBuffer = await file.arrayBuffer();
  const result = await mammoth.extractRawText({ arrayBuffer });
  return result.value;
}

function normalize(text: string): string {
  return text
    .replace(/\r\n?/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Heuristic section splitting (09-import-parsing.md). */
function splitSections(text: string): { header: string; rawHeader?: string; body: string[] }[] {
  const lines = text.split("\n").map((l) => l.trim());
  const sections: { header: string; rawHeader?: string; body: string[] }[] = [
    { header: "__contact__", body: [] },
  ];
  for (const line of lines) {
    const matched = SECTION_HEADERS[line.toLowerCase()];
    if (matched && line.length < 40) {
      sections.push({ header: matched, rawHeader: line, body: [] });
    } else {
      sections[sections.length - 1].body.push(line);
    }
  }
  return sections;
}

const DATE_RE = /(?:19|20)\d{2}(?:\s*[-–]\s*(?:(?:19|20)\d{2}|present|current))?/i;

function parseBullets(body: string[]): string[] {
  return body
    .map((l) => l.replace(/^[-•●▪◦·]\s*/, "").trim())
    .filter((l) => l.length > 1 && !/^\W+$/.test(l));
}

export async function parseResumeFile(file: File): Promise<ParseResult> {
  const warnings: string[] = [];
  let text: string;

  if (file.name.toLowerCase().endsWith(".pdf")) {
    text = await extractPdfText(file);
    if (!text.trim()) {
      throw new Error(
        "No extractable text found in this PDF. It may be a scanned/image-based resume — please enter your details manually.",
      );
    }
  } else if (file.name.toLowerCase().endsWith(".docx")) {
    text = await extractDocxText(file);
  } else if (file.name.toLowerCase().endsWith(".doc")) {
    throw new Error("Legacy .doc files are not supported. Save as .docx and retry.");
  } else {
    throw new Error("Unsupported file type. Upload a PDF or DOCX resume.");
  }

  text = normalize(text);
  const sections = splitSections(text);
  const doc = createEmptyDocument();
  let items = 0;

  for (const section of sections) {
    const body = section.body.filter((l) => l.length > 0);
    if (!body.length) continue;

    if (section.header === "__contact__") {
      doc.contact.name = body[0] ?? "";
      const rest = body.slice(1).join(" ");
      const email = rest.match(EMAIL_RE);
      if (email) doc.contact.email = email[0];
      const phone = rest.match(PHONE_RE);
      if (phone && phone[0].replace(/\D/g, "").length >= 7) doc.contact.phone = phone[0].trim();
      const urls = rest.match(URL_RE) ?? [];
      for (const url of urls) {
        if (/linkedin/i.test(url) && !doc.contact.linkedin) doc.contact.linkedin = url;
        else if (/github/i.test(url) && !doc.contact.github) doc.contact.github = url;
        else if (!doc.contact.website) doc.contact.website = url;
      }
      const locMatch = body.slice(1).find((l) => /^[A-Z][a-zA-Z\s]+,\s*[A-Z]{2}/.test(l));
      if (locMatch) doc.contact.location = locMatch;
      if (doc.contact.name) items++;
    } else if (section.header === "summary") {
      doc.summary = body.join(" ");
      items++;
    } else if (section.header === "experience") {
      for (const line of body) {
        if (/^[-•●▪◦·]/.test(line) && doc.experience.length) {
          doc.experience[doc.experience.length - 1].bullets.push(
            line.replace(/^[-•●▪◦·]\s*/, "").trim(),
          );
        } else {
          const dateMatch = line.match(DATE_RE);
          const atSplit = line.split(/\s+(?:at|@|–|-|—)\s+/);
          doc.experience.push({
            id: uuid(),
            role: atSplit[0]?.trim() ?? line,
            company: atSplit[1]?.split(",")[0]?.trim() ?? "",
            startDate: dateMatch ? dateMatch[0].split(/[-–]/)[0].trim() : undefined,
            endDate: dateMatch
              ? dateMatch[0].split(/[-–]/)[1]?.trim() === "Present"
                ? undefined
                : dateMatch[0].split(/[-–]/)[1]?.trim()
              : undefined,
            isCurrent: /present|current/i.test(line),
            bullets: [],
          });
        }
      }
      items += doc.experience.length;
    } else if (section.header === "education") {
      for (const line of body) {
        if (/^[-•●▪◦·]/.test(line) && doc.education.length) {
          doc.education[doc.education.length - 1].bullets.push(
            line.replace(/^[-•●▪◦·]\s*/, "").trim(),
          );
        } else {
          const parts = line.split(/[,|–-]/);
          const degree = parts
            .slice(1)
            .map((p) => p.trim())
            .filter(Boolean)
            .join(", ");
          const gpaMatch = line.match(
            /(?:cgpa|gpa|grade)\s*[:–-]?\s*(\d+(?:\.\d+)?(?:\s*\/\s*\d+(?:\.\d+)?)?)/i,
          );
          doc.education.push({
            id: uuid(),
            school: parts[0]?.trim() ?? line,
            degree: degree || undefined,
            cgpa: gpaMatch?.[1]?.replace(/\s+/g, ""),
            startDate: line.match(DATE_RE)?.[0]?.split(/[-–]/)[0]?.trim(),
            endDate:
              line.match(DATE_RE)?.[0]?.split(/[-–]/)[1]?.trim() === "Present"
                ? undefined
                : line.match(DATE_RE)?.[0]?.split(/[-–]/)[1]?.trim(),
            isCurrent: /present|current/i.test(line),
            bullets: [],
          });
        }
      }
      items += doc.education.length;
    } else if (section.header === "skills") {
      const joined = body.join(" ");
      const groups = joined.split(/\s*[-–|]\s*|\s{2,}/);
      for (const group of groups) {
        if (!group.trim()) continue;
        const catSplit = group.split(/:\s*/);
        if (catSplit.length > 1) {
          doc.skills.push({
            id: uuid(),
            category: catSplit[0].trim(),
            items: catSplit[1]
              .split(/,\s*/)
              .map((s) => s.trim())
              .filter(Boolean),
          });
        } else {
          doc.skills.push({
            id: uuid(),
            category: "Skills",
            items: group
              .split(/,\s*/)
              .map((s) => s.trim())
              .filter(Boolean),
          });
        }
      }
      items += doc.skills.filter((g) => g.items.length).length;
    } else if (section.header === "projects") {
      for (const line of body) {
        doc.projects.push({
          id: uuid(),
          name: line.split(/[:–-]/)[0]?.trim() ?? line,
          description: line.split(/[:–-]/).slice(1).join(" - ").trim() || undefined,
          bullets: [],
        });
      }
      items += doc.projects.length;
    } else if (section.header === "certifications") {
      for (const line of body) {
        const parts = line.split(/[,–-]/);
        doc.certifications.push({
          id: uuid(),
          name: parts[0]?.trim() ?? line,
          issuer: parts[1]?.trim(),
          date: parts[2]?.trim(),
        });
      }
      items += doc.certifications.length;
    } else if (section.header === "extracurriculars") {
      for (const line of body) {
        if (/^[-•●▪◦·]/.test(line) && doc.extracurriculars.length) {
          doc.extracurriculars[doc.extracurriculars.length - 1].bullets.push(
            line.replace(/^[-•●▪◦·]\s*/, "").trim(),
          );
          continue;
        }
        const dateMatch = line.match(DATE_RE);
        const atSplit = line.split(/\s+(?:at|@|–|-|—)\s+/);
        doc.extracurriculars.push({
          id: uuid(),
          organization: atSplit[1]?.split(",")[0]?.trim() || atSplit[0]?.trim() || line,
          role: atSplit[1] ? atSplit[0]?.trim() : undefined,
          date: dateMatch?.[0].trim(),
          bullets: [],
        });
      }
      items += doc.extracurriculars.length;
    } else if (section.header === "additional") {
      if (!doc.additional.entries.length && section.rawHeader) {
        doc.additional.heading = section.rawHeader.trim().slice(0, 40);
      }
      for (const line of body) {
        if (/^[-•●▪◦·]/.test(line) && doc.additional.entries.length) {
          doc.additional.entries[doc.additional.entries.length - 1].bullets.push(
            line.replace(/^[-•●▪◦·]\s*/, "").trim(),
          );
          continue;
        }
        const dateMatch = line.match(DATE_RE);
        const withoutDate = dateMatch ? line.replace(dateMatch[0], "").trim() : line;
        const [title, ...rest] = withoutDate.split(/\s+(?:—|–|-)\s+|\s*\|\s*/);
        doc.additional.entries.push({
          id: uuid(),
          title: title?.trim() || withoutDate,
          subtitle: rest.join(" - ").trim() || undefined,
          date: dateMatch?.[0].trim(),
          bullets: [],
        });
      }
      items += doc.additional.entries.length;
    } else if (section.header === "languages") {
      doc.languages = parseBullets(body)[0]
        ? parseBullets(body)[0].split(/,\s*/).filter(Boolean)
        : [];
      items += doc.languages.length;
    } else if (section.header === "interests") {
      doc.interests = body
        .join(", ")
        .split(/,\s*/)
        .map((s) => s.trim())
        .filter(Boolean);
      items += doc.interests.length;
    }
  }

  if (items === 0) {
    warnings.push("Could not confidently detect any sections — most fields are blank.");
  } else if (!doc.contact.email) {
    warnings.push("Email not detected — please add it manually.");
  }

  return { document: doc, extractedItems: items, warnings };
}
