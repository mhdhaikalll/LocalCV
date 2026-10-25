import { describe, expect, it } from "vitest";
import {
  DEFAULT_ADDITIONAL_HEADING,
  DEFAULT_SECTION_ORDER,
  ExportEnvelopeSchema,
  buildExportEnvelope,
  createDefaultSettings,
  createEmptyDocument,
  sanitizeDocument,
} from "@/lib/schema";
import { LEGACY_STORAGE_PAYLOAD } from "@/lib/schema/legacy-payload.fixture";

describe("sanitizeDocument", () => {
  it("falls back to defaults for missing and unknown fields", () => {
    const doc = sanitizeDocument({
      version: 99,
      contact: { name: "Ada", unknownField: "ignored" },
      summary: undefined,
      experience: "not an array",
      projects: [{ name: 42 }],
      sectionOrder: ["skills", "nonsense", "skills"],
      sectionVisibility: { summary: false, bogus: true },
      extra: true,
    });

    expect(doc.version).toBe(1);
    expect(doc.contact.name).toBe("Ada");
    expect(doc.summary).toBe("");
    expect(doc.experience).toEqual([]);
    expect(doc.projects).toHaveLength(1);
    expect(doc.projects[0].name).toBe("");
    expect(doc.projects[0].bullets).toEqual([]);
    expect(doc.references).toEqual([]);
    expect(doc.additional).toEqual({ heading: DEFAULT_ADDITIONAL_HEADING, entries: [] });
    expect(doc.sectionOrder[0]).toBe("skills");
    expect(new Set(doc.sectionOrder).size).toBe(DEFAULT_SECTION_ORDER.length);
    expect(doc.sectionVisibility.summary).toBe(false);
    expect(doc.sectionVisibility.experience).toBe(true);
  });

  it("accepts empty strings for optional URL and email fields", () => {
    const doc = sanitizeDocument({
      ...createEmptyDocument(),
      contact: {
        name: "Ada",
        email: "",
        website: "",
        linkedin: "",
        github: "",
      },
    });

    expect(doc.contact.email).toBeUndefined();
    expect(doc.contact.website).toBeUndefined();
    expect(doc.contact.linkedin).toBeUndefined();
    expect(doc.contact.github).toBeUndefined();
  });

  it("adds a missing section id to the end of sectionOrder", () => {
    const doc = sanitizeDocument({ sectionOrder: ["skills", "summary"] });

    expect(doc.sectionOrder.slice(0, 2)).toEqual(["skills", "summary"]);
    expect(doc.sectionOrder).toHaveLength(DEFAULT_SECTION_ORDER.length);
    const added = doc.sectionOrder.slice(2);
    expect(added).toEqual(
      DEFAULT_SECTION_ORDER.filter((id) => id !== "skills" && id !== "summary"),
    );
  });

  it("defaults an unknown visibility key to true", () => {
    const doc = sanitizeDocument({ sectionVisibility: { projects: false } });

    expect(doc.sectionVisibility.projects).toBe(false);
    expect(doc.sectionVisibility.interests).toBe(true);
    expect(Object.keys(doc.sectionVisibility).sort()).toEqual(
      [...DEFAULT_SECTION_ORDER].sort(),
    );
  });

  it("clamps the additional heading to 40 characters and defaults when blank", () => {
    const long = sanitizeDocument({
      additional: { heading: "x".repeat(60), entries: [] },
    });
    expect(long.additional.heading).toHaveLength(40);

    const blank = sanitizeDocument({ additional: { heading: "   ", entries: [] } });
    expect(blank.additional.heading).toBe(DEFAULT_ADDITIONAL_HEADING);
  });

  it("folds legacy extracurricular startDate/endDate into a single date", () => {
    const doc = sanitizeDocument({
      extracurriculars: [
        {
          id: "e1",
          organization: "Chess Club",
          startDate: "2020",
          endDate: "2021",
          bullets: ["Ran the weekly ladder"],
        },
      ],
    });

    expect(doc.extracurriculars[0].date).toBe("2020 – 2021");
  });

  it("round-trips a full export envelope without loss", () => {
    const document = sanitizeDocument({
      ...LEGACY_STORAGE_PAYLOAD.state.document,
      sectionVisibility: { ...LEGACY_STORAGE_PAYLOAD.state.document.sectionVisibility },
    });
    const settings = createDefaultSettings();
    const envelope = buildExportEnvelope(document, settings);

    const parsed = ExportEnvelopeSchema.parse(JSON.parse(JSON.stringify(envelope)));
    expect(parsed.document).toEqual(document);
    expect(sanitizeDocument(parsed.document)).toEqual(document);
    expect(parsed.settings).toEqual(settings);
  });

  it("loads a document saved before the v2 work", () => {
    const doc = sanitizeDocument(LEGACY_STORAGE_PAYLOAD.state.document);

    expect(doc.contact.name).toBe("Priya Raman");
    expect(doc.education[0].cgpa).toBe("3.8/4.0");
    expect(doc.extracurriculars[0].date).toBe("2023 – 2024");
    expect(doc.additional.heading).toBe("Awards");
    expect(doc.sectionVisibility.references).toBe(false);
  });
});
