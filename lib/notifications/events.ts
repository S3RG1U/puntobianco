import "server-only";
import type { Transaction } from "@/lib/db";
import { teamNotifications, telegramDeliveries } from "@/lib/db/schema";
import { can, type RoleName } from "@/lib/auth/permissions";
export const notificationAudiences = [
  "patient",
  "backOfficeCase",
  "accommodation",
  "transfer",
] as const;
export function readableAudiences(roles: RoleName[]) {
  return notificationAudiences.filter((resource) =>
    can(roles, resource, "read"),
  );
}
export async function publishTeamEvent(
  tx: Transaction,
  event: {
    audience: (typeof notificationAudiences)[number];
    title: string;
    message: string;
    href: string;
    visitId?: string;
  },
  telegram = false,
) {
  const [notification] = await tx
    .insert(teamNotifications)
    .values(event)
    .returning({ id: teamNotifications.id });
  if (telegram && process.env.TELEGRAM_ENABLED === "true")
    await tx
      .insert(telegramDeliveries)
      .values({ notificationId: notification.id });
}
