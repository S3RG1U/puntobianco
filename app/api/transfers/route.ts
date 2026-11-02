import { z } from "zod";
import { getSession } from "@/lib/auth/session";
import { can, parseRoles } from "@/lib/auth/permissions";
import { listTransferEvents } from "@/lib/transfers/queries";
export async function GET(request: Request) {
  const session = await getSession();
  if (!session)
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  if (!can(parseRoles(session.user.role), "transfer", "read"))
    return Response.json({ error: "Forbidden" }, { status: 403 });
  const query = z
    .object({
      start: z.iso.datetime({ offset: true }),
      end: z.iso.datetime({ offset: true }),
    })
    .safeParse(Object.fromEntries(new URL(request.url).searchParams));
  if (!query.success)
    return Response.json({ error: "Invalid dates" }, { status: 400 });
  const start = new Date(query.data.start),
    end = new Date(query.data.end);
  if (end <= start || end.getTime() - start.getTime() > 93 * 86400000)
    return Response.json(
      { error: "Select a range of up to 93 days" },
      { status: 400 },
    );
  return Response.json(await listTransferEvents(start, end), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
