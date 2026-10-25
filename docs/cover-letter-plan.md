# Cover Letter Generator — Implementation Plan

A deterministic cover letter generator that derives every sentence from the resume the user already wrote, works with `AI_ENABLED=false`, and prints through the same pipeline as the resume. AI is an optional polish step, never the primary path.

This document is a companion to `docs/v2-plan.md` and depends on several of its phases. Read that plan first.

## Why this shape

A generic "AI cover letter generator" is a different product: it dilutes the local-first positioning, needs a provider to function, and produces letters full of claims the candidate cannot defend in an interview. This plan takes the opposite approach:

- The generator is a pure function over `ResumeDocument` plus a job description. No network, no key, no feature flag.
- Every generated sentence records which resume field produced it, and the UI shows that provenance.
- A local check rejects any number in the letter that does not appear in the resume.
- AI polish is opt-in, diffed before acceptance, and never replaces the deterministic output silently.

## Constraints

| Constraint | Consequence |
|---|---|
| Works with `AI_ENABLED=false` | Generation is pure logic in `src/lib/cover-letter/`. |
| No new network calls | Letter content never leaves the browser unless the user explicitly opts into AI polish. |
| Never invent facts | Every sentence traces to a field. Provenance chips make this visible. |
| Shares the print pipeline | Same `react-to-print` + `@media print` path as the resume. |
| Not a landing-page headline | Entry point lives inside the editor. The homepage gets at most a footer link and one FAQ line. |

## Dependencies on the V2 plan

Land this after v2 Phases 0–4. Doing it earlier means duplicating keyword matching and page measurement.

| Needs | From `docs/v2-plan.md` |
|---|---|
| Test harness and schema round-trip fixtures | Phase 0 |
| `keywords.ts` + lexicon, for ranking bullets against the job description | Phase 2 |
| `computePageFit`, for the one-page check | Phase 4 |
| Jump-to-section handler, for provenance chips | Phase 3 |

## Current state worth knowing

| Concern | Where it lives |
|---|---|
| Schema exports and sanitizers | `src/lib/schema/resume.ts`, `src/lib/schema/index.ts` |
| Storage keys | `src/lib/schema/index.ts:65` (`STORAGE_KEYS`) |
| Export envelope | `src/lib/schema/settings.ts` (`ExportEnvelopeSchema`) |
| Store | `src/lib/store/resume-store.ts` |
| Editor shell, panels, print | `src/components/editor/Editor.tsx` |
| Preview measuring | `PreviewScaler` at `src/components/editor/Editor.tsx:125` |
| Print stylesheet | `src/app/globals.css:490` (currently hardcoded to `#resume-preview`) |
| AI actions and prompts | `src/lib/ai/server.ts:3` (`AI_ACTIONS`), `src/app/api/ai/route.ts:14` (`PROMPTS`) |
| AI text sanitizer | `src/lib/ai/sanitize.ts` |

Known constraints in the code today:

- `Panel` is a union type at `src/components/editor/Editor.tsx:55`; adding a panel means extending it and rendering another `Drawer`.
- The print stylesheet hides everything except `#resume-preview`, so a second printable surface needs a generalised selector.
- `PreviewScaler` is private to `Editor.tsx` and cannot be reused as-is.
- `useReactToPrint` is wired once in `Editor` with a single `contentRef`.

---

## Data model

New file `src/lib/schema/cover-letter.ts`:

