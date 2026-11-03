import "server-only";

import { cookies, headers } from "next/headers";
import { cache } from "react";

import { browserLocale, isLocale, LOCALE_COOKIE } from "./config";
import { dictionaries } from "./dictionaries";

// The language lives in a cookie so URLs stay free of a locale prefix.
export const getI18n = cache(async () => {
  const value = (await cookies()).get(LOCALE_COOKIE)?.value;
  const locale = isLocale(value)
    ? value
    : browserLocale((await headers()).get("accept-language"));

  return { locale, t: dictionaries[locale] };
});
