import "server-only";

import { can, type Resource, type RoleName } from "./permissions";
import { apiActor } from "./request-context";

// Website actions use roles. API actions additionally honor the credential's scopes.
export function canCurrentActor(roles: RoleName[], resource: Resource, action: string) {
  const scopes = apiActor.getStore()?.scopes;
  return (!scopes || scopes.includes(`${resource}:${action}`)) && can(roles, resource, action);
}
