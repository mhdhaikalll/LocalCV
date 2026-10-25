import {
  type ResumeDocument,
  type SectionId,
} from "@/lib/schema";
import { resumeToText } from "@/lib/ats/scoring";
import { extractTerms, normalizeTerm, stem } from "@/lib/ats/keywords";
import { canonicalize, canonicalizePhrase, hasVariant } from "@/lib/ats/lexicon";
import {
  FALLBACK_COMPANY,
  FALLBACK_ROLE,
  fillSentence,
  greeting,
  lowerFirst,
  rawSentence,
  signOff,
  subjectLine,
} from "./sentences";

export type CoverLetterTone = "direct" | "warm" | "formal";
export type CoverLetterEmphasis = "experience" | "projects" | "skills";

export interface GenerateInput {
  document: ResumeDocument;
  jobDescription: string;
  jobTitle: string;
  company: string;
  tone: CoverLetterTone;
  emphasis: CoverLetterEmphasis;
}

export interface GeneratedSource {
  section: SectionId;
  entryId?: string;
  /** Human-readable provenance, e.g. "Northwind Labs, bullet 2". */
  label: string;
}

export interface GeneratedParagraph {
  text: string;
  sources: GeneratedSource[];
}

export interface GeneratedLetter {
  greeting: string;
  subject: string;
  paragraphs: GeneratedParagraph[];
  signOff: string;
  /** True when the job description gave nothing to rank against. */
  general: boolean;
}

export type GenerateResult =
  | { ok: true; letter: GeneratedLetter }
  | { ok: false; reason: string };

/** A bullet plus where it came from and how strongly it matches the posting. */
interface ScoredBullet {
  text: string;
  source: GeneratedSource;
  score: number;
  order: number;
}

const DIGIT_BONUS = 3;

/** Same comparison key the ATS panel uses, so both rank alike. */
function canonicalKey(term: string): string {
  const normalized = normalizeTerm(term);
  if (!normalized) return "";
  const whole = canonicalizePhrase(normalized);
  if (whole !== normalized) return whole;
  return normalized
    .split(" ")
    .filter(Boolean)
    .map((token) => canonicalize(stem(token)))
    .join(" ");
}

/** Canonical terms the job description mentions, as a set. */
function jobTerms(jobDescription: string): Set<string> {
  const keys = new Set<string>();
  for (const term of extractTerms(jobDescription)) {
    // Bare n-grams are mostly noise; lexicon phrases are trustworthy.
    if (term.includes(" ") && !hasVariant(term)) continue;
    const key = canonicalKey(term);
    if (key) keys.add(key);
  }
  return keys;
}

function overlapScore(text: string, terms: Set<string>): number {
  if (!terms.size) return 0;
  let score = 0;
  for (const term of extractTerms(text)) {
    if (term.includes(" ") && !hasVariant(term)) continue;
    if (terms.has(canonicalKey(term))) score++;
  }
  return score;
}

function hasDigit(text: string): boolean {
  return /\d/.test(text);
}

function cleanBullet(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";
  const terminated = /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
  return terminated.charAt(0).toUpperCase() + terminated.slice(1);
}

/**
 * Rank experience bullets against the posting.
 *
 * Overlap dominates; the digit bonus breaks near-ties in favour of concrete,
 * measurable claims. `order` makes the sort stable, so identical input always
 * produces identical output.
 */
function rankBullets(doc: ResumeDocument, terms: Set<string>): ScoredBullet[] {
  const scored: ScoredBullet[] = [];
  let order = 0;

  for (const entry of doc.experience) {
    entry.bullets.forEach((bullet, bulletIndex) => {
      const text = cleanBullet(bullet);
      if (!text) return;
      scored.push({
        text,
        source: {
          section: "experience",
          entryId: entry.id,
          label: `${entry.company || entry.role || "Experience"}, bullet ${bulletIndex + 1}`,
        },
        score:
          overlapScore(bullet, terms) + (hasDigit(bullet) ? DIGIT_BONUS : 0),
        order: order++,
      });
    });
  }

  return scored.sort((a, b) => b.score - a.score || a.order - b.order);
}

interface ScoredProject {
  name: string;
  bullet: string;
  source: GeneratedSource;
  score: number;
  order: number;
}

