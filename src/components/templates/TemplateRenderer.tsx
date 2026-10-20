"use client";

import type { CSSProperties, ReactNode, Ref } from "react";
import {
  buildStyleContext,
  isSectionVisible,
  visibleSections,
  type TemplateStyleVariant,
} from "@/lib/templates/style-context";
import { PAGE_SIZES } from "@/lib/templates/style-context";
import type { ResumeDocument, ResumeSettings, SectionId } from "@/lib/schema";
import { getSectionLabel } from "@/lib/schema";

interface TemplateRendererProps {
  document: ResumeDocument;
  settings: ResumeSettings;
  innerRef?: Ref<HTMLDivElement>;
  variant?: TemplateStyleVariant;
  layout?: "single" | "two-column" | "timeline";
  /**
   * Use a non-heading element for the name when the preview is decorative
   * (e.g. the landing page sample), so the page keeps a single real <h1>.
   */
  decorative?: boolean;
  children?: ReactNode;
}

function contactLine(doc: ResumeDocument): string {
  const c = doc.contact;
  return [c.location, c.phone, c.email, c.website, c.linkedin, c.github]
    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
    .join(" | ");
}

/**
 * Photo frame that honors the user's zoom/pan adjustments.
 * The image itself is object-fit: cover inside a clipped frame, then
 * scaled and translated so the user can frame their face.
 */
function PhotoFrame({
  src,
  size,
  shape,
  zoom,
  offsetX,
  offsetY,
}: {
  src: string;
  size: string;
  shape: "circle" | "rounded";
  zoom?: number;
  offsetX?: number;
  offsetY?: number;
}) {
  const z = zoom ?? 1;
  const x = offsetX ?? 0;
  const y = offsetY ?? 0;
  return (
    <div
      style={{
        width: size,
        height: size,
        flexShrink: 0,
        overflow: "hidden",
        borderRadius: shape === "circle" ? "50%" : "8pt",
        boxSizing: "border-box",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- data-URL photo; must not go through the image optimizer */}
      <img
        src={src}
        alt=""
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          display: "block",
          transform: `translate(${x}%, ${y}%) scale(${z})`,
          transformOrigin: "center",
        }}
      />
    </div>
  );
}

function bullets(items: string[], listStyle: CSSProperties) {
  if (!items.filter((b) => b.trim()).length) return null;
  return (
    <ul style={listStyle}>
      {items
        .filter((b) => b.trim())
        .map((b, i) => (
          <li key={i}>{b}</li>
        ))}
    </ul>
  );
}

/**
 * Shared ATS-safe renderer: linear semantic HTML, no tables,
 * single reading order, real text everywhere (05-resume-templates.md).
 */
