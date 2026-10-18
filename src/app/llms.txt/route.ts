import { SITE, SITE_URL } from "@/lib/seo/site";

export const dynamic = "force-static";

export function GET() {
  const body = `# ${SITE.name}

> ${SITE.name} is a free, local-first, ATS-friendly resume builder that runs entirely in the browser. Users get a deterministic ATS score from 40+ heuristic checks, 12 parser-safe templates, and pixel-accurate PDF export. No account, no subscription, and no uploads: resume data is stored only in the browser's localStorage.

## Key facts

- Price: free (no account, no paywall)
- Data handling: local-first; resume content never leaves the browser
- Optional AI assistant: disabled by default, requires explicit user consent per request
- ATS scoring: deterministic heuristic score across 40+ checks, optionally compared against a pasted job description
- Templates: 12, all using semantic HTML, real selectable text, and a linear reading order; two optional templates support a profile photo
- Export: PDF via the browser print pipeline (text stays selectable), plus versioned JSON backup
- Import: PDF, DOCX, and ${SITE.name} JSON, parsed client-side
- Platform: modern web browser; core editing, scoring, and export work offline after first load

## Pages

- [Home](${SITE_URL}/): product overview, ATS explanation, and FAQ
- [Resume editor](${SITE_URL}/resume): the interactive resume builder

## Common questions

- Is ${SITE.name} free? Yes, with no account and no paywall.
- Does it upload my resume? No. Everything runs in the browser; only the optional AI assistant sends text, and only after explicit consent.
- What is an ATS score? A heuristic estimate of how easily applicant tracking software can parse a resume. ${SITE.name} computes it locally and deterministically.
- Are the templates ATS-safe? Yes: single reading order, semantic HTML, no tables or text-in-image.
- Can I export a PDF? Yes, via the browser's print pipeline, with selectable text.

## Source

- GitHub: ${SITE.github}
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
