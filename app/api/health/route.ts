import { sql } from "drizzle-orm";
import { connection } from "next/server";

import { db } from "@/lib/db";

export async function GET() {
  // Defer to request time so the build doesn't prerender against the database.
  await connection();

  try {
    await db.execute(sql`select 1`);
    return Response.json({ status: "ok" });
  } catch (reason) {
    console.error("Database health check failed", reason);
    return Response.json({ status: "error" }, { status: 503 });
  }
}