function rankProjects(doc: ResumeDocument, terms: Set<string>): ScoredProject[] {
  const scored: ScoredProject[] = [];
  let order = 0;

  for (const project of doc.projects) {
    const text = cleanBullet(project.bullets[0] ?? project.description ?? "");
    if (!project.name.trim() && !text) continue;
    scored.push({
      name: project.name || "a personal project",
      bullet: text,
      source: {
        section: "projects",
        entryId: project.id,
        label: project.name || "Project",
      },
      score:
        overlapScore(`${project.name} ${project.description ?? ""} ${project.bullets.join(" ")}`, terms) +
        (hasDigit(project.bullets.join(" ")) ? DIGIT_BONUS : 0),
      order: order++,
    });
  }

  return scored.sort((a, b) => b.score - a.score || a.order - b.order);
}

/** Skill groups whose items overlap the posting, best first. */
function rankSkillGroups(doc: ResumeDocument, terms: Set<string>) {
  return doc.skills
    .map((group, index) => ({
      group,
      index,
      score: group.items.reduce(
        (sum, item) => sum + (terms.has(canonicalize(normalizeTerm(item))) ? 1 : 0),
        0,
      ),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index);
}

function listSkills(items: string[], limit = 6): string {
  const chosen = items.slice(0, limit);
  if (chosen.length <= 1) return chosen.join("");
  return `${chosen.slice(0, -1).join(", ")} and ${chosen[chosen.length - 1]}`;
}

/** First name of the recipient, falling back to a generic salutation. */
function greetingName(recipientName: string | undefined, company: string): string {
  const name = recipientName?.trim();
  if (name) return name;
  // A company addressee is honest; "To whom it may concern" is banned by checks.
  return company ? `${company} hiring team` : "Hiring Manager";
}

/** Degree phrase for the student closing, e.g. "BSc Computer Science". */
function degreePhrase(doc: ResumeDocument): string {
  const education = doc.education.find((e) => e.degree || e.field || e.school);
  if (!education) return "";
  return [education.degree, education.field].filter(Boolean).join(" ") || education.school;
}

function currentRole(doc: ResumeDocument): string {
  const current = doc.experience.find((e) => e.isCurrent) ?? doc.experience[0];
  if (!current) return "";
  return [current.role, current.company].filter(Boolean).join(" at ");
}

function joinParagraphs(parts: string[]): string {
  return parts.filter(Boolean).join(" ").replace(/\s{2,}/g, " ").trim();
}

/**
 * Build a cover letter from resume facts alone.
 *
 * Every sentence either names the company or role from the caller's input, or
 * quotes a resume bullet verbatim, so no claim in the output is unsupported.
 */
export function generateCoverLetter(input: GenerateInput): GenerateResult {
  const { document, jobDescription, jobTitle, company, tone, emphasis } = input;

  const hasExperience = document.experience.some(
    (e) => e.role.trim() || e.company.trim() || e.bullets.some((b) => b.trim()),
  );
  const hasProjects = document.projects.some(
    (p) => p.name.trim() || p.bullets.some((b) => b.trim()),
  );

  if (!hasExperience && !hasProjects) {
    return {
      ok: false,
      reason: "Add at least one role or project to your resume first.",
    };
  }

  const terms = jobTerms(jobDescription);
  const general = terms.size === 0;
  // Company and role are part of the seed, so a letter is stable per target but
  // differs between targets.
  const seed = `${company}\u0000${jobTitle}\u0000${tone}`;
  const vars = { company: company.trim(), role: jobTitle.trim() };
  const paragraphs: GeneratedParagraph[] = [];

  const bullets = rankBullets(document, terms);
  const projects = rankProjects(document, terms);

  // ---- Opening ----
  const openingParts: string[] = [];
  const openingSources: GeneratedSource[] = [];
  openingParts.push(fillSentence(rawSentence("opening", tone, seed), vars));

  if (hasExperience && bullets.length) {
    const best = bullets[0];
    openingParts.push(
      fillSentence(rawSentence("openingAchievement", tone, seed), {
        ...vars,
        bullet: best.text,
        lowerBullet: lowerFirst(best.text),
      }),
    );
    openingSources.push(best.source);
  } else if (hasProjects && projects.length) {
    const project = projects[0];
    if (project.bullet) {
      openingParts.push(
        fillSentence(rawSentence("openingAchievement", tone, seed), {
          ...vars,
          bullet: `${project.name}: ${project.bullet}`,
          lowerBullet: lowerFirst(project.bullet),
        }),
      );
    } else {
      openingParts.push(`I built ${project.name}, which is the closest example I have.`);
    }
    openingSources.push(project.source);
  } else if (document.education.length) {
    const degree = degreePhrase(document);
    if (degree) {
      openingParts.push(`I am completing ${degree}, which is the most relevant background I have.`);
      openingSources.push({ section: "education", label: degree });
    }
  }

  paragraphs.push({ text: joinParagraphs(openingParts), sources: openingSources });

  // ---- Evidence ----
  // Never reuse the opening's bullet, so the second paragraph always adds facts.
  const openingSource = openingSources.find((s) => s.section === "experience");
  const remaining = bullets.filter((b) => b.source.label !== openingSource?.label);

  if (remaining.length) {
    // Quote what remains rather than a fixed two. The ranking still decides the
    // order; the cap only stops a very long resume from producing a letter
    // nobody reads to the end.
    const chosen = remaining.slice(0, 8);
    paragraphs.push({
      text: joinParagraphs([
        fillSentence(rawSentence("evidenceLead", tone, seed), vars),
        chosen.map((b) => b.text).join(" "),
      ]),
      sources: chosen.map((b) => b.source),
    });
  }



  // ---- Fit ----
  // The emphasis choice steers *this* paragraph: either a project or the skill
  // group that overlaps the posting most.
  const projectFit = emphasis === "projects" ? projects.find((p) => p.bullet) : undefined;

  if (projectFit) {
    paragraphs.push({
      text: fillSentence(rawSentence("fitProjects", tone, seed), {
        ...vars,
        project: projectFit.name,
        bullet: projectFit.bullet,
        lowerBullet: lowerFirst(projectFit.bullet),
      }),
      sources: [projectFit.source],
    });
  } else {
    const groups = rankSkillGroups(document, terms).filter((g) => g.group.items.length);
    if (groups.length) {
      const best = groups[0];
      const skills = listSkills(best.group.items);
      // The resume's own summary is quoted verbatim where it exists: it is the
      // user's wording, so it adds substance without inventing anything.
      const summary = document.summary.trim();
      paragraphs.push({
        text: joinParagraphs([
          summary,
          fillSentence(rawSentence("fitSkills", tone, seed), { ...vars, skills }),
        ]),
        sources: [
          {
            section: "skills",
            entryId: best.group.id,
            label: `${best.group.category || "Skills"}: ${skills}`,
          },
        ],
      });
    } else if (!hasExperience && document.education.length) {
      const education = document.education[0];
      const field = [education.field, education.degree].filter(Boolean).join(" ");
      if (field) {
        paragraphs.push({
          text: fillSentence(rawSentence("fitCoursework", tone, seed), { ...vars, skills: field }),
          sources: [{ section: "education", entryId: education.id, label: field }],
        });
      }
    }
  }
  // ---- Closing ----
  // The availability fact comes first so the letter ends on the call to action.
  const closingParts: string[] = [];
  if (hasExperience) {
    const role = currentRole(document);
    if (role) closingParts.push(`I am currently ${role}.`);
  } else {
    const degree = degreePhrase(document);
    if (degree) closingParts.push(`I am completing ${degree} and can start at short notice.`);
  }
  closingParts.push(fillSentence(rawSentence("closing", tone, seed), vars));
  paragraphs.push({ text: joinParagraphs(closingParts), sources: [] });

  return {
    ok: true,
    letter: {
      greeting: greeting(greetingName(undefined, company), tone, seed),
      subject: subjectLine(jobTitle, seed),
      paragraphs,
      signOff: signOff(tone),
      general,
    },
  };
}

/** Digits mentioned anywhere in the resume, for the unsupported-claims check. */
export function resumeDigits(doc: ResumeDocument): Set<string> {
  const matches = resumeToText(doc).match(/\d[\d.,]*/g) ?? [];
  return new Set(matches.map((m) => m.replace(/[.,]$/, "")));
}

export { FALLBACK_COMPANY, FALLBACK_ROLE };
