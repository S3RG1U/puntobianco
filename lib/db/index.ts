import "server-only";

import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import { getDatabaseUrl } from "./env";
import * as schema from "./schema";

function createPool() {
  const pool = new Pool({ connectionString: getDatabaseUrl() });

  // An idle client losing its connection emits this; unhandled, it would crash the process.
  pool.on("error", (reason) => {
    console.error("Idle Postgres client error", reason);
  });

  return pool;
}

// Reuse one pool across hot reloads so dev doesn't exhaust Postgres connections.
const globalForDb = globalThis as unknown as { pool?: Pool };

const pool = globalForDb.pool ?? createPool();

if (process.env.NODE_ENV !== "production") globalForDb.pool = pool;

export const db = drizzle(pool, { schema });
export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];
