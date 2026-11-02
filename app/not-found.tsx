import Link from "next/link";

import { Button } from "@/components/ui/button";
import { getI18n } from "@/lib/i18n/server";

export default async function NotFound() {
  const { t } = await getI18n();

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-2xl font-semibold">{t.common.notFoundTitle}</h1>
      <p className="text-sm text-muted-foreground">{t.common.notFoundBody}</p>
      <Button
        nativeButton={false}
        variant="outline"
        render={<Link href="/dashboard" />}
      >
        {t.common.notFoundLink}
      </Button>
    </main>
  );
}
