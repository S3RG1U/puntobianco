import { can, parseRoles, type Resource } from "@/lib/auth/permissions";
import { ApiError } from "./http";
import type { Principal } from "./security";

type ActorPermissions = Pick<Principal, "user" | "scopes">;

export function hasPermission(actor: ActorPermissions, scope: string): boolean {
  const [resource, action] = scope.split(":");
  return (!actor.scopes || actor.scopes.includes(scope)) &&
    can(parseRoles(actor.user.role), resource as Resource, action);
}

export function authorize(actor: ActorPermissions, scope: string) {
  if (!hasPermission(actor, scope)) {
    throw new ApiError(403, "forbidden", "This credential cannot perform that operation.");
  }
}
