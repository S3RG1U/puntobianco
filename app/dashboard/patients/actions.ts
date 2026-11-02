"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { can, parseRoles } from "@/lib/auth/permissions";
import { requireSession } from "@/lib/auth/session";
import { db } from "@/lib/db";
import {
  patients,
  patientVisits,
  patientCompanions,
  patientAccommodations,
  patientTransfers,
  users,
} from "@/lib/db/schema";
import {
  readVisit,
  registrationSchema,
  type FormState,
  type VisitInput,
} from "@/lib/patients/form-schema";

export async function createPatientRegistration(
  _previous: FormState,
  form: FormData,
): Promise<FormState> {
  const { user } = await requireSession();
  if (!can(parseRoles(user.role), "patient", "create"))
    return {
      status: "error",
      message: "You don't have permission to register patients.",
    };
  const companionName = {
    firstName: String(form.get("companion.firstName") ?? ""),
    lastName: String(form.get("companion.lastName") ?? ""),
  };
  const parsed = registrationSchema.safeParse({
    patient: readVisit(form, "patient"),
    companion:
      form.get("hasCompanion") === "on"
        ? {
            ...companionName,
            visit:
              form.get("companionTreatment") === "on"
                ? { ...readVisit(form, "companion.visit"), ...companionName }
                : undefined,
          }
        : undefined,
  });
  if (!parsed.success)
    return {
      status: "error",
      message: "Please check the highlighted fields.",
      errors: Object.fromEntries(
        parsed.error.issues.map((issue) => [
          issue.path.join("."),
          issue.message,
        ]),
      ),
    };

  try {
    const id = await db.transaction(async (tx) => {
      async function createVisit(data: VisitInput, patientId: string) {
        const [coordinator] = await tx
          .select()
          .from(users)
          .where(eq(users.id, data.coordinatorId))
          .for("share");
        if (
          !coordinator ||
          coordinator.banned ||
          !parseRoles(coordinator.role).includes("treatmentCoordinator")
        )
          throw new Error("COORDINATOR_UNAVAILABLE");
        const localTimestamp = (date: string, time: string) =>
          sql`(${`${date} ${time}`}::timestamp AT TIME ZONE 'Europe/Chisinau')`;
        const [visit] = await tx
          .insert(patientVisits)
          .values({
            patientId,
            coordinatorId: data.coordinatorId,
            arrivalAt: localTimestamp(data.arrivalDate, data.arrivalTime),
            departureAt: localTimestamp(data.departureDate, data.departureTime),
            availabilityNotes: data.availabilityNotes,
            treatment: data.treatment,
          })
          .returning({ id: patientVisits.id });
        if (data.accommodation)
          await tx
            .insert(patientAccommodations)
            .values({ visitId: visit.id, ...data.accommodation });
        if (data.transfer)
          await tx
            .insert(patientTransfers)
            .values({ visitId: visit.id, ...data.transfer });
        return visit.id;
      }
      const data = parsed.data;
      const [patient] = await tx
        .insert(patients)
        .values({
          firstName: data.patient.firstName,
          lastName: data.patient.lastName,
        })
        .returning({ id: patients.id });
      const visitId = await createVisit(data.patient, patient.id);
      if (data.companion) {
        const [companion] = await tx
          .insert(patients)
          .values({
            firstName: data.companion.firstName,
            lastName: data.companion.lastName,
          })
          .returning({ id: patients.id });
        const treatmentVisitId = data.companion.visit
          ? await createVisit(data.companion.visit, companion.id)
          : null;
        await tx
          .insert(patientCompanions)
          .values({ visitId, patientId: companion.id, treatmentVisitId });
      }
      return visitId;
    });
    revalidatePath("/dashboard/patients");
    revalidatePath("/dashboard/accommodations");
    return { status: "success", id };
  } catch (error) {
    return {
      status: "error",
      message:
        error instanceof Error && error.message === "COORDINATOR_UNAVAILABLE"
          ? "The selected coordinator is no longer available. Choose an active treatment coordinator."
          : "Registration could not be saved. Please try again. No partial registration was saved.",
    };
  }
}
