import { loadEnvConfig } from "@next/env";
import { defineConfig } from "drizzle-kit";

import { getDatabaseUrl } from "./lib/db/env";

loadEnvConfig(process.cwd());

export default defineConfig({
  dialect: "postgresql",
  schema: "./lib/db/schema.ts",
  out: "./drizzle",
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
