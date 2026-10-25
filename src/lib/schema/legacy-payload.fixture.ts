/**
 * A document saved by the editor before the v2 work (CGPA, extracurriculars and
 * the customizable additional section all exist already, so this pins the shape
 * users' browsers actually hold). Keep it verbatim: it is the compatibility
 * contract for persistence and import.
 */
export const LEGACY_STORED_DOCUMENT = {
  version: 1,
  contact: {
    name: "Priya Raman",
    headline: "Backend Engineer",
    email: "priya.raman@example.com",
    phone: "+60 12-345 6789",
    location: "Kuala Lumpur, Malaysia",
    website: "priya.example.com",
    linkedin: "linkedin.com/in/priyaraman",
    github: "https://github.com/priyaraman",
  },
  summary:
    "Backend engineer with four years building payment systems in Go and Postgres.",
  experience: [
    {
      id: "legacy-exp-1",
      role: "Backend Engineer",
      company: "PayHarbour",
      location: "Kuala Lumpur",
      startDate: "2022",
      isCurrent: true,
      bullets: [
        "Migrated settlement jobs to a queue, cutting failed payouts by 38%.",
        "Owned the Postgres schema for merchant balances.",
      ],
    },
  ],
  education: [
    {
      id: "legacy-edu-1",
      school: "Universiti Malaya",
      degree: "BSc Computer Science",
      cgpa: "3.8/4.0",
      startDate: "2017",
      endDate: "2021",
      isCurrent: false,
      bullets: [],
    },
  ],
  projects: [],
  skills: [
    { id: "legacy-skill-1", category: "Languages", items: ["Go", "SQL", "TypeScript"] },
  ],
  certifications: [],
  extracurriculars: [
    {
      id: "legacy-extra-1",
      organization: "Malaysian Computing Society",
      role: "Volunteer mentor",
      date: "2023 – 2024",
      bullets: [],
    },
  ],
  additional: {
    heading: "Awards",
    entries: [
      {
        id: "legacy-add-1",
        title: "Dean's List",
        subtitle: "Universiti Malaya",
        date: "2020",
        bullets: [],
      },
    ],
  },
  references: [],
  languages: ["English", "Malay", "Tamil"],
  interests: ["Trail running", "Chess"],
  sectionOrder: [
    "summary",
    "experience",
    "education",
    "projects",
    "skills",
    "certifications",
    "extracurriculars",
    "additional",
    "references",
    "languages",
    "interests",
  ],
  sectionVisibility: {
    summary: true,
    experience: true,
    education: true,
    projects: true,
    skills: true,
    certifications: true,
    extracurriculars: true,
    additional: true,
    references: false,
    languages: true,
    interests: true,
  },
} as const;

/** What `persist` writes under `rm.resume.v1`. */
export const LEGACY_STORAGE_PAYLOAD = {
  state: {
    document: LEGACY_STORED_DOCUMENT,
    settings: {
      templateId: "modern",
      fontSize: 10.5,
      fontFamily: "Inter",
      primaryColor: "#111827",
      accentColor: "#2563eb",
      lineHeight: 1.4,
      pageSize: "A4",
      margins: 18,
      spacing: "normal",
    },
    jobDescription: "",
  },
  version: 0,
} as const;
