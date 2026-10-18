import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";
import { SITE_URL } from "@/lib/seo/site";
import { buildBreadcrumbSchema, buildFaqSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/lib/seo/JsonLd";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { url: SITE_URL },
};

export default function Home() {
  return (
    <>
      <JsonLd data={buildFaqSchema()} />
      <JsonLd data={buildBreadcrumbSchema()} />
      <LandingPage />
    </>
  );
}
