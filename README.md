# Resume Maker

An **ATS-friendly resume builder** — local-first, no account required. Built from the specification in [`.md/`](./.md/README.md).

- Structured form editing with live preview and autosave to `localStorage`
- 10 ATS-safe templates with font/color/spacing customization
- Deterministic local ATS scoring with job-description keyword analysis
- Optional server-side AI assistance (rewrite, summarize, suggest, deep review)
- PDF export via the browser print engine (selectable text, best for ATS)
- PDF/DOCX/JSON import, parsed entirely client-side
- Document-level undo/redo, versioned JSON backup

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Zustand · react-hook-form + zod · next-intl · react-to-print · pdfjs-dist · mammoth · Cloudflare Web Analytics

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Environment Variables

Copy `.env.example` to `.env.local` (never commit real keys):

| Var | Required | Purpose |
|---|---|---|
| `AI_ENABLED` | No | Set to `true` to enable AI routes. Fail closed when unset. |
| `OPENAI_API_KEY` | For AI only | OpenAI-compatible API key (server-only) |
| `OPENAI_BASE_URL` | No | Base URL override for compatible providers. Must be `https:` (or `http:` on localhost), without credentials, and not a private/loopback IP. |
| `OPENAI_MODEL` | No | Model identifier (default `gpt-4o-mini`) |
| `KV_REST_API_URL` | No | Vercel KV REST URL for a global AI rate limit |
| `KV_REST_API_TOKEN` | No | Vercel KV REST token (paired with the URL) |

AI routes fail closed: `403 ai_disabled` when not enabled, `503 ai_not_configured` when the key is missing, `429 rate_limited` with `Retry-After` under load.

## Security & Privacy

- The API key lives only in serverless functions; it is never bundled to the client.
- Resume data never leaves the browser except when the user explicitly runs an AI action (with disclosed consent).
- Import/export/parsing all run client-side — no uploads.
- Security headers (`X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, `Content-Security-Policy`) are set in `next.config.ts`.
- `.env*` is git-ignored; only `.env.example` is committed.

## Deploy on Vercel

```bash
npm run build
```

Import the repo at [vercel.com/new](https://vercel.com/new), then configure the environment variables above (Project → Settings → Environment Variables). AI stays disabled until `AI_ENABLED=true` and a key are set.

## Commands

| Command | Purpose |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Production build |
| `npm run lint` | ESLint |

## Contributing

Contributors are welcome! Feel free to open issues, submit pull requests, or suggest improvements. Please follow existing code conventions and run `npm run lint` before submitting changes.
