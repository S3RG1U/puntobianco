"use client";

import { createContext, useContext, useEffect, type ReactNode } from "react";

import { defaultLocale, type Locale } from "./config";
import { dictionaries } from "./dictionaries";

const I18nContext = createContext<Locale>(defaultLocale);

export function I18nProvider({
  locale,
  children,
}: {
  locale: Locale;
  children: ReactNode;
}) {
  // <html> sits outside the request-bound part of the root layout.
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);

  return <I18nContext.Provider value={locale}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const locale = useContext(I18nContext);

  return { locale, t: dictionaries[locale] };
}
