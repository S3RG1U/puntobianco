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

// Respect browser preference order and regional tags, falling back to Romanian.
export function browserLocale(acceptLanguage: string | null): Locale {
  const preferences = (acceptLanguage ?? "")
    .split(",")
    .map((part) => {
      const [tag, ...parameters] = part.trim().split(";");
      const quality = parameters.find((p) => p.trim().startsWith("q="));
      return {
        language: tag.toLowerCase().split("-")[0],
        quality: quality ? Number(quality.trim().slice(2)) : 1,
      };
    })
    .filter((item) => item.quality > 0)
    .sort((a, b) => b.quality - a.quality);
  return (
    (preferences.find((item) => isLocale(item.language))?.language as Locale) ??
    defaultLocale
  );
}