```ts
export const CoverLetterSchema = z.object({
  version: z.literal(1),
  recipient: z.object({
    name: optionalText,        // "Ms Priya Chen"
    title: optionalText,       // "Engineering Manager"
    company: optionalText,     // "Northwind Labs"
    address: optionalText,     // 1–3 lines, newline separated
  }),
  jobTitle: z.string(),        // "Senior Backend Engineer"
  company: z.string(),
  date: z.string(),            // ISO "2026-10-24", formatted at render
  subject: optionalText,       // "Application for Senior Backend Engineer"
  greeting: z.string(),        // "Dear Ms Chen,"
  paragraphs: z.array(z.string()).default([]),
  signOff: z.string(),         // "Sincerely,"
  signature: z.string(),       // defaults to contact.name
  tone: z.enum(["direct", "warm", "formal"]).default("direct"),
  /**
   * Per-letter typography so the letter can match the resume without mutating
   * the resume's own settings.
   */
  layout: z.object({
    fontFamily: z.string().default("Inter"),
    fontSize: z.number().min(8).max(16).default(10.5),
    lineHeight: z.number().min(1).max(2).default(1.4),
    pageSize: z.enum(["A4", "Letter"]).default("Letter"),
    margins: z.number().min(0).max(48).default(18),
  }),
});
export type CoverLetter = z.infer<typeof CoverLetterSchema>;

export function createEmptyCoverLetter(): CoverLetter;
export function sanitizeCoverLetter(input: unknown): CoverLetter;
```

Sanitizer rules: clamp `paragraphs` to 12 entries, clamp each paragraph to 3000 characters, default `signature` to the empty string so the caller can fall back to `contact.name`, reject non-ISO `date` values by falling back to today.

### Storage

Add one key to `STORAGE_KEYS` in `src/lib/schema/index.ts:65`:

```ts
coverLetter: "rm.coverletter.v1",
```

Keep the letter **out of** `ResumeDocument`. It has no `sectionOrder` or `sectionVisibility`, and putting it in the document would force a migration on every saved resume and on `sanitizeDocument`.

Persist it in the store as a sibling field with its own `setCoverLetter` action. Do **not** add it to the undo/redo history — letters are regenerated, not painstakingly hand-edited, and including them doubles every history entry's size.

### Export / import

Add to `ExportEnvelopeSchema` in `src/lib/schema/settings.ts`:

```ts
coverLetter: CoverLetterSchema.optional(),
```

Do **not** bump `version`. Zod strips unknown keys, so an older build opening a newer file ignores the field instead of rejecting the envelope, and a newer build accepts an older envelope that lacks it. Add a round-trip test for both directions:

- Envelope without `coverLetter` → imports, letter stays absent.
- Envelope with `coverLetter` → imports, letter preserved exactly.

---

## Phase 0 — Schema, storage, persistence

**Files:** `src/lib/schema/cover-letter.ts` (new), `src/lib/schema/index.ts`, `src/lib/schema/settings.ts`, `src/lib/store/resume-store.ts`

1. Add the schema and sanitizer above; export from `src/lib/schema/index.ts`.
2. Add the storage key and include `coverLetter` in the persist `partialize` and `merge` callbacks in `resume-store.ts:126`.
3. `merge` must call `sanitizeCoverLetter(p.coverLetter)` and fall back to `createEmptyCoverLetter()` when absent, matching how `document` is handled at `resume-store.ts:136`.
4. Add `setCoverLetter(letter: CoverLetter)` and `updateCoverLetter(patch: Partial<CoverLetter>)` to the store interface.

**Tests** (`src/lib/schema/cover-letter.test.ts`):

- Missing fields default; paragraph count and length clamps hold.
- An empty string for optional recipient fields is accepted.
- Malformed `date` falls back to a valid ISO date.
- Envelope round-trip, both directions, as described above.
- A store restore from a payload without `coverLetter` yields the empty letter rather than `undefined`.

**Acceptance:** `tsc`, `lint`, `test`, `build` clean. An existing saved resume still hydrates.

---

## Phase 1 — Deterministic generator

**Files:** `src/lib/cover-letter/generate.ts`, `src/lib/cover-letter/sentences.ts` (both new)

```ts
export interface GenerateInput {
  document: ResumeDocument;
  jobDescription: string;
  jobTitle: string;
  company: string;
  tone: "direct" | "warm" | "formal";
  emphasis: "experience" | "projects" | "skills";
}

export interface GeneratedParagraph {
  text: string;
  /** Where every claim came from, for the provenance UI. */
  sources: { section: SectionId; entryId?: string; label: string }[];
}

export interface GeneratedLetter {
  greeting: string;
  subject: string;
  paragraphs: GeneratedParagraph[];
  signOff: string;
}

export function generateCoverLetter(input: GenerateInput): GeneratedLetter;
```

