# V2 Implementation Plan

Seven features for ResumeLah, ordered so that each one lands on a tested base. Read this whole document before writing code, then work phase by phase.

## Ground rules

These apply to every phase:

- Resume content must never leave the browser. No new network calls anywhere in this plan.
- New document fields must survive `sanitizeDocument` and a JSON export → import round trip, and must not break resumes already saved in `localStorage`.
- Never hardcode a list of sections in a new place. Section metadata lives in `src/lib/schema/resume.ts` (`SectionIdSchema`, `DEFAULT_SECTION_ORDER`, `SECTION_LABELS`, `getSectionLabel`) and `src/lib/templates/style-context.ts` (`isSectionEmpty`, `isSectionVisible`). The renderer's two-column arrays in `TemplateRenderer.tsx` are the one known exception; don't add a second.
- Dark mode must never affect the printed or exported resume. That surface stays white with dark text.
- `computeAtsScore` must stay deterministic: identical input always produces identical output, including list ordering.
- After each phase: `npx tsc --noEmit`, `npm run lint`, `npm test`, `npx next build`. Fix everything before moving on. Do not commit unless asked.
- Read the relevant guide in `node_modules/next/dist/docs/` before touching App Router files (AGENTS.md requirement).

## Current state worth knowing

| Concern | Where it lives |
|---|---|
| Resume document schema + sanitizer | `src/lib/schema/resume.ts`, `src/lib/schema/index.ts` |
| Zustand store, history, persistence | `src/lib/store/resume-store.ts` |
| Section empties / visibility | `src/lib/templates/style-context.ts` |
| Rendering | `src/components/templates/TemplateRenderer.tsx` |
| Section order UI | `src/components/templates/TemplatePanel.tsx:160` |
| ATS scoring | `src/lib/ats/scoring.ts`, UI in `src/components/ats/AtsPanel.tsx` |
| Editor shell + accordion | `src/components/editor/Editor.tsx` |
| Preview measurement | `PreviewScaler` at `src/components/editor/Editor.tsx:125` |
| Colour tokens | `src/app/globals.css` (`@theme`, `:root`, landing + editor classes, print block at line ~490) |
| Landing sample resume | `src/components/landing/sample.ts` |

Known constraints in the code today:

- `PreviewScaler` already measures `contentHeight` but does not expose it.
- The editor accordion is uncontrolled (`defaultValue="contact"`).
- `#resume-preview` has a `min-height: 11in` floor, so an almost-empty resume still measures one full page.
- There are no tests and no test runner.
- `ColorSchemeScript` was deliberately removed from `src/app/layout.tsx`; the app is light-only with hardcoded colours throughout `globals.css`.

---

## Phase 0 — Test harness (feature 11)

Do this first. Phases 2, 3, 4 and 6 all change logic that currently has zero coverage, and the section-order code has already twice come close to shipping a section that silently disappears from a two-column layout.

### Setup

- Add devDependencies: `vitest`, `@vitest/coverage-v8`, `jsdom`, `@testing-library/react`.
- Create `vitest.config.ts`: `environment: "jsdom"`, alias `@/` → `src/`, `include: ["src/**/*.test.ts"]`.
- Add scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.
- Place tests beside source as `*.test.ts`. They are outside `app/`, so the Next build ignores them — verify that.

### Coverage targets

**`sanitizeDocument`** — `src/lib/schema/index.test.ts`

- Missing and unknown fields fall back to defaults.
- Empty strings for optional URL and email fields do not throw.
- `sectionOrder` missing a section id gets it appended in default position.
- `sectionVisibility` unknown key defaults to `true`.
- `additional.heading` is clamped to 40 characters and defaults when blank.
- Extracurricular legacy `startDate`/`endDate` folds into a single `date`.
- A full export envelope round-trips without loss.

**Section helpers** — `src/lib/templates/style-context.test.ts`

- One `isSectionEmpty` case per section id, including `additional` and `extracurriculars`.
- Toggled-off section is hidden even when non-empty.
- Empty-but-toggled-on section is hidden.

**ATS** — `src/lib/ats/scoring.test.ts`

