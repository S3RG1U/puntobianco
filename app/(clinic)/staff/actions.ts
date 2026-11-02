"use server";

import { APIError } from "better-auth/api";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { roleNames } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { validationMessage, type Dictionary } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";

export type StaffFormState = {
  status: "idle" | "success" | "error";
  message?: string;
  fieldErrors?: Partial<
    Record<"name" | "email" | "password" | "roles", string[]>
  >;
};

const rolesSchema = z
  .array(z.enum(roleNames))
  .min(1, "rolesRequired");

const createStaffSchema = z.object({
  name: z.string().trim().min(1, "nameRequired"),
  email: z.email("emailInvalid"),
  password: z
    .string()
    .min(8, "passwordTooShort")
    .max(128, "passwordTooLong"),
  roles: rolesSchema,
});

const updateRolesSchema = z.object({
  userId: z.string().min(1),
  roles: rolesSchema,
});

function translateFieldErrors(
  t: Dictionary,
  fieldErrors: Record<string, string[] | undefined>,
): StaffFormState["fieldErrors"] {
  return Object.fromEntries(
    Object.entries(fieldErrors).map(([field, messages]) => [
      field,
      messages?.map((message) => validationMessage(t, message)),
    ]),
  );
}

function getErrorState(reason: unknown, t: Dictionary): StaffFormState {
  if (reason instanceof APIError) {
    if (reason.body?.code === "USER_ALREADY_EXISTS_USE_ANOTHER_EMAIL") {
      return {
        status: "error",
        fieldErrors: { email: [t.staff.errors.emailExists] },
      };
    }

    if (reason.status === "FORBIDDEN") {
      return {
        status: "error",
        message: t.staff.errors.forbidden,
      };
    }
  }

  console.error("Staff account update failed", reason);
  return { status: "error", message: t.staff.errors.generic };
}

export async function createStaffMember(
  _previous: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  await requireSession();
  const { t } = await getI18n();

  const parsed = createStaffSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
    roles: formData.getAll("roles"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: translateFieldErrors(
        t,
        z.flattenError(parsed.error).fieldErrors,
      ),
    };
  }

  const { roles, ...details } = parsed.data;

  try {
    await auth.api.createUser({
      body: { ...details, role: roles },
      headers: await headers(),
    });
  } catch (reason) {
    return getErrorState(reason, t);
  }

  revalidatePath("/staff");
  return { status: "success" };
}

export async function updateStaffRoles(
  _previous: StaffFormState,
  formData: FormData,
): Promise<StaffFormState> {
  const { user } = await requireSession();
  const { t } = await getI18n();

  const parsed = updateRolesSchema.safeParse({
    userId: formData.get("userId"),
    roles: formData.getAll("roles"),
  });

  if (!parsed.success) {
    return {
      status: "error",
      fieldErrors: translateFieldErrors(
        t,
        z.flattenError(parsed.error).fieldErrors,
      ),
    };
  }

  const { userId, roles } = parsed.data;

  // Stops the last admin from locking everyone out of staff management.
  if (userId === user.id && !roles.includes("admin")) {
    return {
      status: "error",
      fieldErrors: { roles: [t.staff.errors.ownAdmin] },
    };
  }

  try {
    await auth.api.setRole({
      body: { userId, role: roles },
      headers: await headers(),
    });
  } catch (reason) {
    return getErrorState(reason, t);
  }

  revalidatePath("/staff");
  return { status: "success" };
}
