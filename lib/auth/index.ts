import "server-only";

import { betterAuth } from "better-auth";
import { APIError, createAuthMiddleware, getSessionFromCtx } from "better-auth/api";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { nextCookies } from "better-auth/next-js";
import { admin, bearer } from "better-auth/plugins";

import { db } from "../db";
import * as schema from "../db/schema";
import { ac, roles } from "./permissions";

export const auth = betterAuth({
  trustedOrigins: [
    ...(process.env.NODE_ENV === "development" ? ["http://localhost:3000", "http://192.168.100.116:3000"] : []),
    ...(process.env.AUTH_TRUSTED_ORIGINS ?? "").split(",").filter(Boolean),
  ],
  database: drizzleAdapter(db, { provider: "pg", schema, usePlural: true }),
  emailAndPassword: {
    enabled: true,
    // Accounts are created by an administrator, not through public sign-up.
    disableSignUp: true,
  },
  hooks: {
    before: createAuthMiddleware(async (ctx) => {
      if (ctx.path !== "/admin/set-role" && ctx.path !== "/admin/update-user") return;

      const nextRole = ctx.path === "/admin/set-role"
        ? ctx.body?.role
        : ctx.body?.data?.role;
      if (nextRole === undefined) return;

      const nextRoles = Array.isArray(nextRole) ? nextRole : String(nextRole).split(",");
      if (nextRoles.includes("admin")) return;

      const session = await getSessionFromCtx(ctx);
      if (session && ctx.body?.userId === session.user.id) {
        throw new APIError("FORBIDDEN", {
          message: "You can't remove your own Admin role.",
        });
      }
    }),
  },
  plugins: [
    bearer({ requireSignature: true }),
    // The default only applies if a user somehow has no role, so keep it minimal.
    admin({ ac, roles, defaultRole: "driver" }),
    // Must stay last so cookies set during server calls reach the browser.
    nextCookies(),
  ],
});