- Determinism: same input twice produces a deep-equal result.
- Total is within 0–100.
- Without a job description, maximum still totals 100.
- `missingKeywords` respects the 15-item cap.
- Every `recommendedSection` is a valid `SectionId`.
- `resumeToText` includes text from every section, including `additional` and `extracurriculars`.

**Import parsing** — `src/lib/import/parse-resume.test.ts`

- Export `splitSections`, `parseBullets`, and the date/GPA regexes (currently module-private) so they can be tested directly.
- Header detection works for every alias in `SECTION_HEADERS`.
- Bullet markers are stripped for `-`, `•`, `●`, `▪`, `◦`, `·`.
- CGPA formats parse: `CGPA 3.8/4.0`, `GPA: 3.8`, `Grade 3.8`.

### Acceptance

`npm test` passes. Deliberately break one `isSectionEmpty` case and confirm the suite fails.

---

## Phase 1 — Drag-and-drop section order (feature 3)

Scope: `src/components/templates/TemplatePanel.tsx` plus one new hook. `reorderSections(order: SectionId[])` already exists in the store and pushes exactly one history entry, so no store changes are needed.

### Why no library

Ten rows inside a drawer. `@dnd-kit` would add roughly 30–35 KB gzip and two context providers for a list this size. Native HTML5 drag has no touch support on iOS Safari. Pointer events cost ~80 lines and nothing at runtime.

### Hook: `src/components/templates/use-pointer-sort.ts`

State:
- `activeId: string | null`
- `insertionIndex: number | null`

Refs:
- `startY`, `rowHeight`, `pointerId`, `grabOffset`, `rafId`
- a `Map` from row id to its DOM element, so the active row's transform can be written directly

Handlers:
- `onPointerDown(rowId, index)`: record `startY` and measure the row height. Do **not** capture the pointer and do **not** activate yet.
- `onPointerMove`: activate only after 6px of vertical movement, so a tap still scrolls the drawer. On activation call `setPointerCapture`, set `touch-action: none` on `document.body` for the drag duration, then compute `dy` and `insertionIndex` inside `requestAnimationFrame`.
- Write the dragged row's `transform` directly through its ref. Do not put `dy` in React state — the drawer must not re-render per frame.
- `onPointerUp` / `onPointerCancel` / `lostpointercapture`: build the next order by splicing the active id into `insertionIndex`, call `onCommit(next)` **once**, release capture, clear `touch-action`, reset state.

### Panel changes

- Each row: drag handle on the left (`IconGripVertical`, `cursor: grab`, `aria-label={`Reorder ${label}`}`), label in the middle, existing up/down `ActionIcon`s on the right.
- Keep the up/down buttons. They are the keyboard path, the screen-reader path, and the fallback if pointer capture misbehaves.
- Insertion indicator: a 2px accent line between rows at `insertionIndex`.
- `will-change: transform` only on the active row, never statically on all rows.
- `user-select: none` only while dragging.
- Wrap the list in a container with `role="list"` and `aria-roledescription="sortable list"`.
- Add a visually hidden `aria-live="polite"` region announcing `"{label} moved to position {n} of {total}"` after commit.

### Tests

`use-pointer-sort` logic can be tested without a DOM by extracting `moveItem(items, fromIndex, toIndex)` into a pure helper and covering it.

### Acceptance

- A drag produces exactly one undo entry; one undo restores the previous order.
- On mobile, touching a row and moving vertically before the 6px threshold scrolls the drawer normally.
- `reorderSections` is never called during a drag.
- Ten rows drag smoothly in the DevTools performance panel.

### Gotchas

- `pointerup` can be missed if the drawer closes mid-drag. Handle `pointercancel` and `lostpointercapture`.
- Ignore container scroll during an active drag rather than tracking it. If the container scrolls, cancel the drag.

---

## Phase 2 — Better keyword matching (feature 5)

Scope: `src/lib/ats/scoring.ts` plus two new modules. This is the largest accuracy change in the product and it is pure logic, so keep it testable and deterministic.

### 1. `src/lib/ats/keywords.ts`

