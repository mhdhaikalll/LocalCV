import { FAQS, PRODUCT_FACTS, SITE, SITE_URL } from "./site";

const orgId = `${SITE_URL}/#organization`;
const siteId = `${SITE_URL}/#website`;
const appId = `${SITE_URL}/#software`;

/** Organization + WebSite graph, used site-wide in the root layout. */
export function buildSiteSchema() {
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": orgId,
        name: SITE.name,
        url: SITE_URL,
        logo: `${SITE_URL}/icon.svg`,
        sameAs: [SITE.github],
      },
      {
        "@type": "WebSite",
        "@id": siteId,
        url: SITE_URL,
        name: SITE.name,
        description: SITE.description,
        inLanguage: SITE.language,
        publisher: { "@id": orgId },
      },
      {
        "@type": "WebApplication",
        "@id": appId,
        name: SITE.name,
        url: SITE_URL,
        description: SITE.description,
        applicationCategory: PRODUCT_FACTS.applicationCategory,
        operatingSystem: PRODUCT_FACTS.operatingSystem,
        browserRequirements: "Requires JavaScript",
        inLanguage: SITE.language,
        isAccessibleForFree: true,
        offers: {
          "@type": "Offer",
          price: PRODUCT_FACTS.price,
          priceCurrency: PRODUCT_FACTS.priceCurrency,
        },
        featureList: [
          "ATS-friendly resume builder",
          "Deterministic ATS score from 40+ checks",
          "12 parser-safe resume templates",
          "Print-perfect PDF export",
          "Local-first storage with no account",
          "PDF and DOCX import parsed in the browser",
          "Optional AI writing assistant with explicit consent",
        ],
        publisher: { "@id": orgId },
      },
    ],
  };
}

/** FAQPage graph for rich results and AI answer extraction. */
export function buildFaqSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: FAQS.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

/** Breadcrumb trail for the landing page. */
export function buildBreadcrumbSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      {
        "@type": "ListItem",
        position: 1,
        name: "Home",
        item: SITE_URL,
      },
      {
        "@type": "ListItem",
        position: 2,
        name: "Resume editor",
        item: `${SITE_URL}/resume`,
      },
    ],
  };
}
