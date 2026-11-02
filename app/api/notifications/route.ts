import { and, desc, eq, inArray, isNull, sql } from "drizzle-orm";
import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { parseRoles } from "@/lib/auth/permissions";
import { db } from "@/lib/db";
import { teamNotifications, notificationReads } from "@/lib/db/schema";
import { readableAudiences } from "@/lib/notifications/events";
export async function GET() {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const audiences = readableAudiences(parseRoles(session.user.role));
  const [events, counts, revision] = await Promise.all([
    db
      .select({
        id: teamNotifications.id,
        title: teamNotifications.title,
        message: teamNotifications.message,
        href: teamNotifications.href,
        createdAt: teamNotifications.createdAt,
        readId: notificationReads.id,
      })
      .from(teamNotifications)
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, teamNotifications.id),
          eq(notificationReads.userId, session.user.id),
        ),
      )
      .where(inArray(teamNotifications.audience, [...audiences]))
      .orderBy(desc(teamNotifications.createdAt), desc(teamNotifications.id))
      .limit(40),
    db
      .select({ value: sql<number>`count(*)::int` })
      .from(teamNotifications)
      .leftJoin(
        notificationReads,
        and(
          eq(notificationReads.notificationId, teamNotifications.id),
          eq(notificationReads.userId, session.user.id),
        ),
      )
      .where(
        and(
          inArray(teamNotifications.audience, [...audiences]),
          isNull(notificationReads.id),
        ),
      ),
    // Only a change token is shared globally, never another team's message.
    db
      .select({
        value: sql<string>`coalesce(max(${teamNotifications.createdAt})::text, '')`,
      })
      .from(teamNotifications),
  ]);
  return Response.json(
    {
      events: events.map(({ readId, ...event }) => ({
        ...event,
        read: !!readId,
      })),
      unread: counts[0].value,
      revision: revision[0].value,
    },
    { headers: { "Cache-Control": "private, no-store" } },
  );
}
export async function POST(request: Request) {
  // request.url holds the server's own host, not the public one, under next start.
  const origin = request.headers.get("origin");
  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  if (!origin || !URL.canParse(origin) || new URL(origin).host !== host)
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = z
    .object({ id: z.uuid().optional(), all: z.boolean().optional() })
    .safeParse(await request.json().catch(() => null));
  if (!body.success || (!body.data.id && !body.data.all))
    return Response.json({ error: "Invalid request" }, { status: 400 });
  const visible = await db
    .select({ id: teamNotifications.id })
    .from(teamNotifications)
    .where(
      and(
        inArray(teamNotifications.audience, [
          ...readableAudiences(parseRoles(session.user.role)),
        ]),
        body.data.all ? undefined : eq(teamNotifications.id, body.data.id!),
      ),
    );
  // Batch to avoid a huge parameter list after a long absence.
  for (let i = 0; i < visible.length; i += 500)
    await db
      .insert(notificationReads)
      .values(
        visible
          .slice(i, i + 500)
          .map((event) => ({
            notificationId: event.id,
            userId: session.user.id,
          })),
      )
      .onConflictDoNothing();
  return Response.json({ ok: true });
}
