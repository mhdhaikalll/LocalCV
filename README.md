# LocalCV

A **free, local-first, ATS-friendly resume builder** that runs in the browser. No account, no uploads, no paywall.

- Structured editing with a live preview and autosave to `localStorage`
- 12 ATS-safe templates, including two optional photo layouts
- Deterministic local ATS scoring (40+ checks) with job-description keyword analysis
- Optional server-side AI assistance (rewrite, summarize, suggest, deep review), gated by `AI_ENABLED`
- PDF export through the browser print pipeline (selectable, ATS-readable text)
- PDF / DOCX / JSON import, parsed entirely client-side
- Document-level undo/redo and versioned JSON backup/restore
- Re-import tolerant: blank optional fields, missing IDs, and legacy shapes are repaired instead of discarded

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Mantine · Zustand · zod · next-intl · react-to-print · pdfjs-dist · mammoth · Cloudflare Web Analytics

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). The editor lives at `/resume`.

## Environment Variables

Copy `.env.example` to `.env.local` (never commit real keys):

| Var | Required | Purpose |
|---|---|---|
| `NEXT_PUBLIC_SITE_URL` | Recommended | Public origin used for canonical URLs, sitemap, robots, and structured data. Set to your production domain (no trailing slash). |
| `NEXT_PUBLIC_CF_ANALYTICS_TOKEN` | No | Cloudflare Web Analytics beacon token. Loaded after hydration in production and skipped on `/resume`. |
| `AI_ENABLED` | No | Set to `true` to enable AI routes and AI controls. Unset/false keeps them disabled with a "coming soon" state. |
| `OPENAI_API_KEY` | For AI only | OpenAI-compatible API key (server-only) |
| `OPENAI_BASE_URL` | No | Base URL override for compatible providers. Must be `https:` (or `http:` on localhost), without credentials, and not a private/loopback IP. |
| `OPENAI_MODEL` | No | Model identifier (default `gpt-4o-mini`) |
| `KV_REST_API_URL` | No | Vercel KV REST URL for a global AI rate limit |
| `KV_REST_API_TOKEN` | No | Vercel KV REST token (paired with the URL) |

AI routes fail closed: `403 ai_disabled` when not enabled, `503 ai_not_configured` when the key is missing, `429 rate_limited` with `Retry-After` under load. The client reads `/api/ai/status` at runtime, so flipping `AI_ENABLED` re-enables the buttons without a code change.

## Security & Privacy

- Resume data stays in the browser except when the user explicitly runs an AI action (with disclosed consent).
- Import, scoring, and export all run client-side — no uploads.
- The API key lives only in serverless functions and is never bundled to the client.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`) are set in `next.config.ts`; the CSP allows only the Cloudflare analytics beacon plus `self`.
- `.env*` is git-ignored; only `.env.example` is committed.

## Deploy on Vercel

```bash
npm run build
```

Import the repo at [vercel.com/new](https://vercel.com/new), then configure the environment variables above (Project → Settings → Environment Variables). AI stays disabled until `AI_ENABLED=true` and a key are set. Set `NEXT_PUBLIC_SITE_URL` to your deployed domain so canonical URLs, the sitemap, and structured data use the right origin.

## SEO & AEO

- Rich metadata (Open Graph, Twitter cards, canonical URLs, keywords) in `src/app/layout.tsx`
- JSON-LD structured data: `Organization`, `WebSite`, `WebApplication`, `FAQPage`, and `BreadcrumbList` (`src/lib/seo/`)
- Generated `sitemap.xml`, `robots.txt` (explicitly allows major AI crawlers), and `manifest.webmanifest`
- Dynamic Open Graph and Twitter images plus an Apple touch icon
- `/llms.txt` describing the product for AI answer engines
- Landing page includes an answer-first overview and a visible FAQ matching the structured data

## Project Structure

```
src/app/                  App Router pages, API routes, metadata files
src/components/editor/    Editor shell, split form/preview layout
src/components/forms/     Section forms (contact, experience, education, ...)
src/components/templates/ Shared template renderer and template panel
src/components/ats/       Local ATS scoring panel and AI deep review
src/components/ai/        Optional AI assistant panel
src/components/import/    PDF/DOCX/JSON import panel
src/lib/schema/           zod schemas, defaults, and import sanitizer
src/lib/templates/        Style context and template registry
src/lib/ats/              Deterministic scoring and resume-to-text
src/lib/ai/               AI client, server helpers, and enablement hook
src/lib/seo/              Site config, structured data, JSON-LD helper
```

## JSON Backups

**Export JSON** downloads a versioned envelope:

```json
{
  "format": "resume-maker",
  "version": 1,
  "document": { "...": "resume content" },
  "settings": { "...": "template and typography settings" },
  "exportedAt": "2026-10-19T00:00:00.000Z"
}
```

The `format` value is kept for backward compatibility. Imports accept the envelope, repair blank or legacy fields, and fall back to the embedded document if settings are invalid.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server (copies the pdf.js worker first) |
| `npm run build` | Production build |
| `npm run lint` | ESLint |
| `npx tsc --noEmit` | Typecheck |

## Contributing

Contributors are welcome! Feel free to open issues, submit pull requests, or suggest improvements. Please follow existing code conventions and run `npm run lint` and `npx tsc --noEmit` before submitting changes.
