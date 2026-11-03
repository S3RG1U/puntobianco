import "server-only";
import { and, eq, isNull, lt, lte, or } from "drizzle-orm";
import { db } from "@/lib/db";
import { teamNotifications, telegramDeliveries } from "@/lib/db/schema";
import { telegramMessage } from "./format";
export async function deliverTelegramBatch() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const defaultChat = process.env.TELEGRAM_CHAT_ID;
  if (process.env.TELEGRAM_ENABLED !== "true" || !token || !defaultChat)
    return { configured: false, delivered: 0 };
  const jobs = await db.transaction(async (tx) => {
    const rows = await tx
      .select({ job: telegramDeliveries, event: teamNotifications })
      .from(telegramDeliveries)
      .innerJoin(
        teamNotifications,
        eq(teamNotifications.id, telegramDeliveries.notificationId),
      )
      .where(
        and(
          isNull(telegramDeliveries.deliveredAt),
          lte(telegramDeliveries.availableAt, new Date()),
          lt(telegramDeliveries.attempts, 8),
          or(
            isNull(telegramDeliveries.lockedUntil),
            lt(telegramDeliveries.lockedUntil, new Date()),
          ),
        ),
      )
      .for("update", { skipLocked: true, of: telegramDeliveries })
      .limit(10);
    for (const row of rows)
      await tx
        .update(telegramDeliveries)
        .set({
          lockedUntil: new Date(Date.now() + 300000),
          attempts: row.job.attempts + 1,
        })
        .where(eq(telegramDeliveries.id, row.job.id));
    return rows;
  });
  let delivered = 0;
  for (const { job, event } of jobs) {
    try {
      const origin = process.env.APP_URL;
      const link = origin ? new URL(event.href, origin).toString() : "";
      const response = await fetch(
        `https://api.telegram.org/bot${token}/sendMessage`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: defaultChat,
            text: telegramMessage(event, link),
            parse_mode: "HTML",
            link_preview_options: { is_disabled: true },
          }),
          signal: AbortSignal.timeout(15000),
        },
      );
      const body = await response.json().catch(() => null);
      if (!response.ok || !body?.ok) {
        const wait =
          typeof body?.parameters?.retry_after === "number"
            ? body.parameters.retry_after
            : Math.min(3600, 30 * 2 ** job.attempts);
        await db
          .update(telegramDeliveries)
          .set({
            lockedUntil: null,
            availableAt: new Date(Date.now() + wait * 1000),
            lastError: `Telegram HTTP ${response.status}`,
          })
          .where(eq(telegramDeliveries.id, job.id));
        continue;
      }
      await db
        .update(telegramDeliveries)
        .set({ deliveredAt: new Date(), lockedUntil: null, lastError: null })
        .where(eq(telegramDeliveries.id, job.id));
      delivered++;
    } catch {
      await db
        .update(telegramDeliveries)
        .set({
          lockedUntil: null,
          availableAt: new Date(
            Date.now() + Math.min(3600, 30 * 2 ** job.attempts) * 1000,
          ),
          lastError: "Telegram delivery unavailable",
        })
        .where(eq(telegramDeliveries.id, job.id));
    }
  }
  return { configured: true, delivered };
}
