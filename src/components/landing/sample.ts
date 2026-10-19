import { createDefaultSettings, createEmptyDocument } from "@/lib/schema";
import type { ResumeDocument, ResumeSettings, TemplateId } from "@/lib/schema";

export function buildSampleDocument(): ResumeDocument {
  const doc = createEmptyDocument();
  doc.contact = {
    name: "Jordan Ellis",
    headline: "Product Designer",
    email: "jordan.ellis@example.com",
    phone: "(512) 555-0148",
    location: "Austin, TX",
  };
  doc.summary =
    "Product designer with eight years of experience in B2B software. I turn research findings into interfaces that support real workflows, and I keep design systems small enough for a team to maintain.";
  doc.experience = [
    {
      id: "sample-exp-1",
      role: "Senior Product Designer",
      company: "Northwind Labs",
      location: "Austin, TX",
      startDate: "Mar 2021",
      isCurrent: true,
      bullets: [
        "Redesigned onboarding around three core tasks, raising week-one activation from 34% to 52%.",
        "Built a 120-component design system now used by four product teams.",
        "Ran quarterly usability sessions with customers and turned findings into roadmap items.",
      ],
    },
    {
      id: "sample-exp-2",
      role: "Product Designer",
      company: "Brightpath",
      location: "Seattle, WA",
      startDate: "Jun 2017",
      endDate: "Feb 2021",
      isCurrent: false,
      bullets: [
        "Shipped a mobile checkout flow that added $4.2M in annual recurring revenue.",
        "Partnered with two engineers to cut release QA time by a third.",
      ],
    },
  ];
  doc.education = [
    {
      id: "sample-edu-1",
      school: "University of Washington",
      degree: "BDes, Interaction Design",
      startDate: "2013",
      endDate: "2017",
      isCurrent: false,
      bullets: [],
    },
  ];
  doc.projects = [
    {
      id: "sample-project-1",
      name: "Field Notes",
      description:
        "An open-source research repository for small product teams. Built the interface and wrote the setup guide.",
      link: "https://github.com/example/field-notes",
      bullets: [],
    },
  ];
  doc.skills = [
    {
      id: "sample-skill-1",
      category: "Design",
      items: ["Design systems", "Prototyping", "Interaction design", "Accessibility"],
    },
    {
      id: "sample-skill-2",
      category: "Research",
      items: ["Usability testing", "Interviews", "Survey design"],
    },
  ];
  doc.languages = ["English (native)", "Spanish (professional)"];
  return doc;
}

/** Used only to make the demo score meaningful; no text is sent anywhere. */
export const SAMPLE_JOB_POSTING = `Senior Product Designer

We are hiring a product designer to lead design for our B2B platform. You will
own end-to-end design for onboarding and account management, maintain our design
system in Figma, and run usability research with enterprise customers.

Requirements: 5+ years of product design experience, strong interaction design
and prototyping skills, experience with accessibility standards, and comfort
working with engineers on implementation. Experience with experimentation and
design ops is a plus.`;

export const SAMPLE_TEMPLATES: { id: TemplateId; label: string }[] = [
  { id: "classic", label: "Classic" },
  { id: "modern", label: "Modern" },
  { id: "minimal", label: "Minimal" },
  { id: "two-column", label: "Two-col" },
  { id: "photo-header", label: "Photo" },
];

export const PHOTO_TEMPLATE_IDS: TemplateId[] = ["photo-sidebar", "photo-header"];

export function isPhotoTemplate(id: TemplateId): boolean {
  return PHOTO_TEMPLATE_IDS.includes(id);
}

/**
 * Neutral placeholder portrait so photo layouts show their actual composition.
 * It is an inline SVG data URL: no network request, no remote asset, and it is
 * never saved anywhere.
 */
export const PLACEHOLDER_PHOTO = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(
  `<svg xmlns="http://www.w3.org/2000/svg" width="640" height="640" viewBox="0 0 640 640">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stop-color="#e7edee"/>
        <stop offset="1" stop-color="#d3dfe1"/>
      </linearGradient>
    </defs>
    <rect width="640" height="640" fill="url(#bg)"/>
    <circle cx="320" cy="252" r="112" fill="#b0c2c6"/>
    <path d="M320 392c-104 0-188 66-188 148v100h376V540c0-82-84-148-188-148z" fill="#b0c2c6"/>
    <circle cx="320" cy="320" r="292" fill="none" stroke="#ffffff" stroke-opacity="0.55" stroke-width="10"/>
  </svg>`,
)}`;

export function withPhoto(document: ResumeDocument, photo: string): ResumeDocument {
  return { ...document, contact: { ...document.contact, photo } };
}

export const SAMPLE_PALETTES: { name: string; primary: string; accent: string }[] = [
  { name: "Deep teal", primary: "#235154", accent: "#478f94" },
  { name: "Ink", primary: "#1f2933", accent: "#52606d" },
  { name: "Navy", primary: "#1e3a5f", accent: "#3b6ea5" },
  { name: "Oxblood", primary: "#5f2430", accent: "#96505c" },
  { name: "Olive", primary: "#3f4a2c", accent: "#6f7d4a" },
];

export function buildSampleSettings(
  templateId: TemplateId = "classic",
  paletteIndex = 0,
): ResumeSettings {
  const palette = SAMPLE_PALETTES[paletteIndex] ?? SAMPLE_PALETTES[0];
  return {
    ...createDefaultSettings(),
    templateId,
    primaryColor: palette.primary,
    accentColor: palette.accent,
  };
}
