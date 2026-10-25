import type { CoverLetterTone } from "@/lib/schema";

/**
 * Sentence banks for the deterministic generator.
 *
 * House rules for every string here:
 * - no em dashes,
 * - no "I am writing to apply for" or "I am writing to express my interest",
 * - the opening lead names the company, so an opening sentence always does,
 * - nothing asserts a fact about the candidate; facts are appended from resume
 *   fields by the generator, never invented here.
 */

export interface SlotVars {
  company: string;
  role: string;
}

/** Used when the company or role name is missing from the user's input. */
export const FALLBACK_COMPANY = "your team";
export const FALLBACK_ROLE = "this role";

function fill(template: string, vars: SlotVars): string {
  return template
    .replaceAll("{company}", vars.company || FALLBACK_COMPANY)
    .replaceAll("{role}", vars.role || FALLBACK_ROLE);
}

const OPENING: Record<CoverLetterTone, string[]> = {
  direct: [
    "{company} is hiring a {role}, and that is the work I have been doing for the last few years.",
    "The {role} opening at {company} lines up closely with the problems I solve day to day.",
    "I want to work on the problems {company} is solving, starting with the {role} role.",
    "{company} caught my attention because the {role} position describes my current work almost exactly.",
    "My last few years have been spent on the kind of systems {company} is hiring a {role} to build.",
    "I am applying for the {role} position at {company} because it matches the work I already do well.",
    "{company} needs a {role}, and my record is a direct answer to that requirement.",
    "The {role} role at {company} is the clearest match I have seen for my background.",
    "I would like to bring my experience to {company} as its next {role}.",
    "Reading the {role} description at {company}, I recognised my own day-to-day work in it.",
  ],
  warm: [
    "{company} is hiring a {role}, and the description reads like a summary of what I enjoy doing.",
    "I have been following {company} for a while, so the {role} opening was an easy decision to apply for.",
    "The {role} role at {company} is exactly the kind of work I want to be doing next.",
    "What drew me to {company} was the {role} posting, which describes work I care about.",
    "I am glad to be applying for the {role} role at {company}, because it fits what I do best.",
    "{company} sounds like a team I would enjoy joining, and the {role} role is a strong fit for me.",
    "When I read that {company} was hiring a {role}, the match with my background was hard to ignore.",
    "I would be glad to contribute to {company} as a {role}, and I have the record to show why.",
    "The {role} opening at {company} is the sort of role I have been working toward.",
    "I am excited by the chance to join {company} as a {role} and to keep building on what I know.",
  ],
  formal: [
    "I am submitting my application for the {role} position at {company}.",
    "Please consider my application for the {role} position at {company}.",
    "I wish to be considered for the {role} position currently open at {company}.",
    "My application concerns the {role} position at {company}, for which I am well qualified.",
    "I am applying for the {role} position at {company}, as advertised.",
    "This letter sets out my application for the {role} role at {company}.",
    "I am writing in respect of the {role} vacancy at {company}.",
    "I should like to apply for the {role} position at {company}.",
    "I am pleased to submit my application for the {role} position at {company}.",
    "My application is for the {role} position at {company}, and my experience is set out below.",
  ],
};

const OPENING_ACHIEVEMENT: Record<CoverLetterTone, string[]> = {
  direct: [
    "Most relevantly: {bullet}",
    "The clearest example: {bullet}",
    "One result worth starting with: {bullet}",
    "A recent example: {bullet}",
    "Concretely: {bullet}",
    "The work I would point to first: {bullet}",
    "For instance: {bullet}",
    "A representative result: {bullet}",
    "The line I would lead with: {bullet}",
    "In practice: {bullet}",
  ],
  warm: [
    "The piece of work I am proudest of is this: {bullet}",
    "A good example of how I work: {bullet}",
    "One thing I would love to talk about: {bullet}",
    "The work that best shows what I bring: {bullet}",
    "To take a recent example: {bullet}",
    "The result I would point to first: {bullet}",
    "Something I am glad to have shipped: {bullet}",
    "A result that says a lot about how I work: {bullet}",
    "The clearest illustration: {bullet}",
    "An example I keep coming back to: {bullet}",
  ],
  formal: [
    "By way of illustration, {lowerBullet}",
    "One relevant example is that {lowerBullet}",
    "A representative achievement: {bullet}",
    "For example, {lowerBullet}",
    "A pertinent example: {bullet}",
    "In particular, {lowerBullet}",
    "A recent example of this work: {bullet}",
    "Notably, {lowerBullet}",
    "By way of evidence, {lowerBullet}",
    "One example from my record: {bullet}",
  ],
};

