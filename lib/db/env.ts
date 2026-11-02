import { z } from "zod";

export function getDatabaseUrl() {
  const result = z.url().safeParse(process.env.DATABASE_URL);

  // Without this check, pg silently falls back to its own connection defaults.
  if (!result.success) {
    throw new Error(
      "DATABASE_URL must be a valid URL. Copy .env.example to .env to set it.",
    );
  }

  return result.data;
}
