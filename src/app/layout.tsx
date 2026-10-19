import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { MantineProvider, createTheme, mantineHtmlProps } from "@mantine/core";
import { WebAnalytics } from "@/components/analytics/WebAnalytics";
import { SITE } from "@/lib/seo/site";
import { buildSiteSchema } from "@/lib/seo/schema";
import { JsonLd } from "@/lib/seo/JsonLd";
import "./globals.css";
import "@mantine/core/styles.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const theme = createTheme({
  primaryColor: "brand",
  colors: {
    // Soothing slate-teal: calm, professional, low saturation
    brand: [
      "#f0f7f7",
      "#dcecec",
      "#b9d9d9",
      "#8fc2c4",
      "#65a8ac",
      "#478f94",
      "#357a80",
      "#2b6469",
      "#235154",
      "#1d4043",
    ],
    gray: [
      "#f8fafb",
      "#f1f4f5",
      "#e5eaec",
      "#d5dcdf",
      "#bfc9cd",
      "#a7b4ba",
      "#8b9aa1",
      "#6f7f87",
      "#5a686f",
      "#48535a",
    ],
  },
  fontFamily: "var(--font-inter), system-ui, sans-serif",
  defaultRadius: "md",
  headings: {
    fontFamily: "var(--font-inter), system-ui, sans-serif",
  },
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE.url),
  title: {
    default: SITE.title,
    template: `%s · ${SITE.name}`,
  },
  description: SITE.description,
  applicationName: SITE.name,
  keywords: [...SITE.keywords],
  authors: [{ name: SITE.author, url: SITE.github }],
  creator: SITE.author,
  publisher: SITE.author,
  category: "productivity",
  alternates: {
    canonical: "/",
    languages: { "en-US": "/" },
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
      "max-video-preview": -1,
    },
  },
  openGraph: {
    type: "website",
    siteName: SITE.name,
    locale: SITE.locale,
    url: SITE.url,
    title: SITE.title,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE.title,
    description: SITE.description,
  },
  appleWebApp: {
    capable: true,
    title: SITE.name,
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false, address: false, email: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f8fafb" },
    { media: "(prefers-color-scheme: dark)", color: "#1d4043" },
  ],
  colorScheme: "light",
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const messages = await getMessages();

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} {...mantineHtmlProps}>
      <head>
        <JsonLd data={buildSiteSchema()} />
      </head>
      <body className="min-h-full">
        <MantineProvider theme={theme}>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </MantineProvider>
        <WebAnalytics />
      </body>
    </html>
  );
}