const EVIDENCE_LEAD: Record<CoverLetterTone, string[]> = {
  direct: [
    "Two other results from the same period are worth setting out.",
    "That was not the only relevant piece of work.",
    "There is more of the same in my record.",
    "Two more examples make the pattern clear.",
    "The rest of the record points the same way.",
    "Beyond that, the same kind of work repeats.",
    "Two further results support the same case.",
    "The pattern holds across the rest of the work.",
    "Other parts of the record are just as relevant.",
    "Two more results belong alongside that one.",
  ],
  warm: [
    "Two other pieces of work would be worth discussing.",
    "There are a couple more examples I would like to mention.",
    "The same pattern shows up elsewhere in my record.",
    "I would add two more results to that picture.",
    "That work is not the only example I could give.",
    "Two more things I have done point the same way.",
    "There is a broader pattern behind that first example.",
    "A couple of other results round out the case.",
    "Two further pieces of work are worth a mention.",
    "The rest of my record tells a similar story.",
  ],
  formal: [
    "Two further examples may be of interest.",
    "The following results are also pertinent.",
    "Two additional achievements are relevant here.",
    "Further evidence from my record follows.",
    "The following examples support the same point.",
    "Two other results should be noted.",
    "Additional relevant experience is set out below.",
    "Two further achievements are worth recording.",
    "The following results are directly relevant.",
    "Two similar results may be cited.",
  ],
};

const FIT_SKILLS: Record<CoverLetterTone, string[]> = {
  direct: [
    "On the specifics the posting asks for, I work with {skills} every week.",
    "The tools named in the description line up with what I use: {skills}.",
    "My day-to-day stack covers the requirements: {skills}.",
    "The posting lists {skills}, and those are the tools I already use.",
    "Where the role asks for {skills}, that is my regular working set.",
    "On tooling, my working set is {skills}, which matches what the role names.",
    "The technical requirements map onto my daily work: {skills}.",
    "The role asks for {skills}, all of which I use regularly.",
    "My toolkit overlaps directly with the posting: {skills}.",
    "On the technical side, {skills} are part of my normal work.",
  ],
  warm: [
    "The tools I enjoy working with happen to be the ones the role names: {skills}.",
    "Much of my daily work is with {skills}, which is a good match for the posting.",
    "The posting mentions {skills}, and those are tools I am glad to work in.",
    "I spend most of my week in {skills}, which lines up well with the role.",
    "On the tooling side, I am comfortable across {skills}.",
    "The tools the role lists, {skills}, are the ones I reach for first.",
    "My working set is {skills}, and that covers what the description asks for.",
    "I work happily across {skills}, which is what the role calls for.",
    "The technical side of my work is mostly {skills}, matching the posting closely.",
    "It helps that the role names {skills}, since that is what I use most.",
  ],
  formal: [
    "The position calls for {skills}, which form part of my regular practice.",
    "My technical background includes {skills}, as the role requires.",
    "The required competencies include {skills}, all of which I use in my current work.",
    "The following competencies named in the posting are familiar to me: {skills}.",
    "My day-to-day work covers {skills}, which the position specifies.",
    "The role specifies {skills}; these are established parts of my practice.",
    "I have substantial working familiarity with {skills}, as the position requires.",
    "The technical requirements align with my experience in {skills}.",
    "My practice regularly involves {skills}, among the listed requirements.",
    "The position's technical requirements, including {skills}, match my background.",
  ],
};

const FIT_PROJECTS: Record<CoverLetterTone, string[]> = {
  direct: [
    "Outside employment, {project} shows the same approach: {bullet}",
    "The closest self-directed example is {project}: {bullet}",
    "A project worth naming is {project}: {bullet}",
    "On my own time I built {project}: {bullet}",
    "{project} is the clearest personal example: {bullet}",
    "Independently, I built {project}: {bullet}",
    "My own project {project} follows the same method: {bullet}",
    "A side project that fits the role is {project}: {bullet}",
    "I also built {project}: {bullet}",
    "{project} demonstrates the same skills: {bullet}",
  ],
  warm: [
    "I also enjoyed building {project}, where {lowerBullet}",
    "One project I am fond of is {project}: {bullet}",
    "Outside work I built {project}, where {lowerBullet}",
    "{project} is a project I chose to take on: {bullet}",
    "I spent time on {project} for the same reasons: {bullet}",
    "A personal project, {project}, shows the same interest: {bullet}",
    "I also made time for {project}: {bullet}",
    "{project} was a labour of interest: {bullet}",
    "One thing I built for myself is {project}: {bullet}",
    "I would also mention {project}: {bullet}",
  ],
  formal: [
    "Independently of employment, I undertook {project}, in which {lowerBullet}",
    "A relevant project is {project}: {bullet}",
    "I have also completed {project}: {bullet}",
    "One further project demonstrates this: {project}.",
    "My project work includes {project}: {bullet}",
    "I undertook {project} independently: {bullet}",
    "A personal project, {project}, is also relevant: {bullet}",
    "In addition, {project} involved the same skills: {bullet}",
    "I completed {project} outside of employment: {bullet}",
    "A further example is {project}: {bullet}",
  ],
};

