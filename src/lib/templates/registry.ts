import type { TemplateDescriptor } from "@/lib/schema";

export const TEMPLATE_REGISTRY: TemplateDescriptor[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Centered header, clear section rules, generous spacing.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Large name, uppercase section labels, accent rules.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Lots of white space and almost no color.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "professional",
    name: "Professional",
    description: "Denser layout that fits more history on one page.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "executive",
    name: "Executive",
    description: "Large name block with the summary at the top.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "creative",
    name: "Creative",
    description: "Accent color and softer styling, still single-column.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "two-column",
    name: "Two-Column",
    description: "Skills and education in a side rail, experience in the main column.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 2,
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "A vertical line connects your roles in order.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Tighter type and spacing for longer careers.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "academic",
    name: "Academic",
    description: "Certifications and publications lead, for research roles.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "photo-sidebar",
    name: "Photo Sidebar",
    description: "Photo beside your name, with skills in a side rail.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 2,
  },
  {
    id: "photo-header",
    name: "Photo Header",
    description: "Round photo centered above a classic layout.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
];

export function getTemplateDescriptor(id: string): TemplateDescriptor {
  return TEMPLATE_REGISTRY.find((t) => t.id === id) ?? TEMPLATE_REGISTRY[0];
}
