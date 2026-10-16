import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages } from "next-intl/server";
import { ColorSchemeScript, MantineProvider, createTheme, mantineHtmlProps } from "@mantine/core";
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
  title: "LocalCV — ATS-friendly resume builder",
  description:
    "Build ATS-friendly resumes in your browser. Local-first, no account required, with deterministic ATS scoring and print-perfect PDF export.",
  robots: { index: true, follow: true },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const messages = await getMessages();

  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`} {...mantineHtmlProps}>
      <head>
        <ColorSchemeScript />
      </head>
      <body className="min-h-full">
        <MantineProvider theme={theme}>
          <NextIntlClientProvider messages={messages}>
            {children}
          </NextIntlClientProvider>
        </MantineProvider>
      </body>
    </html>
  );
}
