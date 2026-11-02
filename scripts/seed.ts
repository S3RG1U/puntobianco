import { eq } from "drizzle-orm";

import { auth } from "../lib/auth";
import { db } from "../lib/db";
import { users } from "../lib/db/schema";

const adminEmail = "admin@puntobianco.test";

// Creates the first admin, who adds everyone else from Staff accounts.
async function seed() {
  if (process.env.NODE_ENV === "production") {
    throw new Error("The demo admin must not be seeded in production.");
  }

  const password = process.env.SEED_PASSWORD;
  if (!password) {
    throw new Error("SEED_PASSWORD must be set. See .env.example.");
  }

  const existing = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.email, adminEmail));

  if (existing.length > 0) {
    console.log(`Skipped ${adminEmail}: already exists`);
    return;
  }

  await auth.api.createUser({
    body: { name: "Admin", email: adminEmail, password, role: "admin" },
  });
  console.log(`Created ${adminEmail}`);
}

seed()
  .then(() => process.exit(0))
  .catch((reason) => {
    console.error(reason);
    process.exit(1);
  });
