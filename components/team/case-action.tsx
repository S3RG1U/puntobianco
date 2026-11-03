"use client";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { updateCase } from "@/app/(clinic)/back-office/actions";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { useI18n } from "@/lib/i18n/client";
export function CaseAction({
  menuItem = false,
  id,
  action,
}: {
  menuItem?: boolean;
  id: string;
  action: "start" | "complete";
}) {
  const { t } = useI18n();
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <Button
      variant={menuItem ? "ghost" : action === "start" ? "outline" : "default"}
      className={menuItem ? "w-full justify-start" : undefined}
      size="sm"
      disabled={pending}
      onClick={() =>
        start(async () => {
          try {
            const result = await updateCase(id, action);
            if (result.error) toast.error(result.error);
            else {
              toast.success(
                action === "start"
                  ? t.backOffice.started
                  : t.backOffice.finished,
              );
              router.refresh();
            }
          } catch {
            toast.error(t.backOffice.connectionLost);
          }
        })
      }
    >
      {pending && <Spinner data-icon="inline-start" />}
      {action === "start" ? t.backOffice.start : t.backOffice.complete}
    </Button>
  );
}
