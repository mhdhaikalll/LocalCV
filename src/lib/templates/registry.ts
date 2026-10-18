import type { TemplateDescriptor } from "@/lib/schema";

export const TEMPLATE_REGISTRY: TemplateDescriptor[] = [
  {
    id: "classic",
    name: "Classic",
    description: "Traditional serif headings, clean spacing.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "modern",
    name: "Modern",
    description: "Bold name header, accent-colored section rules.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "minimal",
    name: "Minimal",
    description: "Whitespace-first, minimal color.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "professional",
    name: "Professional",
    description: "Conservative, dense, recruiter-friendly.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "executive",
    name: "Executive",
    description: "Summary-forward, larger name block.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "creative",
    name: "Creative",
    description: "Accent color and subtle styling, still single-column.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "two-column",
    name: "Two-Column",
    description: "Left rail (contact/skills), main column (experience).",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 2,
  },
  {
    id: "timeline",
    name: "Timeline",
    description: "Experience with vertical timeline markers (CSS only).",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "compact",
    name: "Compact",
    description: "Reduced spacing/type for more content per page.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "academic",
    name: "Academic",
    description: "Publications/certifications-forward ordering.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
  {
    id: "photo-sidebar",
    name: "Photo Sidebar",
    description: "Profile photo beside your name, with a clean two-column body.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 2,
  },
  {
    id: "photo-header",
    name: "Photo Header",
    description: "Circular photo centered above a classic single-column layout.",
    atsSafe: true,
    customizable: { font: true, color: true, spacing: true },
    columns: 1,
  },
];

export function getTemplateDescriptor(id: string): TemplateDescriptor {
  return TEMPLATE_REGISTRY.find((t) => t.id === id) ?? TEMPLATE_REGISTRY[0];
}
