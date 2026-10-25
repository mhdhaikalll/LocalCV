import { describe, expect, it } from "vitest";
import { createEmptyDocument, DEFAULT_SECTION_ORDER, type ResumeDocument } from "@/lib/schema";
import { isSectionEmpty, isSectionVisible, visibleSections } from "@/lib/templates/style-context";

function filled(): ResumeDocument {
  const doc = createEmptyDocument();
  doc.contact.name = "Ada Lovelace";
  doc.summary = "Analytical engine programmer.";
  doc.experience = [
    {
      id: "e1",
      role: "Engineer",
      company: "Analytical",
      isCurrent: true,
      bullets: ["Wrote notes"],
    },
  ];
  doc.education = [{ id: "ed1", school: "Home", isCurrent: false, bullets: [] }];
  doc.projects = [{ id: "p1", name: "Engine", bullets: [] }];
  doc.skills = [{ id: "s1", category: "Math", items: ["Algebra"] }];
  doc.certifications = [{ id: "c1", name: "Fellow" }];
  doc.extracurriculars = [
    { id: "x1", organization: "Society", date: "1840", bullets: [] },
  ];
  doc.additional = {
    heading: "Awards",
    entries: [{ id: "a1", title: "Medal", bullets: [] }],
  };
  doc.references = [{ id: "r1", name: "Charles Babbage" }];
  doc.languages = ["English"];
  doc.interests = ["Music"];
  return doc;
}

describe("isSectionEmpty", () => {
  it("is true for every section of a fresh document", () => {
    const doc = createEmptyDocument();
    for (const id of DEFAULT_SECTION_ORDER) {
      expect(isSectionEmpty(doc, id), id).toBe(true);
    }
  });

  it("is false for every populated section", () => {
    const doc = filled();
    for (const id of DEFAULT_SECTION_ORDER) {
      expect(isSectionEmpty(doc, id), id).toBe(false);
    }
  });

  it("treats whitespace-only summary as empty", () => {
    const doc = filled();
    doc.summary = "   \n ";
    expect(isSectionEmpty(doc, "summary")).toBe(true);
  });

  it("treats skill groups with no items as empty", () => {
    const doc = filled();
    doc.skills = [{ id: "s1", category: "Math", items: [] }];
    expect(isSectionEmpty(doc, "skills")).toBe(true);
  });

  it("treats an additional heading with no entries as empty", () => {
    const doc = filled();
    doc.additional = { heading: "Awards", entries: [] };
    expect(isSectionEmpty(doc, "additional")).toBe(true);
  });

  it("counts an extracurricular with only a role as non-empty", () => {
    const doc = filled();
    doc.extracurriculars = [{ id: "x1", organization: "", role: "Mentor", bullets: [] }];
    expect(isSectionEmpty(doc, "extracurriculars")).toBe(false);
  });

  it("treats an unknown section id as empty", () => {
    expect(isSectionEmpty(filled(), "unknown")).toBe(true);
  });
});

describe("isSectionVisible", () => {
  it("hides a toggled-off section even when it has content", () => {
    const doc = filled();
    doc.sectionVisibility.experience = false;
    expect(isSectionVisible(doc, "experience")).toBe(false);
  });

  it("hides an empty but toggled-on section", () => {
    const doc = createEmptyDocument();
    expect(doc.sectionVisibility.projects).toBe(true);
    expect(isSectionVisible(doc, "projects")).toBe(false);
  });

  it("respects sectionOrder, skipping invisible sections", () => {
    const doc = filled();
    doc.sectionOrder = ["skills", "experience", "summary", "education"];
    doc.sectionVisibility.experience = false;

    expect(visibleSections(doc)).toEqual(["skills", "summary", "education"]);
  });
});
