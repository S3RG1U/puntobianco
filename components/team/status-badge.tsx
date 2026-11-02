"use client";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/lib/i18n/client";
export function StatusBadge({
  status,
}: {
  status: "pending" | "in_progress" | "completed" | "unprocessed" | "reserved";
}) {
  const variants = {
    pending: "warning",
    unprocessed: "warning",
    in_progress: "info",
    completed: "success",
    reserved: "success",
  } as const;
  const { t } = useI18n();
  return <Badge variant={variants[status]}>{t.status[status]}</Badge>;
}
