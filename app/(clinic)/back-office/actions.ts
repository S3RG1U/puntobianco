"use server";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { patientVisits, patients } from "@/lib/db/schema";
import { can, parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { publishTeamEvent } from "@/lib/notifications/events";
import { getI18n } from "@/lib/i18n/server";

// Failures that are safe to show as they are.
class CaseError extends Error {}

export async function updateCase(id: string, action: "start" | "complete") {
  const { user } = await requireSession();
  const { t } = await getI18n();
  const errors = t.backOffice.errors;
  const roles = parseRoles(user.role);
  if (!can(roles, "backOfficeCase", "update"))
    return { error: errors.permission };
  if (
    !z.uuid().safeParse(id).success ||
    !["start", "complete"].includes(action)
  )
    return { error: errors.invalid };
  try {
    await db.transaction(async (tx) => {
      const [visit] = await tx
        .select()
        .from(patientVisits)
        .where(eq(patientVisits.id, id))
        .for("update");
      if (!visit) throw new CaseError(errors.gone);
      if (action === "start" && visit.backOfficeStatus !== "pending")
        throw new CaseError(errors.taken);
      if (
        action === "complete" &&
        (visit.backOfficeStatus !== "in_progress" ||
          (visit.backOfficeAssigneeId !== user.id && !roles.includes("admin")))
      )
        throw new CaseError(errors.notOwner);
      await tx
        .update(patientVisits)
        .set(
          action === "start"
            ? {
                backOfficeStatus: "in_progress",
                backOfficeAssigneeId: user.id,
                backOfficeStartedAt: new Date(),
              }
            : {
                backOfficeStatus: "completed",
                backOfficeCompletedAt: new Date(),
              },
        )
        .where(eq(patientVisits.id, id));
      const [patient] = await tx
        .select()
        .from(patients)
        .where(eq(patients.id, visit.patientId));
      await publishTeamEvent(tx, {
        audience: "backOfficeCase",
        title: action === "start" ? "Caz început" : "Caz finalizat",
        message: `${patient.firstName} ${patient.lastName} · ${user.name}`,
        href: "/back-office",
        visitId: id,
      });
    });
  } catch (error) {
    return {
      error: error instanceof CaseError ? error.message : errors.failed,
    };
  }
  revalidatePath("/back-office");
  return { ok: true };
}
