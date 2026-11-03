import "server-only";
import { AsyncLocalStorage } from "node:async_hooks";
import type { users } from "@/lib/db/schema";

// Only the authenticated API boundary may populate this request-local context.
export const apiActor = new AsyncLocalStorage<{ user: typeof users.$inferSelect; scopes?: readonly string[] | null }>();
