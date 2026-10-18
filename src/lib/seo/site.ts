/**
 * Central site configuration for SEO / AEO metadata.
 *
 * Set NEXT_PUBLIC_SITE_URL in production so canonical URLs, sitemap entries,
 * and structured data point at the deployed origin instead of localhost.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"
).replace(/\/$/, "");

export const SITE = {
  name: "LocalCV",
  url: SITE_URL,
  title: "LocalCV — Free ATS-Friendly Resume Builder (Local-First)",
  shortTitle: "LocalCV — ATS Resume Builder",
  description:
    "Build an ATS-friendly resume free in your browser. Local-first, no account, no uploads. Get a deterministic ATS score, 12 parser-safe templates, and print-perfect PDF export.",
  tagline: "Free, local-first, ATS-friendly resume builder",
  locale: "en_US",
  language: "en",
  github: "https://github.com/mhdhaikalll/LocalCV",
  author: "LocalCV",
  keywords: [
    "ATS resume builder",
    "free resume builder",
    "ATS-friendly resume",
    "resume builder no account",
    "local-first resume builder",
    "resume PDF export",
    "ATS score checker",
    "privacy-first resume builder",
    "resume templates",
    "offline resume builder",
  ],
} as const;

/** Core product facts reused by structured data and AI-answer content. */
export const PRODUCT_FACTS = {
  price: "0",
  priceCurrency: "USD",
  operatingSystem: "Web browser",
  applicationCategory: "BusinessApplication",
  templateCount: 12,
  atsChecks: 40,
} as const;

export const FAQS: { question: string; answer: string }[] = [
  {
    question: "Is LocalCV free to use?",
    answer:
      "Yes. LocalCV is completely free, with no account, subscription, or paywall. You can build, score, and export unlimited resumes.",
  },
  {
    question: "Does LocalCV upload my resume or personal data?",
    answer:
      "No. LocalCV is local-first: your resume is stored in your browser's localStorage and never sent to a server. PDF and DOCX import, ATS scoring, and PDF export all run client-side. The only exception is the optional AI assistant, which you must explicitly enable and consent to before any text is sent.",
  },
  {
    question: "What is an ATS score and how does LocalCV calculate it?",
    answer:
      "An Applicant Tracking System (ATS) score estimates how easily resume-parsing software can read your resume. LocalCV computes a deterministic score from 40+ heuristic checks covering structure, contact details, section completeness, formatting safety, and keyword overlap with an optional job description. The same input always produces the same score.",
  },
  {
    question: "Are LocalCV templates ATS-safe?",
    answer:
      "Yes. All templates use a single, linear reading order, semantic HTML, and real selectable text rather than images or tables, so parsers can extract your content reliably. Two optional templates add a profile photo for roles where a headshot is expected.",
  },
  {
    question: "Can I export my resume as a PDF?",
    answer:
      "Yes. LocalCV exports a pixel-accurate PDF through your browser's print pipeline. Text stays selectable and searchable, which is what ATS parsers need.",
  },
  {
    question: "Does LocalCV work offline?",
    answer:
      "Once the page has loaded, editing, ATS scoring, and print-to-PDF work without a network connection because everything runs locally in your browser.",
  },
  {
    question: "Can I import an existing resume?",
    answer:
      "Yes. You can import PDF, DOCX, or a LocalCV JSON backup. Parsing happens entirely in your browser, and you review every imported section before it is saved.",
  },
  {
    question: "Which is better for ATS: a two-column or single-column resume?",
    answer:
      "Single-column resumes are the safest choice for strict ATS parsers. LocalCV marks single-column layouts as the default and keeps even its two-column templates in a linear reading order so text is extracted in the correct sequence.",
  },
];