const FIT_COURSEWORK: Record<CoverLetterTone, string[]> = {
  direct: [
    "My studies covered the same ground: {skills}.",
    "The degree work that matters here is in {skills}.",
    "Coursework relevant to the role covers {skills}.",
    "On the academic side, I have worked with {skills}.",
    "The programme included {skills}, which the role also names.",
    "My coursework covers {skills}.",
    "Relevant academic work includes {skills}.",
    "I studied {skills}, among other subjects.",
    "The degree gave me grounding in {skills}.",
    "Academic work relevant here: {skills}.",
  ],
  warm: [
    "My coursework introduced me to {skills}, which I have kept using.",
    "I enjoyed the academic side most where it touched {skills}.",
    "The degree covered {skills}, and those are the parts I kept.",
    "Studying {skills} was the highlight of the programme for me.",
    "My studies gave me a foundation in {skills}.",
    "Coursework in {skills} is where I did my best work.",
    "I built the academic foundation in {skills}.",
    "The programme covered {skills}, which I am glad to keep using.",
    "I studied {skills} and have kept up with them since.",
    "My degree work centred on {skills}.",
  ],
  formal: [
    "My academic work covered {skills}.",
    "The degree programme included {skills}, which are relevant here.",
    "My studies provided a foundation in {skills}.",
    "Relevant coursework includes {skills}.",
    "The programme's coverage of {skills} is pertinent to this role.",
    "Academic preparation in {skills} supports this application.",
    "The degree included substantial work in {skills}.",
    "My studies addressed {skills}, among the listed requirements.",
    "Coursework in {skills} forms part of the relevant background.",
    "Academic work in {skills} is directly applicable.",
  ],
};

const CLOSING: Record<CoverLetterTone, string[]> = {
  direct: [
    "I can start at short notice and would welcome a conversation about the role.",
    "I am available for an interview at your convenience.",
    "I would be glad to discuss the role further, and I can start soon.",
    "Happy to talk through any of the above at a time that suits you.",
    "I am available to start promptly and would welcome the chance to talk.",
    "I can make time for an interview whenever suits your team.",
    "I would welcome the chance to go through this in person.",
    "I am ready to start and glad to answer any questions first.",
    "I would be glad to discuss the details whenever convenient.",
    "I can be available quickly and would welcome a conversation.",
  ],
  warm: [
    "I would love to talk about the role and where I could help first.",
    "I would be glad to talk through any of this whenever suits you.",
    "I hope we get the chance to speak about the role.",
    "I would enjoy the chance to talk about how I could contribute.",
    "I would be happy to chat about the role at your convenience.",
    "I hope to have the chance to discuss this with you.",
    "I would welcome a conversation whenever it suits your team.",
    "I would be glad to talk more about the work and the team.",
    "It would be good to talk this through with you.",
    "I would enjoy hearing more about the role and the team.",
  ],
  formal: [
    "I am available for interview at your convenience.",
    "I would welcome the opportunity to discuss my application further.",
    "I am available to attend an interview at any mutually convenient time.",
    "I would be pleased to provide further detail at interview.",
    "I remain available to discuss the position at your convenience.",
    "I would welcome the opportunity to expand on the above.",
    "I am available to attend an interview whenever convenient.",
    "I would be glad to discuss the position in more detail.",
    "I am available to provide any further information you require.",
    "I would welcome the chance to discuss the role further.",
  ],
};

const GREETING: Record<CoverLetterTone, string[]> = {
  direct: ["Dear {name},", "Hello {name},", "Dear {name},"],
  warm: ["Dear {name},", "Hello {name},", "Dear {name},"],
  formal: ["Dear {name},", "Dear {name},", "Dear {name},"],
};

