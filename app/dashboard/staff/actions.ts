"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { roleNames } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";

export type StaffFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<
    Record<"name" | "email" | "password" | "roles", string[]>
  >;
};

const rolesSchema = z
  .array(z.enum(roleNames))
  .min(1, "Choose at least one role.");

const createStaffSchema = z.object({
  name: z.string().trim().min(1, "Enter a name."),
  email: z.email("Enter a valid email address."),
  password: z
    .string()
    .min(8, "Use at least 8 characters.")
    .max(128, "Use at most 128 characters."),
  roles: rolesSchema,
});

const updateRolesSchema = z.object({
  userId: z.string().min(1),
  roles: rolesSchema,
});

function getErrorState(reason: unknown): StaffFormState {
  if (reason instanceof APIError) {
    if (reason.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return {
        status: "error",
        fieldErrors: { email: ["An account with this email already exists."] },
      };
    }

    if (reason.status === "FORBIDDEN") {
      return {
        status: "error",
        message: "You don't have permission to do this.",
      };
    }
  }

  console.error("Staff account update failed", reason);
  return { status: "error", message: "Something went wrong. Please try again." };
}

export async function createStaffMember(
  _previous: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  await requireSession();

  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roles: formData.getAll("roles"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { roles, ...details } = parsed.data;

  try {
    await auth.api.createUser({
      body: { ...details, role: roles },
      headers: await headers(),
    });
  } catch (reason) {
    return getErrorState(reason);
  }

  revalidatePath("/dashboard/staff");
  return { status: "success" };
}

export async function updateStaffRoles(
  _previous: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const { user } = await requireSession();

  const parsed = updateRolesSchema.safeParse({
    userId: formData.get("userId"),
    roles: formData.getAll("roles"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: z.flattenError(parsed.error).fieldErrors,
    };
  }

  const { userId, roles } = parsed.data;

  // Stops the last admin from locking everyone out of staff management.
  if (userId === user.id && !roles.includes("admin")) {
    return {
      status: "error",
      fieldErrors: { roles: ["You can't remove your own Admin role."] },
    };
  }

  try {
    await auth.api.setRole({
      body: { userId, role: roles },
      headers: await headers(),
    });
  } catch (reason) {
    return getErrorState(reason);
  }

  revalidatePath("/dashboard/staff");
  return { status: "success" };
}
