import "server-only";

import { asc, eq, or, isNull } from "drizzle-orm";

import { can, parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";

// For the responsible-coordinator selector in the registration form.
export async function listTreatmentCoordinators() {
  const { user } = await requireSession();
  if (!can(parseRoles(user.role), "patient", "create")) {
    throw new Error("You don't have permission to register patients.");
  }

  const staff = await db
    .select({ id: users.id, name: users.name, role: users.role })
    .from(users)
    .where(or(eq(users.banned, false), isNull(users.banned)))
    .orderBy(asc(users.name), asc(users.id));

  return staff
    .filter(({ role }) => parseRoles(role).includes("treatmentCoordinator"))
    .map(({ id, name }) => ({ id, name }));
}