### Paragraph structure

| Paragraph | Content | Source of truth |
|---|---|---|
| Opening | Role, company, and the single strongest achievement | Highest-ranked experience bullet, preferring one containing a number |
| Evidence | Two bullets ranked by job-description keyword overlap | `experience[].bullets`, using the v2 keyword matcher |
| Fit | Skill-group overlap with the job description, or a project when `emphasis === "projects"` | `skills[]` or `projects[]` |
| Closing | Availability and a call to action | `education[].endDate` for students, otherwise the current role |

### Ranking rules

- Score each bullet by canonical keyword overlap with the job description (v2 Phase 2 `extractTerms` + `canonicalize`), plus a bonus when the bullet contains a digit.
- Break ties by bullet order, so output is stable.
- Never pick the same bullet for both the opening and the evidence paragraph.
- If there is no job description, rank by the digit bonus alone and set a flag the UI reads to say "no job description — general letter".

### Sentence banks

`sentences.ts` holds roughly twelve variants per slot per tone. Variants are selected by a deterministic hash of `company + jobTitle` so the same inputs always produce the same letter. This keeps the ATS determinism promise and makes the output testable.

Rules for the text itself:

- No em dashes.
- No "I am writing to apply for" or "I am writing to express my interest" — these are the openings the checks reject.
- The opening must name the company in the first sentence.
- Never emit a metric that is not present in the source bullet.

### Fallback paths

- **No experience entries:** switch to the student layout — opening references the degree or the strongest project, evidence uses projects, fit uses coursework or skills. Never fabricate employment.
- **No projects and no experience:** refuse to generate, return a structured reason the panel renders as guidance ("Add at least one project or role first").
- **No skills:** skip the fit paragraph rather than inventing one.

**Tests** (`src/lib/cover-letter/generate.test.ts`):

- Identical input twice produces deep-equal output.
- Every `sources` entry references a real entry id in the document.
- No paragraph contains a number absent from `resumeToText(document)`.
- Student path when `experience` is empty; the result contains no experience-derived source.
- Refusal path when both experience and projects are empty.
- No stop-word-only job description produces a general letter rather than empty paragraphs.
- Company name appears in the first paragraph for all three tones.