- `normalizeTerm(raw)`: lowercase, strip punctuation except `+`, `#`, `.`, collapse whitespace.
- `stem(word)`: light suffix stripping, no dependency.
  - `-ies` → `y` when the result is longer than 4 characters.
  - Strip `-ing`, `-ed`, `-es`, `-s` when the remaining stem is at least 3 characters.
  - Keep an exception list that must not be stemmed: `aws`, `css`, `ops`, `gps`, `devops`, `kubernetes`, `analytics`, `physics`, `news`, `series`, `business`, `process`, `access`, `class`, `analysis`.
  - Export it so tests can pin exact behaviour.
- `tokenize(text)` moves here from `scoring.ts` and keeps the existing stop-word list.
- `extractTerms(text)`: tokens plus 2- and 3-token phrases, where a phrase is kept only if no token in it is a stop word.

### 2. `src/lib/ats/lexicon.ts`

```ts
// canonical → surface variants
export const SKILL_VARIANTS: Record<string, string[]> = {
  react: ["react", "react.js", "reactjs", "react js"],
  node: ["node", "node.js", "nodejs"],
  postgres: ["postgres", "postgresql", "psql"],
  typescript: ["typescript", "ts"],
  javascript: ["javascript", "js"],
  kubernetes: ["kubernetes", "k8s"],
  // ~60–100 entries: languages, frameworks, cloud, data, design, PM tools
};
```

- Build a reverse lookup (variant → canonical) at module load.
- Only expand variants of 3 or more characters. `ts` and `js` are too ambiguous to expand aggressively when the job description is short.
- Export `canonicalize(term)` and a `hasVariant(term)` helper.

### 3. Scoring changes in `scoring.ts`

Keep the 35-point keyword cap and the existing `AtsResult` shape so the UI and tests stay stable. Internally:

- Build `keywords` as `{ surface: string; canonical: string; weight: number }[]`. Weight comes from job-description frequency, with a bump for lexicon hits and for exact phrase matches.
- Canonicalise both the keyword and the resume text, then match on canonical form.
- Sort `missingKeywords` by weight descending, then alphabetically as a deterministic tie-break. This ordering rule is what makes the determinism test meaningful.
- Report the **surface** form in `missingKeywords` so the UI shows `postgresql`, not `postgres`.
- Guard the empty case: a job description made only of stop words yields `missingKeywords: []`, not junk.

### Tests

- `managed` in the resume matches `manage` in the job description.
- `machine learning` is extracted as one keyword, not two.
- `React.js` in the job description matches `React` in the resume.
- `K8s` and `Kubernetes` collapse to the same canonical term.
- Determinism still holds after ordering changes.
- A stop-word-only job description produces no missing keywords.

### Acceptance

Score changes for existing resumes are expected and correct. Update the ATS panel copy to mention that scoring uses stemming and phrase matching, so a jump in score is not mysterious.

---

## Phase 3 — Per-check explanations and jump-to-fix (feature 6)

Scope: `src/lib/ats/scoring.ts`, `src/components/ats/AtsPanel.tsx`, `src/components/editor/Editor.tsx`.

### 1. Extend the check type

```ts
export interface AtsCheck {
  label: string;
  passed: boolean;
  points: number;
  /** One sentence: why this check exists. */
  why: string;
  /** Section the user should edit, when the failure is actionable. */
  fixSection?: SectionId;
}
```

- Populate `why` for every check. They are static strings; write them inline next to each check, around 40 short sentences total.
- Only set `fixSection` on failures the user can actually fix by editing a section. Do not invent anchors for informational checks.

### 2. Panel rendering

- Each check row gets a compact disclosure that reveals `why` when tapped. Prefer this over a tooltip, because the panel is dense on mobile and tooltips do not work on touch.
- Failing checks with `fixSection` render a `Button` (`size="compact-xs"`, `variant="subtle"`) labelled "Fix".
- Keep the existing pass/fail `ThemeIcon` and `scoreColor` logic untouched.

### 3. Jump mechanism

`AtsPanel` receives `onJumpToSection?: (id: SectionId) => void`.

Make the editor accordion controlled:

```ts
const [openSection, setOpenSection] = useState<string | null>("contact");
```

The handler in `Editor`:

1. `setOpenSection(id)`
2. `setPanel("none")` to close the drawer
3. `scrollIntoView` the accordion item with `behavior: "smooth"`, `block: "center"`
4. move focus to that section's accordion control, for keyboard users
5. on mobile, also `setMobileTab("form")` so the user lands on the form pane

