"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { can, parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { treatments, treatmentCategoryValues } from "@/lib/db/schema";
import { fieldErrors } from "@/lib/i18n/dictionaries";
import { getI18n } from "@/lib/i18n/server";
import type { FormState } from "@/lib/patients/form-schema";

const treatmentSchema = z.object({
  name: z.string().trim().min(1, "nameRequired").max(200, "nameTooLong"),
  category: z.enum(treatmentCategoryValues, "categoryRequired"),
  description: z.string().trim().max(2000, "descriptionTooLong"),
  durationMinutes: z.coerce
    .number("durationRange")
    .int("durationRange")
    .min(5, "durationRange")
    .max(600, "durationRange"),
});

export async function createTreatment(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  const { t } = await getI18n();
  if (!can(parseRoles(user.role), "treatment", "create"))
    return { status: "error", message: t.treatments.errors.permission };
  const parsed = treatmentSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      status: "error",
      message: t.treatments.errors.checkFields,
      errors: fieldErrors(t, parsed.error.issues),
    };
  try {
    const inserted = await db
      .insert(treatments)
      .values(parsed.data)
      .onConflictDoNothing({ target: treatments.name })
      .returning({ id: treatments.id });
    if (!inserted.length)
      return {
        status: "error",
        errors: { name: t.treatments.errors.duplicate },
      };
  } catch {
    return { status: "error", message: t.treatments.errors.saveFailed };
  }
  revalidatePath("/treatments");
  return { status: "success" };
}

export async function updateTreatment(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  const { t } = await getI18n();
  if (!can(parseRoles(user.role), "treatment", "update"))
    return { status: "error", message: t.treatments.errors.updatePermission };
  const parsed = treatmentSchema
    .extend({ id: z.uuid() })
    .safeParse(Object.fromEntries(form));
  if (!parsed.success)
    return {
      status: "error",
      message: t.treatments.errors.checkFields,
      errors: fieldErrors(t, parsed.error.issues),
    };
  const { id, ...values } = parsed.data;
  try {
    const [duplicate] = await db
      .select({ id: treatments.id })
      .from(treatments)
      .where(and(eq(treatments.name, values.name), ne(treatments.id, id)));
    if (duplicate)
      return {
        status: "error",
        errors: { name: t.treatments.errors.duplicate },
      };
    const updated = await db
      .update(treatments)
      .set(values)
      .where(eq(treatments.id, id))
      .returning({ id: treatments.id });
    if (!updated.length)
      return { status: "error", message: t.treatments.errors.gone };
  } catch {
    return { status: "error", message: t.treatments.errors.saveFailed };
  }
  revalidatePath("/treatments");
  return { status: "success" };
}