export function TemplateRenderer({
  document: doc,
  settings,
  innerRef,
  variant = "default",
  layout = "single",
  decorative = false,
  children,
}: TemplateRendererProps) {
  const s = buildStyleContext(settings, variant);
  const sections = visibleSections(doc) as SectionId[];
  const order = doc.sectionOrder;
  const NameTag = decorative ? "div" : "h1";
  const EntryTag = decorative ? "div" : "h3";
  const SectionTag = decorative ? "div" : "h2";

  const renderSummary = () =>
    isSectionVisible(doc, "summary") ? (
      <p style={{ margin: 0, textAlign: "justify" }}>{doc.summary}</p>
    ) : null;

  const renderExperience = () =>
    order.includes("experience") && isSectionVisible(doc, "experience") ? (
      <div style={{ display: "flex", flexDirection: "column", gap: s.entryGap }}>
        {doc.experience.map((e) => (
          <div
            key={e.id}
            className="resume-entry"
            style={
              layout === "timeline"
                ? {
                    position: "relative",
                    paddingLeft: "14pt",
                    borderLeft: `1.5pt solid ${settings.accentColor}`,
                  }
                : undefined
            }
          >
            {layout === "timeline" ? (
              <span
                aria-hidden
                style={{
                  position: "absolute",
                  left: "-4.5pt",
                  top: "3pt",
                  width: "7.5pt",
                  height: "7.5pt",
                  borderRadius: "50%",
                  background: settings.accentColor,
                  display: "inline-block",
                }}
              />
            ) : null}
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "8pt",
              }}
            >
              <EntryTag style={s.entryTitleStyle}>{e.company || e.role}</EntryTag>
              {(e.startDate || e.endDate || e.isCurrent) && (
                <span style={{ ...s.entryMetaStyle, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {[e.startDate, e.isCurrent ? "Present" : e.endDate]
                    .filter((v): v is string => typeof v === "string" && v.trim() !== "")
                    .join(" – ")}
                </span>
              )}
            </div>
            {e.company && e.role ? <p style={{ margin: 0 }}>{e.role}</p> : null}
            {e.location ? <p style={s.entryMetaStyle}>{e.location}</p> : null}
            {bullets(e.bullets, s.listStyle)}
          </div>
        ))}
      </div>
    ) : null;

  const renderEducation = () =>
    order.includes("education") && isSectionVisible(doc, "education") ? (
      <div style={{ display: "flex", flexDirection: "column", gap: s.entryGap }}>
        {doc.education.map((e) => (
          <div key={e.id} className="resume-entry">
            <EntryTag style={s.entryTitleStyle}>{e.school}</EntryTag>
            {e.degree ? <p style={{ margin: 0 }}>{e.degree}</p> : null}
            <p style={s.entryMetaStyle}>
              {[e.startDate, e.isCurrent ? "Present" : e.endDate]
                .filter(Boolean)
                .join(" – ")}
            </p>
            {bullets(e.bullets, s.listStyle)}
          </div>
        ))}
      </div>
    ) : null;

  const renderProjects = () =>
    order.includes("projects") && isSectionVisible(doc, "projects") ? (
      <div style={{ display: "flex", flexDirection: "column", gap: s.entryGap }}>
        {doc.projects.map((p) => (
          <div key={p.id} className="resume-entry">
            <EntryTag style={s.entryTitleStyle}>{p.name}</EntryTag>
            {p.description ? <p style={{ margin: 0 }}>{p.description}</p> : null}
            {p.link ? (
              <p style={{ margin: 0 }}>
                <a
                  href={p.link}
                  style={{ color: settings.accentColor, textDecoration: "none" }}
                >
                  {p.link}
                </a>
              </p>
            ) : null}
            {bullets(p.bullets, s.listStyle)}
          </div>
        ))}
      </div>
    ) : null;

  const renderSkills = () =>
    order.includes("skills") && isSectionVisible(doc, "skills") ? (
      <div style={{ display: "flex", flexDirection: "column", gap: "2pt" }}>
        {doc.skills
          .filter((g) => g.items.length)
          .map((g) => (
            <p key={g.id} style={{ margin: 0 }}>
              <strong style={{ color: settings.primaryColor }}>{g.category}:</strong>{" "}
              {g.items.join(", ")}
            </p>
          ))}
      </div>
    ) : null;

  const renderCertifications = () =>
    order.includes("certifications") && isSectionVisible(doc, "certifications") ? (
      <div style={{ display: "flex", flexDirection: "column", gap: "2pt" }}>
        {doc.certifications.map((c) => (
          <p key={c.id} style={{ margin: 0 }} className="resume-entry">
            <strong>{c.name}</strong>
            {c.issuer ? ` — ${c.issuer}` : ""}
            {c.date ? ` (${c.date})` : ""}
          </p>
        ))}
      </div>
    ) : null;

  const renderExtracurriculars = () =>
    order.includes("extracurriculars") && isSectionVisible(doc, "extracurriculars") ? (
      <div style={{ display: "flex", flexDirection: "column", gap: s.entryGap }}>
        {doc.extracurriculars.map((e) => (
          <div
            key={e.id}
            className="resume-entry"
            style={
              layout === "timeline"
                ? {
                    position: "relative",
                    paddingLeft: "14pt",
                    borderLeft: `1.5pt solid ${settings.accentColor}`,
                  }
                : undefined
            }
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "8pt",
              }}
            >
              <p style={{ margin: 0 }}>
                <span style={s.entryTitleStyle}>{e.organization}</span>
                {e.role ? (
                  <span style={s.entryMetaStyle}>
                    {" — "}
                    {e.role}
                  </span>
                ) : null}
              </p>
              {e.date ? (
                <span style={{ ...s.entryMetaStyle, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {e.date}
                </span>
              ) : null}
            </div>
            {bullets(e.bullets, s.listStyle)}
          </div>
        ))}
      </div>
    ) : null;

  const renderLanguages = () =>
    order.includes("languages") && isSectionVisible(doc, "languages") ? (
      <p style={{ margin: 0 }}>{doc.languages.join(", ")}</p>
    ) : null;

  const renderReferences = () =>
    order.includes("references") && isSectionVisible(doc, "references") ? (
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          columnGap: "18pt",
          rowGap: s.entryGap,
        }}
      >
        {doc.references.map((r) => (
          <div key={r.id} className="resume-entry">
            <EntryTag style={s.entryTitleStyle}>{r.name}</EntryTag>
            {r.role ? <p style={{ margin: 0 }}>{r.role}</p> : null}
            {r.company ? <p style={s.entryMetaStyle}>{r.company}</p> : null}
            {r.email ? (
              <p style={{ ...s.entryMetaStyle, color: settings.accentColor }}>
                {r.email}
              </p>
            ) : null}
          </div>
        ))}
      </div>
    ) : null;

  const renderAdditional = () =>
    order.includes("additional") && isSectionVisible(doc, "additional") ? (
      <div style={{ display: "flex", flexDirection: "column", gap: s.entryGap }}>
        {doc.additional.entries.map((e) => (
          <div key={e.id} className="resume-entry">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "8pt",
              }}
            >
              <div>
                <EntryTag style={s.entryTitleStyle}>{e.title}</EntryTag>
                {e.subtitle ? <p style={{ margin: 0 }}>{e.subtitle}</p> : null}
              </div>
              {e.date ? (
                <span style={{ ...s.entryMetaStyle, fontWeight: 600, whiteSpace: "nowrap" }}>
                  {e.date}
                </span>
              ) : null}
            </div>
            {bullets(e.bullets, s.listStyle)}
          </div>
        ))}
      </div>
    ) : null;

  const renderInterests = () =>
    order.includes("interests") && isSectionVisible(doc, "interests") ? (
      <p style={{ margin: 0 }}>{doc.interests.join(", ")}</p>
    ) : null;

  const sectionRenderers: Record<SectionId, () => ReactNode> = {
    summary: renderSummary,
    experience: renderExperience,
    education: renderEducation,
    projects: renderProjects,
    skills: renderSkills,
    certifications: renderCertifications,
    extracurriculars: renderExtracurriculars,
    additional: renderAdditional,
    references: renderReferences,
    languages: renderLanguages,
    interests: renderInterests,
  };

  const body = (
    <>
      {sections.map((section) => (
        <section key={section} style={{ marginBottom: s.blockGap }}>
          {section !== "summary" ? (
            <SectionTag style={s.sectionTitleStyle}>{getSectionLabel(doc, section)}</SectionTag>
          ) : null}
          {sectionRenderers[section]?.() ?? null}
        </section>
      ))}
      {children}
    </>
  );

  const page = PAGE_SIZES[settings.pageSize];
  const contactInfo = contactLine(doc);
  const photo = doc.contact.photo;
  const photoSidebar = variant === "photo-sidebar";
  const photoHeader = variant === "photo-header";
  const photoAdjust = {
    zoom: doc.contact.photoZoom,
    offsetX: doc.contact.photoOffsetX,
    offsetY: doc.contact.photoOffsetY,
  };

  const header = (
    <header
      style={
        photoSidebar
          ? {
              display: "flex",
              alignItems: "center",
              gap: "16pt",
              textAlign: "left",
              marginBottom: `calc(1em * 0.7)`,
            }
          : photoHeader
            ? { ...s.headerStyle, textAlign: "center" }
            : s.headerStyle
      }
    >
      {photoSidebar && photo ? (
        <PhotoFrame
          src={photo}
          size="76pt"
          shape="rounded"
          {...photoAdjust}
        />
      ) : null}
      <div style={{ textAlign: photoHeader ? "center" : photoSidebar ? "left" : undefined }}>
        {photoHeader && photo ? (
          <div style={{ margin: "0 auto 8pt", width: "82pt" }}>
            <PhotoFrame
              src={photo}
              size="82pt"
              shape="circle"
              {...photoAdjust}
            />
          </div>
        ) : null}
        <NameTag style={s.nameStyle}>{doc.contact.name || "Your Name"}</NameTag>
        {doc.contact.headline ? (
          <p style={{ ...s.entryMetaStyle, margin: "2pt 0" }}>{doc.contact.headline}</p>
        ) : null}
        {contactInfo ? <p style={s.contactStyle}>{contactInfo}</p> : null}
      </div>
    </header>
  );

  const useTwoColumn = layout === "two-column" || photoSidebar;

  return (
    <div
      id={decorative ? undefined : "resume-preview"}
      ref={innerRef}
      data-page-size={settings.pageSize}
      style={{
        ...s.pageStyle,
        width: page.width,
        minHeight: page.height,
      }}
    >
      {header}
      {useTwoColumn ? (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "30% 1fr",
          }}
        >
          <div style={{ paddingRight: "18pt" }}>
            {(["skills", "certifications", "languages", "interests", "education"] as SectionId[]).map((section) => {
              const render = sectionRenderers[section];
              if (!render || !order.includes(section) || !isSectionVisible(doc, section)) {
                return null;
              }
              return (
                <div key={section} style={{ marginBottom: s.blockGap }}>
                  <SectionTag style={s.sectionTitleStyle}>{getSectionLabel(doc, section)}</SectionTag>
                  {render()}
                </div>
              );
            })}
          </div>
          <div
            style={{
              borderLeft: `1pt solid ${settings.accentColor}`,
              paddingLeft: "18pt",
            }}
          >
            {(["summary", "experience", "projects", "extracurriculars", "additional", "references"] as SectionId[]).map((section) => {
              const render = sectionRenderers[section];
              if (!render || !order.includes(section) || !isSectionVisible(doc, section)) {
                return null;
              }
              return (
                <div key={section} style={{ marginBottom: s.blockGap }}>
                  {section !== "summary" ? (
                    <SectionTag style={s.sectionTitleStyle}>
                      {getSectionLabel(doc, section)}
                    </SectionTag>
                  ) : null}
                  {render()}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        body
      )}
    </div>
  );
}