### Acceptance

- Every check has a non-empty `why`; add a test that asserts this for all checks produced by `computeAtsScore`.
- Clicking Fix closes the drawer, opens the correct section, and scrolls to it, verified at desktop width and at 375px.
- After clicking Fix, one Tab lands on the first input of that section, not back in the header.

---

## Phase 4 — Length and density feedback (feature 7)

Scope: new `src/lib/layout/page-fit.ts`, plus small changes to `Editor.tsx`.

### 1. Pure helper

```ts
export interface PageFit {
  pages: number;          // 1, 2, 3...
  fillPercent: number;    // 0-100 for the last page
  overflowLines: number;  // estimated lines past a full page
  status: "short" | "good" | "tight" | "overflow";
}

export function computePageFit(
  contentHeightPx: number,
  pageHeightPx: number,   // 1056 Letter, 1123 A4
  fontSizePt: number,
  lineHeight: number,
): PageFit;
```

Rules:
- `pages = ceil(contentHeightPx / pageHeightPx)`.
- `fillPercent` derived from the remainder of the last page.
- `overflowLines` = surplus pixels divided by estimated line height in px (`fontSizePt * lineHeight * 96 / 72`), floored at 0.
- Status thresholds: under 45% `short`, 45–90% `good`, 90–100% `tight`, over 100% `overflow`.

### 2. Wiring

- `PreviewScaler` already computes `contentHeight`. Expose it through a small context or a shared `useElementHeight` hook so a new `PageFitBadge` and the scaler don't measure the same node twice.
- Measure the inner content wrapper, not `#resume-preview`. The `min-height: 11in` floor on `#resume-preview` would otherwise report every near-empty resume as 100% full.
- Render a compact badge in the editor header next to the ATS score badge, `visibleFrom="lg"` only. The mobile header is already crowded.
- Copy:
  - short: `1 page · 48% full`
  - good: `1 page · 72% full`
  - tight: `1 page · 96% full — tight`
  - overflow: `2 pages · trim ~6 lines`
- Tooltip explains that page size affects the calculation and points at the page-size control.

### 3. Tests

`page-fit.test.ts` with no DOM: one page short, one page good, one page tight, exactly-one-page boundary, two pages with overflow, and A4 vs Letter for identical input.

### Acceptance

- Changing template, font size, margins, or page size updates the badge without remounting the editor.
- Toggling a section off changes the numbers.
- Rounding happens once so the values don't flicker across re-renders.

---

## Phase 5 — Dark mode for the editor (feature 8)

Do this last. It touches the most files and benefits from the other UI work being stable.

### 1. Token strategy

Convert hardcoded colours in `src/app/globals.css` to CSS custom properties with light and dark values:

```css
:root {
  --color-surface: #ffffff;
  --color-surface-muted: #f8fafb;
  --color-border: #e5eaec;
  --color-text: #2c3a3e;
  --color-text-muted: #6f7f87;
}

[data-mantine-color-scheme="dark"] {
  --color-surface: #1a1f21;
  --color-surface-muted: #141819;
  --color-border: #2b3336;
  --color-text: #e4e9ea;
  --color-text-muted: #9aa8ad;
}
```

Then replace literals with `var(--color-*)`. Work down a checklist produced by grepping `#[0-9a-f]{3,6}` in `globals.css` and in component `style` props. Also check whether the Tailwind `@theme` block at the top of `globals.css` is actually used; if not, drop it rather than duplicating it for dark mode.

### 2. The resume page stays white

Add an explicit guard so the document never inherits dark styling:

```css
[data-mantine-color-scheme="dark"] #resume-preview,
[data-mantine-color-scheme="dark"] .resume-frame {
  color-scheme: light;
  background: #ffffff;
  color: #2c3a3e;
}
```

The chrome *around* the page (the grey backdrop of the preview pane) must go dark; a white page on a light backdrop in dark mode looks like a rendering bug.

### 3. Toggle

- `ActionIcon` in the editor header with `IconSun` / `IconMoon`.
- Persist through Mantine's colour-scheme manager.
- Default to `light`, not `auto`. A resume builder flipping to dark on first paint is worse than respecting an explicit choice.
- Restore `ColorSchemeScript` in `src/app/layout.tsx`. It was removed when the app was hardcoded light; now it has a real job.