const SIGN_OFF: Record<CoverLetterTone, string> = {
  direct: "Sincerely,",
  warm: "Best regards,",
  formal: "Yours sincerely,",
};

export const SUBJECT_TEMPLATES = [
  "Application for {role}",
  "Application: {role}",
  "{role} application",
  "Application for the {role} position",
  "Re: {role}",
];

/**
 * FNV-1a over the seed string. Cheap, synchronous, and stable across browsers
 * and Node, which is what the determinism guarantee needs.
 */
export function hashSeed(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i++) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash >>> 0;
}

/** Pick a variant deterministically, offsetting so slots do not move in lockstep. */
function pick(variants: string[], seed: string, slot: number): string {
  return variants[(hashSeed(seed) + slot * 17) % variants.length];
}

export type Slot =
  | "opening"
  | "openingAchievement"
  | "evidenceLead"
  | "fitSkills"
  | "fitProjects"
  | "fitCoursework"
  | "closing";

const BANKS: Record<Slot, Record<CoverLetterTone, string[]>> = {
  opening: OPENING,
  openingAchievement: OPENING_ACHIEVEMENT,
  evidenceLead: EVIDENCE_LEAD,
  fitSkills: FIT_SKILLS,
  fitProjects: FIT_PROJECTS,
  fitCoursework: FIT_COURSEWORK,
  closing: CLOSING,
};

const SLOT_ORDER: Slot[] = [
  "opening",
  "openingAchievement",
  "evidenceLead",
  "fitSkills",
  "fitProjects",
  "fitCoursework",
  "closing",
];

/** A filled sentence for one slot, chosen deterministically from `seed`. */
export function sentence(slot: Slot, tone: CoverLetterTone, seed: string, vars: SlotVars): string {
  const variants = BANKS[slot][tone];
  const template = pick(variants, seed, SLOT_ORDER.indexOf(slot));
  return fill(template, vars);
}

/** Variant index for a slot, so tests can assert pick stability. */
export function variantIndex(slot: Slot, seed: string): number {
  const variants = BANKS[slot].direct;
  return (hashSeed(seed) + SLOT_ORDER.indexOf(slot) * 17) % variants.length;
}

export function greeting(name: string, tone: CoverLetterTone, seed: string): string {
  const template = pick(GREETING[tone], seed, 11);
  return template.replace("{name}", name);
}

export function signOff(tone: CoverLetterTone): string {
  return SIGN_OFF[tone];
}

export function subjectLine(role: string, seed: string): string {
  return pick(SUBJECT_TEMPLATES, seed, 13).replace("{role}", role || FALLBACK_ROLE);
}

/** Every sentence bank, for tests that police house style. */
export function allTemplates(): string[] {
  return [
    ...Object.values(OPENING).flat(),
    ...Object.values(OPENING_ACHIEVEMENT).flat(),
    ...Object.values(EVIDENCE_LEAD).flat(),
    ...Object.values(FIT_SKILLS).flat(),
    ...Object.values(FIT_PROJECTS).flat(),
    ...Object.values(FIT_COURSEWORK).flat(),
    ...Object.values(CLOSING).flat(),
    ...Object.values(GREETING).flat(),
    ...SUBJECT_TEMPLATES,
  ];
}

/** Lower-case the first letter of a quoted bullet, for mid-sentence use. */
export function lowerFirst(text: string): string {
  if (!text) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

/** Fill `{bullet}` style placeholders, falling back to the sentence's own form. */
export function fillSentence(
  template: string,
  vars: SlotVars & { bullet?: string; lowerBullet?: string; skills?: string; project?: string },
): string {
  let out = fill(template, vars);
  const bullet = vars.bullet ?? "";
  out = out
    .replaceAll("{bullet}", bullet)
    .replaceAll("{lowerBullet}", vars.lowerBullet ?? lowerFirst(bullet))
    .replaceAll("{skills}", vars.skills ?? "")
    .replaceAll("{project}", vars.project ?? "");
  return out.replace(/\s+([.,;:])/g, "$1").replace(/\s{2,}/g, " ").trim();
}

/**
 * Same selection as `sentence`, but leaves placeholders for `fillSentence`, so
 * a bullet containing braces or a full stop cannot corrupt the template.
 */
export function rawSentence(slot: Slot, tone: CoverLetterTone, seed: string): string {
  return pick(BANKS[slot][tone], seed, SLOT_ORDER.indexOf(slot));
}