**Acceptance:** generator output passes the local checks from Phase 4 (build the checks first if convenient — they are cheap and act as the generator's real test).

---

## Phase 2 — Panel UI

**Files:** `src/components/cover/CoverLetterPanel.tsx` (new), `src/components/editor/Editor.tsx`

### Wiring

1. Extend the `Panel` union at `Editor.tsx:55` with `"cover"`.
2. Add the Drawer next to the existing ones (`template`, `ats`, `ai`, `import`), same sizing pattern: `size={isMobile ? "100%" : "md"}`.
3. Add an entry point: a `Button` in the desktop header row near "Template", and a `MenuItem` in the mobile menu. Label "Cover letter". No icon dependency beyond what `@tabler/icons-react` already provides (`IconMail`).

### Panel layout, top to bottom

1. **Target**
   - Job title and company `TextInput`s.
   - Collapsible "Recipient details" with name, title, and address lines.
   - A "Fill from job description" button that extracts the two values with simple regexes (`at <Company>`, `hiring (a|an) <Role>`). The ATS panel already stores the job description in the same store, so no extra input is needed.
2. **Tone** — `SegmentedControl`: Direct / Warm / Formal.
3. **Emphasis** — `SegmentedControl`: Experience / Projects / Skills.
4. **Generate** button. Disabled with an inline explanation when the resume is empty. Regenerating overwrites the current draft, so confirm first if the user has hand-edited any paragraph (track a `dirty` flag set on manual edit).
5. **Editable result**
   - Greeting as a `TextInput`.
   - Subject as a `TextInput`.
   - Each paragraph as an autosizing `Textarea`, with a remove button and an "add paragraph" action.
   - Under each paragraph, a provenance chip: "From Northwind Labs, bullet 2". Clicking it calls the v2 Phase 3 jump handler to open that accordion section and scroll to it.
   - Sign-off and signature inputs.
6. **Checks** — results from Phase 4, rendered as a compact list with pass/fail icons, matching the ATS panel's visual language.
7. **Export** — "Print / PDF" and "Copy text". Copy puts a plain-text rendering on the clipboard for portals that want a textarea paste.

### Regeneration behaviour

Changing tone or emphasis does not regenerate automatically — it marks the draft stale with a "Regenerate" prompt. Auto-regenerating on every toggle would silently discard hand edits.

**Acceptance**

- Generate produces four paragraphs for a resume with experience, projects, and skills.
- Hand-editing a paragraph then pressing Generate triggers the overwrite confirmation.
- Provenance chips open the correct section (verified at desktop width and at 375px).
- The panel fits without horizontal scroll at 375px.

---

## Phase 3 — Print, preview, and copy

**Files:** `src/app/globals.css`, new `src/components/preview/ScaledPage.tsx`, `src/components/cover/CoverLetterPage.tsx`, `src/components/editor/Editor.tsx`

### 1. Generalise the print stylesheet

Replace the hardcoded `#resume-preview` selectors at `globals.css:490` with an attribute-driven root:

```css
@media print {
  body * {
    visibility: hidden;
  }
  [data-print-root],
  [data-print-root] * {
    visibility: visible;
  }
  [data-print-root] {
    position: absolute;
    inset: 0;
    margin: 0;
    width: 100%;
    min-height: auto;
    box-shadow: none;
  }
  .preview-scaler {
    transform: none !important;
  }
  [data-print-root] h2 {
    break-after: avoid;
  }
  [data-print-root] .resume-entry {
    break-inside: avoid;
  }
}
```

Set `data-print-root` on whichever surface is being printed and point `useReactToPrint`'s `contentRef` at that node. Keep `id="resume-preview"` because the landing page and tests depend on it.

Only one root may carry the attribute at a time. When the cover panel is open, the resume root must drop it or both surfaces print on top of each other.

### 2. Extract `ScaledPage`

Move `PreviewScaler` (`Editor.tsx:125`) into `src/components/preview/ScaledPage.tsx` with props `{ pageWidthPx, pageHeightPx, children }`, and return the measured height through a callback or a shared hook so the letter's page-fit check and the v2 Phase 4 indicator can consume it. This is the one real refactor the feature forces, and v2 Phase 4 needs it too.

### 3. `CoverLetterPage`

A printed page component, structurally parallel to `TemplateRenderer`'s outer shell:

- Fixed page size from `PAGE_SIZES[letter.layout.pageSize]`.
- Margins, font family, size, and line height from `letter.layout`.
- Sender block derived from `contact` (name plus the same contact line builder used by the resume).
- Date, recipient block, subject, greeting, paragraphs, sign-off, signature.
- Real text nodes, no images, no tables — the same ATS-safe discipline as the resume.

Rendered in a preview area of the panel, scaled by `ScaledPage`, and used as the print root.

### 4. Copy text

`src/lib/cover-letter/to-text.ts` builds the plain-text version with correct blank lines. Clipboard write through `navigator.clipboard.writeText` with a fallback message when the API is unavailable (non-HTTPS contexts).

**Acceptance**

- Printing the resume still produces exactly the previous output — diff a printed PDF before and after this change.
- Printing the letter produces one page with selectable text.
- The letter never inherits dark-mode styling (once v2 Phase 5 lands, add the same `color-scheme: light` guard the resume page uses).
- Copy text round-trips: pasting into a textarea preserves paragraph breaks.

---

## Phase 4 — Local checks

**Files:** `src/lib/cover-letter/checks.ts` (new), `src/lib/cover-letter/checks.test.ts`

Deterministic, no AI, same spirit as the ATS panel. Each check returns `{ id, label, passed, why, fix? }`.

| Check | Rule |
|---|---|
| Company named | `company` appears in the body, case-insensitive |
| Role named | `jobTitle` appears, or a close variant after light stemming |
| Length | 220–420 words across all paragraphs |
| Not generic | Reject `To whom it may concern` and `Dear Sir/Madam` |
| No filler opening | Reject `I am writing to apply` and `I am writing to express my interest` |
| One page | `computePageFit(...).pages === 1` using the letter's own layout |
| No unsupported claims | Every number in the letter appears somewhere in `resumeToText(document)` |
| No placeholder text | Reject `[Company]`, `{{`, `Lorem` |

The unsupported-claims check is the important one. It catches the specific failure mode of AI-drafted letters — a fabricated metric the candidate has to defend in an interview.

Test fixtures: one passing letter and one failing letter per rule.

**Acceptance:** the generated letter from Phase 1 passes every check for a complete resume.

---

## Phase 5 — Optional AI polish

Skip entirely if AI stays disabled in production. This phase must not change anything about the deterministic path.

**Files:** `src/lib/ai/server.ts`, `src/app/api/ai/route.ts`, `src/lib/ai/client.ts`, `src/components/cover/CoverLetterPanel.tsx`

1. Add `"polish-letter"` to `AI_ACTIONS` (`server.ts:3`) and a request schema variant carrying `{ letterText, tone, jobDescription }`, each field length-capped.
2. Add a prompt builder in `PROMPTS` (`route.ts:14`) following the existing pattern exactly: rewrite only, never add facts, `frameUntrusted` around every user field, `UNTRUSTED_INSTRUCTION` appended to the system prompt.
3. Client helper `requestLetterPolish(...)` in `client.ts`, returning `{ result: string }`.
4. Panel: a "Polish with AI" button gated by `useAiEnabled()`, with the same consent checkbox pattern as `AtsPanel`.
5. **Diff, do not replace.** Render the polished text beside the current text with word-level changes highlighted, and require an explicit "Use this version" click. Re-run `sanitizeAiText` and the Phase 4 checks on the polished text before allowing acceptance; if a check regresses, show which one and keep the original as default.

**Acceptance**

- AI disabled: the button is absent or disabled with an explanation; the panel is fully usable without it.
- Polishing then rejecting leaves the draft byte-identical.
- A polished text that introduces an unsupported number is rejected by the checks and cannot be accepted without an explicit override.

---

## Sequencing and effort

| Phase | Work | Effort | Depends on |
|---|---|---|---|
| 0 | Schema, storage, persistence, round-trip tests | 0.5 day | v2 Phase 0 |
| 1 | Deterministic generator and sentence banks | 2 days | v2 Phase 2, 0 |
| 2 | Panel UI, provenance chips | 1.5 days | 1, v2 Phase 3 |
| 3 | Print generalisation, `ScaledPage`, copy text | 0.5 day | 2, v2 Phase 4 (for reuse) |
| 4 | Local checks | 0.5 day | 3 (page-fit) |
| 5 | Optional AI polish with diff-before-accept | 1 day | 4, existing AI infra |

Roughly six days, with Phase 5 skippable.

## Definition of done

- `npm test` green, covering schema round-trip, generator determinism, refusal paths, every check rule, and the no-unsupported-numbers invariant.
- `npx tsc --noEmit`, `npm run lint`, `npx next build` clean.
- Printing the resume is byte-identical to before this feature.
- Printing the letter yields one page with selectable text, in both page sizes.
- A draft survives a reload and a JSON export → import round trip.
- The generated letter passes all local checks for a complete resume, and no letter path requires AI.

## Explicitly out of scope

- **Multiple letters per resume.** Wait for multi-resume support; otherwise the data model is throwaway.
- **Direct PDF generation.** Print-to-PDF is the existing contract; a PDF library duplicates it.
- **Sending email or posting to job boards.** Needs accounts, credentials, and a backend — the opposite of this product.
- **Auto-applying to jobs.** Same reason, plus it is a liability surface.
- **A cover letter template gallery.** Two or three tone presets, one layout matching the resume. A gallery implies design choice is the value, which it isn't.
- **Landing-page hero placement.** At most a footer link and a line in the FAQ. The differentiators are the resume and the honest scoring; the letter is a convenience.
