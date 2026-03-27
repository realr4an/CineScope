import { cookies } from "next/headers";

import { getDictionary } from "@/lib/i18n/dictionaries";
import { LANGUAGE_COOKIE, type Locale } from "@/lib/i18n/types";

export async function getPreferredLocale(): Promise<Locale> {
  const cookieStore = await cookies();
  const locale = cookieStore.get(LANGUAGE_COOKIE)?.value;

  return locale === "en" ? "en" : "de";
}

export async function getServerDictionary() {
  const locale = await getPreferredLocale();

  return {
    locale,
    dictionary: getDictionary(locale)
  };
}