### 4. Landing page

Theme it with the same tokens. A dark editor next to a hardcoded-light landing page reads as unfinished.

### Acceptance

- No flash of the wrong theme on reload, verified with network throttling.
- Export a PDF in dark mode and compare its text layer to a light-mode export; they must be identical.
- All body text meets 4.5:1 contrast against `--color-surface` in both schemes, checked in the DevTools accessibility pane.
- ATS score colours (red/yellow/green) stay legible on dark.

### Risk

This is the phase most likely to sprawl. Timebox it, keep the grep checklist, and treat any component with a literal hex as a task.

---

## Phase 6 — Persona sample resumes (feature 10)

Scope: new `src/lib/samples/`, a picker on the landing page, and a picker in the editor empty state.

### 1. Data

Move `src/components/landing/sample.ts` into `src/lib/samples/` and turn it into a registry:

```ts
export interface SampleResume {
  id: string;
  label: string;       // "Final-year student"
  blurb: string;       // one line for the card
  templateId: TemplateId;
  build: () => ResumeDocument;
}

export const SAMPLE_RESUMES: SampleResume[];
```

Personas:

| Persona | Shape |
|---|---|
| Final-year student | 1 internship, 3 projects, 4 certs, 1 extracurricular. Effectively the existing sample. |
| Career switcher | Prior career + bootcamp + 2 portfolio projects. The summary does the persuasive work. |
| Senior engineer | 3 roles showing progression, no certs, no photo, tight bullets with scale numbers. |
| Product designer | 2 roles, case-study projects, portfolio link, `photo-header` template. |

Every sample must be a complete, realistic resume. No lorem ipsum, no `Company Name`.

### 2. Landing page

Above the templates grid, add a row of four persona cards. Selecting one swaps the preview document and template. This demonstrates range far better than four template variants of the same student resume.

### 3. Editor empty state

When `isEmpty` is true, show a "Start from an example" panel above the contact accordion with the same four options. Loading one calls `replaceDocument(sample, { markImport: false })` so it lands in undo history and is not flagged as an import.

### 4. Tests

- Each sample passes `sanitizeDocument` unchanged.
- Each sample scores at least 75 on `computeAtsScore` with no job description. A sample that scores 60 undermines the pitch.
- `computePageFit` reports exactly one page for each sample in its default template.

### Acceptance

- Loading a sample then pressing undo once returns to the empty document.
- Landing previews update when a persona is selected.

---

## Sequencing and effort

| Order | Phase | Effort | Depends on |
|---|---|---|---|
| 0 | Tests (11) | 1 day | — |
| 1 | Drag-and-drop (3) | 0.5 day | 0 |
| 2 | Keyword matching (5) | 1.5 days | 0 |
| 3 | ATS explanations + jump (6) | 1 day | 2 (final check shape) |
| 4 | Page-fit feedback (7) | 0.5 day | 0 |
| 5 | Dark mode (8) | 2 days | 3, 4 (last UI sweep) |
| 6 | Persona samples (10) | 1 day | 0 (content plus one picker) |

Phase 6 can run in parallel with anything from Phase 1 onward. Phase 5 must be last.

## Definition of done for the whole batch

- `npm test` green, with coverage on `sanitizeDocument`, `computeAtsScore`, `computePageFit`, and the import parse helpers.
- `npx tsc --noEmit`, `npm run lint`, `npx next build` all clean.
- A resume saved before this work still loads and scores after it. Capture the current `localStorage` payload and add it as a test fixture now, before changing anything.
- A PDF exported in dark mode has an identical text layer to one exported in light mode.
- One undo step per drag drop.
- No new runtime dependencies. Test tooling only.

## Explicitly out of scope

Do not fold these in; each is large enough to distort the batch, and the Phase 0 tests are what make them safe to attempt next:

- DOCX export.
- Multiple saved resumes / application tracker.
- Refactoring section metadata into a single registry (the fix for the hardcoded arrays in `TemplateRenderer.tsx`).
- Cloud sync, accounts, or any server-side resume storage — this contradicts the product's entire privacy positioning.
- Cover letter generation.
- Additional templates beyond the existing twelve.
