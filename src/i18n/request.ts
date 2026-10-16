import { getRequestConfig } from "next-intl/server";

export const locales = ["en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "en";

export default getRequestConfig(async () => {
  const messages = (await import("../messages/en.json")).default;
  return {
    locale: defaultLocale,
    messages,
  };
});
