import type { CSSProperties } from "react";
import type { ResumeDocument, ResumeSettings } from "@/lib/schema";

/** ATS-safe font stacks only (05-resume-templates.md hard rule 4). */
export const FONT_STACKS: Record<string, string> = {
  Inter: '"Inter", Arial, Helvetica, sans-serif',
  Arial: "Arial, Helvetica, sans-serif",
  Helvetica: "Helvetica, Arial, sans-serif",
  Georgia: "Georgia, serif",
  Times: '"Times New Roman", Times, serif',
  Calibri: "Calibri, Arial, sans-serif",
};

export const PAGE_SIZES = {
  A4: { width: "210mm", height: "297mm" },
  Letter: { width: "8.5in", height: "11in" },
} as const;

const SPACING_PRESETS = {
  compact: 0.7,
  normal: 1,
  spacious: 1.35,
} as const;

export interface TemplateStyleContext {
  pageStyle: CSSProperties;
  headerStyle: CSSProperties;
  nameStyle: CSSProperties;
  contactStyle: CSSProperties;
  sectionTitleStyle: CSSProperties;
  entryTitleStyle: CSSProperties;
  entryMetaStyle: CSSProperties;
  listStyle: CSSProperties;
  blockGap: string;
  entryGap: string;
  fontStack: string;
  spacer: number;
}

export function buildStyleContext(
  settings: ResumeSettings,
  variant: TemplateStyleVariant,
): TemplateStyleContext {
  const fontStack = FONT_STACKS[settings.fontFamily] ?? FONT_STACKS.Inter;
  const spacer = SPACING_PRESETS[settings.spacing];
  const baseGap = variant === "compact" ? 0.6 : variant === "dense" ? 0.75 : 1;
  const titleSize = variant === "compact" ? 1 : variant === "dense" ? 1.05 : 1.15;

  return {
    fontStack,
    spacer,
    pageStyle: {
      fontFamily: fontStack,
      fontSize: `${settings.fontSize}pt`,
      lineHeight: settings.lineHeight,
      color: "#111827",
      padding: `${settings.margins}pt`,
      boxSizing: "border-box",
    },
    nameStyle: {
      fontSize: `${(settings.fontSize * (variant === "executive" ? 2.4 : 1.9)).toFixed(2)}pt`,
      fontWeight: 700,
      color: variant === "minimal" ? "#111827" : settings.primaryColor,
      margin: 0,
      lineHeight: 1.1,
    },
    contactStyle: {
      fontSize: `${(settings.fontSize * 0.92).toFixed(2)}pt`,
      color: "#374151",
      margin: 0,
    },
    sectionTitleStyle: {
      fontSize: `${(settings.fontSize * titleSize).toFixed(2)}pt`,
      fontWeight: 700,
      color: variant === "minimal" ? "#111827" : settings.primaryColor,
      margin: `calc(${(baseGap * spacer).toFixed(2)}em * 0.6) 0 calc(${(baseGap * spacer).toFixed(2)}em * 0.35)`,
      textTransform: variant === "modern" || variant === "professional" ? "uppercase" : "none",
      letterSpacing: variant === "modern" || variant === "professional" ? "0.08em" : undefined,
      borderBottom:
        variant === "modern" || variant === "creative"
          ? `1.5pt solid ${settings.accentColor}`
          : variant === "classic" || variant === "academic"
            ? `1pt solid ${settings.primaryColor}`
            : "none",
      paddingBottom: "2pt",
      breakAfter: "avoid",
    },
    entryTitleStyle: {
      fontSize: `${(settings.fontSize * 1.05).toFixed(2)}pt`,
      fontWeight: 600,
      color: "#111827",
      margin: 0,
    },
    entryMetaStyle: {
      fontSize: `${(settings.fontSize * 0.92).toFixed(2)}pt`,
      color: "#4b5563",
      margin: 0,
    },
    listStyle: {
      margin: `2pt 0 0`,
      paddingLeft: "16pt",
      listStyleType: "disc",
    },
    headerStyle: {
      marginBottom: `calc(${(baseGap * spacer).toFixed(2)}em * 0.5)`,
      textAlign:
        variant === "classic" ||
        variant === "executive" ||
        variant === "minimal" ||
        variant === "academic" ||
        variant === "modern"
          ? "center"
          : "left",
    },
    blockGap: `${(baseGap * spacer * 0.8).toFixed(2)}em`,
    entryGap: `${(baseGap * spacer * 0.55).toFixed(2)}em`,
  };
}

export type TemplateStyleVariant =
  | "default"
  | "compact"
  | "dense"
  | "executive"
  | "modern"
  | "creative"
  | "minimal"
  | "classic"
  | "academic"
  | "professional";

/** Whether a section is visible: visibility toggle on AND non-empty. */
export function isSectionVisible(doc: ResumeDocument, section: string): boolean {
  const toggled = doc.sectionVisibility[section as keyof typeof doc.sectionVisibility] ?? true;
  if (!toggled) return false;
  return !isSectionEmpty(doc, section);
}

export function isSectionEmpty(doc: ResumeDocument, section: string): boolean {
  switch (section) {
    case "summary":
      return !doc.summary.trim();
    case "experience":
      return doc.experience.length === 0;
    case "education":
      return doc.education.length === 0;
    case "projects":
      return doc.projects.length === 0;
    case "skills":
      return doc.skills.every((g) => g.items.length === 0);
    case "certifications":
      return doc.certifications.length === 0;
    case "references":
      return doc.references.length === 0;
    case "languages":
      return doc.languages.length === 0;
    case "interests":
      return doc.interests.length === 0;
    default:
      return true;
  }
}

/** Ordered + visible sections respecting user's sectionOrder. */
export function visibleSections(doc: ResumeDocument): string[] {
  const order = doc.sectionOrder.filter((s) => isSectionVisible(doc, s));
  return order;
}
