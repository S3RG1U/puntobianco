import "server-only";

import { cookies } from "next/headers";
import { cache } from "react";

import { defaultLocale, isLocale, LOCALE_COOKIE } from "./config";
import { dictionaries } from "./dictionaries";

// The language lives in a cookie so URLs stay free of a locale prefix.
export const getI18n = cache(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value) ? value : defaultLocale;

  return { locale, t: dictionaries[locale] };
});
