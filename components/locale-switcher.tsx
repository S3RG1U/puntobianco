"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";

import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { setLocale } from "@/lib/i18n/actions";
import { useI18n } from "@/lib/i18n/client";
import { localeNames, locales } from "@/lib/i18n/config";

export function LocaleSwitcher() {
  const { locale, t } = useI18n();
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  return (
    <ToggleGroup
      aria-label={t.common.language}
      variant="outline"
      size="sm"
      disabled={pending}
      value={[locale]}
      onValueChange={(value) => {
        if (!value[0]) return;
        startTransition(async () => {
          await setLocale(value[0]);
          router.refresh();
        });
      }}
    >
      {locales.map((option) => (
        <ToggleGroupItem key={option} value={option}>
          {localeNames[option]}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
