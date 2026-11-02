export const locales = ["ro", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "ro";
export const LOCALE_COOKIE = "locale";
export const localeNames: Record<Locale, string> = {
  ro: "Română",
  en: "English",
};

// Formatting tags for Intl and date libraries.
export const intlLocales: Record<Locale, string> = {
  ro: "ro-RO",
  en: "en-GB",
};

export function isLocale(value: unknown): value is Locale {
  return locales.includes(value as Locale);
}
