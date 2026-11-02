import { createAccessControl } from "better-auth/plugins/access";
import { adminAc, defaultStatements } from "better-auth/plugins/admin/access";

// Every resource and action the app knows about. `user` and `session` come from
// the Better Auth admin plugin. Safe to import from client and server code.
export const statements = {
  ...defaultStatements,
  backOfficeCase: ["read", "update"],
  patient: ["create", "read", "update", "delete"],
  treatment: ["create", "read", "update", "delete"],
  accommodation: ["create", "read", "update", "delete"],
  transfer: ["create", "read", "update", "delete"],
} as const;

export type Resource = keyof typeof statements;

export const ac = createAccessControl(statements);

export const roles = {
  admin: ac.newRole({
    ...adminAc.statements,
    backOfficeCase: ["read", "update"],
    patient: ["create", "read", "update", "delete"],
    treatment: ["create", "read", "update", "delete"],
    accommodation: ["create", "read", "update", "delete"],
    transfer: ["create", "read", "update", "delete"],
  }),
  treatmentCoordinator: ac.newRole({
    patient: ["create", "read", "update"],
    treatment: ["create", "read", "update"],
    accommodation: ["read"],
    transfer: ["read"],
  }),
  backOffice: ac.newRole({
    backOfficeCase: ["read", "update"],
    patient: ["create", "read", "update"],
    treatment: ["read"],
    accommodation: ["read"],
    transfer: ["create", "read", "update"],
  }),
  accommodationManager: ac.newRole({
    patient: ["read"],
    accommodation: ["create", "read", "update", "delete"],
  }),
  driver: ac.newRole({
    transfer: ["read", "update"],
  }),
  // Accountant and quality control can only view data, never change it.
  accountant: ac.newRole({
    patient: ["read"],
    treatment: ["read"],
  }),
  qualityControl: ac.newRole({
    backOfficeCase: ["read"],
    patient: ["read"],
    treatment: ["read"],
    accommodation: ["read"],
    transfer: ["read"],
  }),
};

export type RoleName = keyof typeof roles;

export const roleNames = Object.keys(roles) as [RoleName, ...RoleName[]];

function isRoleName(role: string): role is RoleName {
  return Object.hasOwn(roles, role);
}

// Better Auth stores multiple roles on a user as a comma-separated string.
export function parseRoles(role: string | null | undefined): RoleName[] {
  return (role ?? "")
    .split(",")
    .map((name) => name.trim())
    .filter(isRoleName);
}

// True when any of the roles grants the action. Better Auth enforces the same
// rules on its own endpoints; this decides what the app shows and returns.
export function can(
  userRoles: RoleName[],
  resource: Resource,
  action: string,
): boolean {
  return userRoles.some((roleName) => {
    const grants: Partial<Record<Resource, readonly string[]>> =
      roles[roleName].statements;

    return grants[resource]?.includes(action) ?? false;
  });
}
