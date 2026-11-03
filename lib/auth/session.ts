import "server-only";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

import { auth } from ".";
import { apiActor } from "./request-context";

export const getSession = cache(async () =>
  auth.api.getSession({ headers: await headers() }),
);

export async function requireSession() {
  const actor = apiActor.getStore();
  if (actor) return actor;
  const session = await getSession();
  if (!session) redirect("/login");

  return session;
}
