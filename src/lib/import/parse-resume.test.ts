import { describe, expect, it } from "vitest";
import {
  BULLET_RE,
  DATE_RE,
  GPA_RE,
  SECTION_HEADERS,
  parseBullets,
  splitSections,
} from "@/lib/import/parse-resume";

describe("splitSections", () => {
  it("detects every header alias in SECTION_HEADERS", () => {
    for (const [alias, section] of Object.entries(SECTION_HEADERS)) {
      const sections = splitSections(`Ada Lovelace\n${alias.toUpperCase()}\nBody line`);
      const matched = sections.find((s) => s.rawHeader);
      expect(matched?.header, alias).toBe(section);
      expect(matched?.rawHeader, alias).toBe(alias.toUpperCase());
    }
  });

  it("ignores header-looking lines longer than 40 characters", () => {
    const long = `${"skills".toUpperCase()} and a very long tail that makes the line long`;
    const sections = splitSections(`Ada\n${long}`);
    expect(sections).toHaveLength(1);
    expect(sections[0].header).toBe("__contact__");
  });

  it("starts with a contact bucket and keeps body lines in order", () => {
    const sections = splitSections("Ada Lovelace\nada@example.com\nEXPERIENCE\nEngineer");
    expect(sections[0].header).toBe("__contact__");
    expect(sections[0].body).toEqual(["Ada Lovelace", "ada@example.com"]);
    expect(sections[1].header).toBe("experience");
    expect(sections[1].body).toEqual(["Engineer"]);
  });
});

describe("parseBullets", () => {
  it("strips every supported bullet marker", () => {
    const lines = ["- hyphen", "• bullet", "● filled", "▪ square", "◦ open", "· middot"];
    expect(parseBullets(lines)).toEqual([
      "hyphen",
      "bullet",
      "filled",
      "square",
      "open",
      "middot",
    ]);
  });

  it("drops empty lines and punctuation-only lines", () => {
    expect(parseBullets(["", "  ", "---", "- real point"])).toEqual(["real point"]);
  });

  it("matches markers through BULLET_RE", () => {
    for (const marker of ["-", "•", "●", "▪", "◦", "·"]) {
      expect(BULLET_RE.test(`${marker} item`)).toBe(true);
    }
    expect(BULLET_RE.test("plain item")).toBe(false);
  });
});

describe("DATE_RE", () => {
  it("matches years, ranges and open-ended ranges", () => {
    expect(DATE_RE.exec("2019")?.[0]).toBe("2019");
    expect(DATE_RE.exec("2021 – 2024")?.[0]).toBe("2021 – 2024");
    expect(DATE_RE.exec("2019 - current")?.[0]).toBe("2019 - current");
  });
});

describe("GPA_RE", () => {
  it.each([
    ["CGPA 3.8/4.0", "3.8/4.0"],
    ["GPA: 3.8", "3.8"],
    ["Grade 3.8", "3.8"],
    ["cgpa: 3.91 / 4.00", "3.91 / 4.00"],
  ])("parses %s", (input, expected) => {
    expect(GPA_RE.exec(input)?.[1]).toBe(expected);
  });
});
