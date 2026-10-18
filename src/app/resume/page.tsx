import type { Metadata } from "next";
import { Editor } from "@/components/editor/Editor";
import { SITE_URL } from "@/lib/seo/site";

export const metadata: Metadata = {
  title: "Resume Editor",
  description:
    "Edit your resume with live preview, real-time ATS scoring, and 12 parser-safe templates. Everything is saved locally in your browser — no account required.",
  alternates: { canonical: "/resume" },
  robots: {
    // Tool UI, not indexable content; keep the landing page as the entry point.
    index: false,
    follow: true,
  },
  openGraph: {
    url: `${SITE_URL}/resume`,
    title: "Resume Editor · LocalCV",
    description:
      "Edit your resume with live preview, real-time ATS scoring, and 12 parser-safe templates.",
  },
};

export default function Home() {
  return <Editor />;
}
